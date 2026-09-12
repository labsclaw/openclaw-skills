#!/usr/bin/env node
/**
 * ssc-rebuild.cjs — SSC Router v4.1 Rebuild Engine
 * 
 * Rebuilds memory/index.json with:
 * - Tier 1: Segments (Curated Domain Knowledge, weight x2.0)
 * - Tier 1.5: Reports (Analysis & Benchmarks, weight x1.5)
 * - Tier 1.5: Rules (Active Procedures, weight x1.5)
 * - Tier 2: Daily Logs (Raw Ephemeral Context, weight x0.5)
 * - Tier 3: Raw, Research, References, Atoms, Meta (weight x0.3)
 * - BM25 Corpus Statistics: IDF dictionary, document token lengths, avg doc length
 * 
 * No external dependencies.
 */

const fs = require('fs');
const path = require('path');

const workspaceDir = path.resolve(process.env.OPENCLAW_WORKSPACE || path.join(__dirname, '..'));
const memoryDir = path.join(workspaceDir, 'memory');
const indexPath = path.join(memoryDir, 'index.json');

// Tier definitions: dir → { tier, weight, label }
const TIERS = {
  segments:   { tier: 1,   weight: 2.0, label: 'Segment' },
  reports:    { tier: 1.5, weight: 1.5, label: 'Report' },
  rules:      { tier: 1.5, weight: 1.5, label: 'Rule' },
  daily:      { tier: 2,   weight: 0.5, label: 'Daily' },
  meta:       { tier: 3,   weight: 0.3, label: 'Meta' },
  raw:        { tier: 3,   weight: 0.3, label: 'Raw' },
  research:   { tier: 3,   weight: 0.3, label: 'Research' },
  references: { tier: 3,   weight: 0.3, label: 'Reference' },
  atoms:      { tier: 3,   weight: 0.3, label: 'Atom' },
};

const stopWords = new Set([
  'and', 'the', 'for', 'with', 'that', 'this', 'from', 'have', 'were', 'your',
  'para', 'com', 'que', 'como', 'uma', 'sobre', 'mais', 'este', 'esta',
  'sessao', 'session', 'log', 'update', 'updated', 'file', 'files', 'sessao'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9áàâãéèêíïóôõöúçñ\-_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));
}

function extractKeywords(text) {
  const tokens = tokenize(text);
  return Array.from(new Set(tokens));
}

function rebuild() {
  let existingIndex = { segments: [] };
  if (fs.existsSync(indexPath)) {
    try {
      existingIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (e) {}
  }

  // Build lookup of all existing entries by file path for accessCount preservation
  const existingByFile = new Map();
  for (const tierKey of ['segments', 'daily', 'reports', 'rules', 'meta', 'raw', 'research', 'references', 'atoms']) {
    if (existingIndex[tierKey]) {
      for (const entry of existingIndex[tierKey]) {
        existingByFile.set(entry.file, entry);
      }
    }
  }

  const allEntries = {};

  for (const [dirName, tierDef] of Object.entries(TIERS)) {
    const dirPath = path.join(memoryDir, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    const entries = [];

    for (const f of files) {
      const relPath = `memory/${dirName}/${f}`;
      const fullPath = path.join(dirPath, f);
      const content = fs.readFileSync(fullPath, 'utf8');
      const stat = fs.statSync(fullPath);
      const existing = existingByFile.get(relPath);

      let summary = existing ? existing.summary : '';
      if (!summary) {
        const firstLine = content.split('\n').find(l => l.trim().startsWith('#') || l.trim().length > 0) || f;
        summary = firstLine.replace(/^#+\s*/, '').trim();
      }

      const headerLines = content.split('\n').filter(l => l.trim().startsWith('#')).join(' ');
      const autoKw = extractKeywords(headerLines + ' ' + f.replace(/\.md$/, ''));
      let keywords = existing && existing.keywords ? existing.keywords : [];
      keywords = Array.from(new Set([...keywords, ...autoKw]));

      const fullTokens = tokenize(content);

      entries.push({
        id: f.replace(/\.md$/, ''),
        file: relPath,
        summary: summary,
        tier: tierDef.tier,
        weight: tierDef.weight,
        tierLabel: tierDef.label,
        keywords: keywords,
        tags: existing && existing.tags ? existing.tags : [],
        accessCount: existing ? (existing.accessCount || 0) : 0,
        lastUpdated: stat.mtime.toISOString(),
        size: stat.size,
        tokenCount: fullTokens.length,
        tokens: fullTokens
      });
    }

    allEntries[dirName] = entries;
  }

  // 2. Compute BM25 Corpus Statistics across ALL tiers
  const allDocs = Object.values(allEntries).flat();
  const docCount = allDocs.length;
  let totalTokenCount = 0;
  const docFreqs = {};

  for (const doc of allDocs) {
    totalTokenCount += doc.tokenCount;
    const uniqueTokens = new Set(doc.tokens);
    for (const token of uniqueTokens) {
      docFreqs[token] = (docFreqs[token] || 0) + 1;
    }
  }

  const avgDocLength = docCount > 0 ? (totalTokenCount / docCount) : 0;
  const idf = {};
  for (const [token, df] of Object.entries(docFreqs)) {
    idf[token] = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
  }

  // Clean tokens from serialized index to keep file size compact
  const cleaned = {};
  for (const [dirName, entries] of Object.entries(allEntries)) {
    cleaned[dirName] = entries.map(e => {
      const { tokens, ...rest } = e;
      return rest;
    });
  }

  const newIndex = {
    version: "4.1",
    lastUpdated: new Date().toISOString(),
    description: `SSC v4.1 Hybrid BM25 Index — ${Object.entries(cleaned).map(([k, v]) => `${v.length} ${k}`).join(', ')}`,
    config: {
      maxSegmentsPerQuery: 5,
      tier1Weight: 2.0,
      tier1_5Weight: 1.5,
      tier2Weight: 0.5,
      tier3Weight: 0.3,
      bm25: { k1: 1.5, b: 0.75 }
    },
    bm25Stats: {
      docCount,
      avgDocLength,
      idf
    },
    ...cleaned
  };

  fs.writeFileSync(indexPath, JSON.stringify(newIndex, null, 2), 'utf8');
  return newIndex;
}

if (require.main === module) {
  const idx = rebuild();
  console.log(`SSC Index v4.1 rebuilt successfully!`);
  for (const [tier, entries] of Object.entries(idx).filter(([k]) => !['version','lastUpdated','description','config','bm25Stats'].includes(k))) {
    if (Array.isArray(entries)) console.log(`  ${tier}: ${entries.length} entries`);
  }
  console.log(`BM25 Corpus: ${idx.bm25Stats.docCount} docs, Avg Length: ${Math.round(idx.bm25Stats.avgDocLength)} tokens`);
}

module.exports = { rebuild, tokenize };
