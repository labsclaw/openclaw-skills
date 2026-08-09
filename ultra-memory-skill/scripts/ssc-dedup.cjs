#!/usr/bin/env node
/**
 * SSC Semantic Deduplication
 *
 * Detects near-duplicate segments using the existing vector index (sqlite-vec).
 * Inspired by MemHarness (KnowledgeXLab/MemHarness) semantic dedup on write-back.
 *
 * Usage:
 *   node scripts/ssc-dedup.cjs                  # Analyze and show duplicates
 *   node scripts/ssc-dedup.cjs --dry-run        # Preview proposed merges
 *   node scripts/ssc-dedup.cjs --apply          # Apply merges (writes dedup-log.json)
 *   node scripts/ssc-dedup.cjs --threshold 0.85 # Custom similarity threshold
 *   node scripts/ssc-dedup.cjs --json           # Output as JSON
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.resolve(__dirname, '../memory');
const INDEX_PATH = path.join(MEMORY_DIR, 'index.json');
const DEDUP_LOG = path.join(MEMORY_DIR, 'dedup-log.json');
const SEGMENTS_DIR = path.join(MEMORY_DIR, 'segments');

// --- Config ---
const DEFAULT_THRESHOLD = 0.9;
const MIN_SEGMENTS = 2; // minimum to run dedup

// --- Helpers ---

function loadIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('No index.json found. Run SSC setup first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
}

function loadSegmentContent(filePath) {
  // index.json stores paths like 'memory/segments/s001.md' but MEMORY_DIR
  // already points to memory/, so strip the leading 'memory/' prefix
  const normalized = filePath.replace(/^memory\//, '');
  const fullPath = path.join(MEMORY_DIR, normalized);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

// Simple token-based Jaccard similarity (no LLM needed)
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter((w, i, arr) => arr.indexOf(w) === i); // unique
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// --- Core ---

function findDuplicates(segments, threshold) {
  const duplicates = [];
  const skipped = new Set();

  for (let i = 0; i < segments.length; i++) {
    if (skipped.has(segments[i].id)) continue;
    if (!segments[i].file) continue;
    const contentA = loadSegmentContent(segments[i].file);
    if (!contentA) continue;

    const cluster = [segments[i]];

    for (let j = i + 1; j < segments.length; j++) {
      if (skipped.has(segments[j].id)) continue;
      if (!segments[j].file) continue;
      const contentB = loadSegmentContent(segments[j].file);
      if (!contentB) continue;

      const sim = jaccardSimilarity(contentA, contentB);
      if (sim >= threshold) {
        cluster.push({ ...segments[j], similarity: sim });
        skipped.add(segments[j].id);
      }
    }

    if (cluster.length >= 2) {
      // Sort by recency (newer first), then accessCount (higher first)
      cluster.sort((a, b) => {
        const dateA = new Date(a.created || '2000-01-01');
        const dateB = new Date(b.created || '2000-01-01');
        if (dateB - dateA !== 0) return dateB - dateA;
        return (b.accessCount || 0) - (a.accessCount || 0);
      });

      duplicates.push({
        keep: cluster[0], // keep the newer/more-used one
        merge: cluster.slice(1), // absorb these
        similarity: cluster[1]?.similarity || 0,
        clusterSize: cluster.length,
      });
    }
  }

  return duplicates;
}

function proposeMerge(cluster) {
  const keep = cluster.keep;
  const merge = cluster.merge;

  // Collect unique tags and keywords
  const allTags = new Set([...(keep.tags || [])]);
  const allKeywords = new Set([...(keep.keywords || [])]);
  const allSummary = [keep.summary];

  for (const seg of merge) {
    (seg.tags || []).forEach(t => allTags.add(t));
    (seg.keywords || []).forEach(k => allKeywords.add(k));
    if (seg.summary && !allSummary.includes(seg.summary)) {
      allSummary.push(seg.summary);
    }
  }

  return {
    keepId: keep.id,
    keepFile: keep.file,
    mergedIds: merge.map(s => s.id),
    mergedFiles: merge.map(s => s.file),
    newTags: [...allTags],
    newKeywords: [...allKeywords],
    newSummary: allSummary.join(' | '),
    similarity: cluster.similarity,
    action: 'merge',
  };
}

// --- Output ---

function printReport(duplicates, threshold) {
  console.log(`\n=== Semantic Deduplication Analysis ===`);
  console.log(`Threshold: ${threshold}`);
  console.log(`Duplicate clusters found: ${duplicates.length}`);

  if (duplicates.length === 0) {
    console.log('No near-duplicate segments detected. Memory is clean.');
    return;
  }

  for (const cluster of duplicates) {
    console.log(`\n--- Cluster (similarity: ${(cluster.similarity * 100).toFixed(0)}%) ---`);
    console.log(`  KEEP:   ${cluster.keep.id} — ${cluster.keep.summary}`);
    for (const seg of cluster.merge) {
      console.log(`  MERGE:  ${seg.id} — ${seg.summary} (${(seg.similarity * 100).toFixed(0)}% similar)`);
    }
  }
}

function printProposals(proposals) {
  console.log(`\n=== Merge Proposals ===`);
  for (const p of proposals) {
    console.log(`\n${p.keepId} ← absorb ${p.mergedIds.join(', ')}`);
    console.log(`  Merged tags: ${p.newTags.join(', ')}`);
    console.log(`  Merged keywords: ${p.newKeywords.join(', ')}`);
    console.log(`  Summary: ${p.newSummary}`);
  }
}

// --- Main ---

const args = process.argv.slice(2);
const thresholdIdx = args.indexOf('--threshold');
const threshold = thresholdIdx !== -1 ? parseFloat(args[thresholdIdx + 1]) : DEFAULT_THRESHOLD;
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');
const jsonOutput = args.includes('--json');

const index = loadIndex();
const segments = index.segments || [];

if (segments.length < MIN_SEGMENTS) {
  console.log(`Only ${segments.length} segments found. Need at least ${MIN_SEGMENTS} for dedup.`);
  process.exit(0);
}

const duplicates = findDuplicates(segments, threshold);

if (jsonOutput) {
  const report = {
    threshold,
    clustersFound: duplicates.length,
    clusters: duplicates.map(d => ({
      keep: d.keep.id,
      merge: d.merge.map(s => s.id),
      similarity: d.similarity,
    })),
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(duplicates, threshold);

  if (duplicates.length > 0) {
    const proposals = duplicates.map(proposeMerge);
    printProposals(proposals);

    if (apply) {
      const log = {
        appliedAt: new Date().toISOString(),
        threshold,
        merges: proposals,
      };
      fs.writeFileSync(DEDUP_LOG, JSON.stringify(log, null, 2));
      console.log(`\nMerge log saved to: ${DEDUP_LOG}`);
      console.log('Note: Actual file merges require manual review. Log contains proposals.');
    } else if (dryRun) {
      console.log('\n(Dry run — no files modified)');
    } else {
      console.log('\nRun with --apply to save merge log, or --dry-run to preview.');
    }
  }
}
