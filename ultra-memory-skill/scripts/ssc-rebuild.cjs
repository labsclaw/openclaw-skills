#!/usr/bin/env node
/**
 * ssc-rebuild.cjs — SSC Router v4.0 Rebuild Engine
 * 
 * Rebuilds memory/index.json with:
 * - Tier 1: Segments (Curated Domain Knowledge, weight x2.0)
 * - Tier 2: Daily Logs (Raw Ephemeral Context, weight x0.5)
 * - BM25 Corpus Statistics: IDF dictionary, document token lengths, avg doc length
 * 
 * No external dependencies.
 */

const fs = require('fs');
const path = require('path');

function findWorkspace() {
  if (process.env.OPENCLAW_WORKSPACE) return process.env.OPENCLAW_WORKSPACE;
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'memory')) && fs.existsSync(path.join(dir, 'scripts'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Cannot find OpenClaw workspace (looked for memory/ + scripts/ dirs)');
}
const workspaceDir = findWorkspace();
const memoryDir = path.join(workspaceDir, 'memory');
const segmentsDir = path.join(memoryDir, 'segments');
const dailyDir = path.join(memoryDir, 'daily');
const indexPath = path.join(memoryDir, 'index.json');

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

  const existingSegMap = new Map();
  if (existingIndex.segments) {
    for (const s of existingIndex.segments) {
      existingSegMap.set(s.file, s);
    }
  }

  // 1. Process Segments (Tier 1)
  const segmentFiles = fs.existsSync(segmentsDir) 
    ? fs.readdirSync(segmentsDir).filter(f => f.endsWith('.md')) 
    : [];
  const segments = [];

  for (const f of segmentFiles) {
    const relPath = `memory/segments/${f}`;
    const fullPath = path.join(segmentsDir, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    const stat = fs.statSync(fullPath);
    
    const existing = existingSegMap.get(relPath);
    
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

    segments.push({
      id: f.replace(/\.md$/, ''),
      file: relPath,
      summary: summary,
      tier: 1,
      weight: 2.0,
      keywords: keywords,
      tags: existing && existing.tags ? existing.tags : [],
      accessCount: existing ? (existing.accessCount || 0) : 0,
      lastUpdated: stat.mtime.toISOString(),
      size: stat.size,
      tokenCount: fullTokens.length,
      tokens: fullTokens
    });
  }

  // 2. Process Daily Logs (Tier 2)
  const dailyFiles = fs.existsSync(dailyDir) 
    ? fs.readdirSync(dailyDir).filter(f => f.endsWith('.md')) 
    : [];
  const dailyEntries = [];

  for (const f of dailyFiles) {
    const relPath = `memory/daily/${f}`;
    const fullPath = path.join(dailyDir, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    const stat = fs.statSync(fullPath);

    const dateMatch = f.match(/^\d{4}-\d{2}-\d{2}/);
    const dateStr = dateMatch ? dateMatch[0] : '';

    const headers = content.split('\n')
      .filter(l => l.trim().startsWith('#'))
      .map(l => l.replace(/^#+\s*/, '').trim());

    const summaryHeader = headers.length > 0 ? headers.slice(0, 3).join(' | ') : `Daily log ${f}`;
    const keywords = extractKeywords(headers.join(' ') + ' ' + f);
    const fullTokens = tokenize(content);

    dailyEntries.push({
      id: `daily-${f.replace(/\.md$/, '')}`,
      file: relPath,
      summary: summaryHeader,
      tier: 2,
      weight: 0.5,
      date: dateStr,
      keywords: keywords,
      accessCount: 0,
      lastUpdated: stat.mtime.toISOString(),
      size: stat.size,
      tokenCount: fullTokens.length,
      tokens: fullTokens
    });
  }

  // 3. Compute BM25 Corpus Statistics
  const allDocs = [...segments, ...dailyEntries];
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
    // Standard BM25 IDF formula with smoothing
    idf[token] = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
  }

  // Clean tokens from serialized index to keep file size compact, keep token frequencies
  const cleanedSegments = segments.map(s => {
    const { tokens, ...rest } = s;
    return rest;
  });

  const cleanedDaily = dailyEntries.map(d => {
    const { tokens, ...rest } = d;
    return rest;
  });

  const newIndex = {
    version: "4.0",
    lastUpdated: new Date().toISOString(),
    description: `SSC v4.0 Hybrid BM25 Index (${cleanedSegments.length} Segments [Tier 1], ${cleanedDaily.length} Daily Logs [Tier 2])`,
    config: {
      maxSegmentsPerQuery: 5,
      tier1Weight: 2.0,
      tier2Weight: 0.5,
      bm25: { k1: 1.5, b: 0.75 }
    },
    bm25Stats: {
      docCount,
      avgDocLength,
      idf
    },
    segments: cleanedSegments,
    daily: cleanedDaily
  };

  fs.writeFileSync(indexPath, JSON.stringify(newIndex, null, 2), 'utf8');
  return newIndex;
}

if (require.main === module) {
  const idx = rebuild();
  console.log(`SSC Index v4.0 rebuilt successfully!`);
  console.log(`Tier 1 (Segments): ${idx.segments.length} entries`);
  console.log(`Tier 2 (Daily): ${idx.daily.length} entries`);
  console.log(`BM25 Corpus: ${idx.bm25Stats.docCount} docs, Avg Length: ${Math.round(idx.bm25Stats.avgDocLength)} tokens`);
}

module.exports = { rebuild, tokenize };
