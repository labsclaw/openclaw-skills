#!/usr/bin/env node
/**
 * ssc-router.cjs — SSC Router v4.0 (Hybrid BM25 + Tiered Retrieval)
 * 
 * Features:
 * - Hybrid BM25 + Exact Keyword + Tag matching (Word Boundary enforced)
 * - Tier 1 (Segments, x2.0 multiplier) & Tier 2 (Daily Logs, x0.5 multiplier)
 * - JSON output for sub-agents & CLI tools (--json)
 * - Auto-updates accessCount in memory/index.json
 * 
 * Usage:
 *   node scripts/ssc-router.cjs query "heartbeat alert storm" [--top=5] [--json] [--dry-run]
 *   node scripts/ssc-router.cjs stats
 *   node scripts/ssc-router.cjs list
 */

const fs = require('fs');
const path = require('path');
const { rebuild, tokenize } = require('./ssc-rebuild.cjs');

const workspaceDir = 'C:\\Users\\ClawLabs\\.openclaw\\workspace';
const memoryDir = path.join(workspaceDir, 'memory');
const indexPath = path.join(memoryDir, 'index.json');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadIndex() {
  if (!fs.existsSync(indexPath)) {
    return rebuild();
  }
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (e) {
    return rebuild();
  }
}

function computeBM25Score(queryTokens, docTokens, docLen, avgDocLength, idfStats, k1 = 1.5, b = 0.75) {
  if (!docTokens || docTokens.length === 0 || avgDocLength === 0) return 0;
  
  const tf = {};
  for (const token of docTokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  let score = 0;
  for (const qToken of queryTokens) {
    const freq = tf[qToken] || 0;
    if (freq > 0) {
      const idf = idfStats[qToken] || Math.log(1 + (100 / (1 + 0.5)));
      const numerator = freq * (k1 + 1);
      const denominator = freq + k1 * (1 - b + b * (docLen / avgDocLength));
      score += idf * (numerator / denominator);
    }
  }
  return score;
}

function querySSC(queryText, options = {}) {
  const topK = options.topK || 5;
  const dryRun = !!options.dryRun;
  
  const index = loadIndex();
  const queryLower = queryText.toLowerCase();
  const queryTokens = tokenize(queryText);
  
  if (queryTokens.length === 0) {
    return { results: [], totalMatches: 0, topK, query: queryText };
  }

  const queryTokenSet = new Set(queryTokens);
  const t1Weight = (index.config && index.config.tier1Weight) || 2.0;
  const t2Weight = (index.config && index.config.tier2Weight) || 0.5;
  const idfStats = (index.bm25Stats && index.bm25Stats.idf) || {};
  const avgDocLength = (index.bm25Stats && index.bm25Stats.avgDocLength) || 100;

  const scoredEntries = [];

  function scoreEntry(entry, tier) {
    const isTier1 = tier === 1;
    const tierMultiplier = isTier1 ? t1Weight : t2Weight;
    
    // 1. Keyword & Tag Exact Word Boundary Hits
    let keywordHits = 0;
    let tagHits = 0;
    const matchedKw = [];

    if (entry.keywords) {
      for (const kw of entry.keywords) {
        const kwLower = kw.toLowerCase();
        // Check exact token match or word boundary regex
        if (queryTokenSet.has(kwLower) || new RegExp(`\\b${escapeRegex(kwLower)}\\b`, 'i').test(queryText)) {
          keywordHits++;
          matchedKw.push(kw);
        }
      }
    }

    if (entry.tags) {
      for (const tag of entry.tags) {
        const tagLower = tag.toLowerCase();
        if (queryTokenSet.has(tagLower) || new RegExp(`\\b${escapeRegex(tagLower)}\\b`, 'i').test(queryText)) {
          tagHits++;
        }
      }
    }

    // Load document content tokens for BM25 calculation
    const fullPath = path.join(workspaceDir, entry.file);
    let docTokens = [];
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      docTokens = tokenize(content);
    }

    // 2. Compute BM25 Score over full doc
    const bm25Score = computeBM25Score(queryTokens, docTokens, docTokens.length, avgDocLength, idfStats);

    // 3. Combined Score: BM25 + Keyword Hits + Weight
    // ONLY include entry if there is a real BM25 or Keyword match
    if (bm25Score > 0 || keywordHits > 0 || tagHits > 0) {
      const rawScore = (bm25Score * 1.2) + (keywordHits * 2.0) + (tagHits * 1.5) + ((entry.weight || 1.0) * 0.5);
      const finalScore = rawScore * tierMultiplier;

      scoredEntries.push({
        id: entry.id,
        file: entry.file,
        summary: entry.summary,
        tier: tier,
        score: Math.round(finalScore * 100) / 100,
        bm25Score: Math.round(bm25Score * 100) / 100,
        keywordHits: keywordHits,
        tagHits: tagHits,
        matchedKeywords: matchedKw,
        entryRef: entry
      });
    }
  }

  // Score Tier 1 (Segments)
  if (index.segments) {
    for (const seg of index.segments) {
      scoreEntry(seg, 1);
    }
  }

  // Score Tier 2 (Daily)
  if (index.daily) {
    for (const daily of index.daily) {
      scoreEntry(daily, 2);
    }
  }

  // Sort by final score descending
  scoredEntries.sort((a, b) => b.score - a.score);
  const topResults = scoredEntries.slice(0, topK);

  // Update accessCount if not dryRun
  if (!dryRun && topResults.length > 0) {
    let updated = false;
    for (const res of topResults) {
      const entry = res.entryRef;
      entry.accessCount = (entry.accessCount || 0) + 1;
      updated = true;
    }
    if (updated) {
      try {
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
      } catch (e) {}
    }
  }

  const cleanResults = topResults.map(({ entryRef, ...rest }) => rest);
  return {
    query: queryText,
    totalMatches: scoredEntries.length,
    topK: topK,
    results: cleanResults
  };
}

function showStats() {
  const index = loadIndex();
  console.log(`\n=== SSC Router v4.0 Hybrid Stats ===`);
  console.log(`Tier 1 Segments: ${index.segments ? index.segments.length : 0}`);
  console.log(`Tier 2 Daily Logs: ${index.daily ? index.daily.length : 0}`);
  console.log(`BM25 Corpus Docs: ${index.bm25Stats ? index.bm25Stats.docCount : 0}`);
  console.log(`Last Updated: ${index.lastUpdated}`);
}

function showList() {
  const index = loadIndex();
  console.log(`\n=== SSC Tier 1 Segments ===`);
  if (index.segments) {
    for (const s of index.segments) {
      console.log(`[Tier 1] ${s.id} - ${s.summary} (${s.file})`);
    }
  }
  console.log(`\n=== SSC Tier 2 Daily Logs ===`);
  if (index.daily) {
    for (const d of index.daily.slice(0, 10)) {
      console.log(`[Tier 2] ${d.id} - ${d.summary} (${d.file})`);
    }
    if (index.daily.length > 10) {
      console.log(`... and ${index.daily.length - 10} more daily logs.`);
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0];

  if (mode === 'stats') {
    showStats();
  } else if (mode === 'list') {
    showList();
  } else if (mode === 'query' || mode === '-Query') {
    const queryIdx = args.indexOf('query') >= 0 ? args.indexOf('query') : args.indexOf('-Query');
    const queryText = args[queryIdx + 1] || '';
    const jsonFlag = args.includes('--json');
    const dryRun = args.includes('--dry-run');
    
    let topK = 5;
    const topIdx = args.findIndex(a => a.startsWith('--top='));
    if (topIdx >= 0) {
      topK = parseInt(args[topIdx].split('=')[1], 10) || 5;
    }

    const output = querySSC(queryText, { topK, dryRun });

    if (jsonFlag) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`\n=== SSC v4.0 Hybrid Results (Query: '${output.query}') ===`);
      console.log(`Top ${output.results.length} of ${output.totalMatches} matches:\n`);
      for (const r of output.results) {
        const tierLabel = r.tier === 1 ? '[Tier 1: Segment]' : '[Tier 2: Daily]';
        console.log(`${tierLabel} ${r.id} - ${r.summary}`);
        console.log(`  Score: ${r.score} (BM25: ${r.bm25Score}, Hits: ${r.keywordHits} kw, Multiplier: x${r.tier === 1 ? 2.0 : 0.5})`);
        if (r.matchedKeywords.length > 0) {
          console.log(`  Matched: ${r.matchedKeywords.join(', ')}`);
        }
        console.log(`  File: ${r.file}\n`);
      }
    }
  } else {
    console.log(`Usage: node scripts/ssc-router.cjs query "your search terms" [--top=5] [--json] [--dry-run]`);
    console.log(`       node scripts/ssc-router.cjs stats`);
    console.log(`       node scripts/ssc-router.cjs list`);
  }
}

module.exports = { querySSC, loadIndex, rebuild };
