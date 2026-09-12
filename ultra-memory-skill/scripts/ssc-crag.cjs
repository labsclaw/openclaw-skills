#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE = path.resolve(process.env.OPENCLAW_WORKSPACE || path.join(__dirname, '..'));
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const INDEX_PATH = path.join(MEMORY_DIR, 'index.json');
const WORKSPACE_REAL = fs.realpathSync.native(WORKSPACE);

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift() || '';
  const options = {
    command,
    query: '',
    threshold: 0.3,
    index: INDEX_PATH,
    json: false,
    verbose: false,
  };

  const queryParts = [];
  for (const arg of args) {
    if (arg === '--json') options.json = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg.startsWith('--threshold=')) {
      const value = Number(arg.slice('--threshold='.length));
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error('threshold must be a number between 0 and 1');
      }
      options.threshold = value;
    } else if (arg.startsWith('--index=')) {
      options.index = path.resolve(arg.slice('--index='.length));
    } else queryParts.push(arg);
  }

  options.query = queryParts.join(' ').trim();
  return options;
}

function loadIndex(indexPath) {
  const stat = fs.statSync(indexPath);
  if (!stat.isFile()) throw new Error(`Index is not a regular file: ${indexPath}`);
  return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

function canonicalWorkspaceFile(candidate) {
  try {
    const canonical = fs.realpathSync.native(candidate);
    const relative = path.relative(WORKSPACE_REAL, canonical);
    const inside = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
    if (!inside || !fs.statSync(canonical).isFile()) return null;
    return canonical;
  } catch {
    return null;
  }
}

function hasParentTraversal(entryPath) {
  return entryPath.split(/[\\/]+/u).includes('..');
}

function resolveEntryPath(entryPath) {
  if (typeof entryPath !== 'string' || entryPath.trim() === '') return null;
  if (path.isAbsolute(entryPath) || hasParentTraversal(entryPath)) return null;

  const workspaceRelative = path.resolve(WORKSPACE, entryPath);
  const workspaceFile = canonicalWorkspaceFile(workspaceRelative);
  if (workspaceFile) {
    return workspaceFile;
  }

  const memoryRelative = path.resolve(MEMORY_DIR, entryPath);
  const memoryFile = canonicalWorkspaceFile(memoryRelative);
  if (memoryFile) {
    return memoryFile;
  }

  return null;
}

function list(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[,\s]+/u).filter(Boolean);
  return [];
}

function scoreSegment(segment, queryLower, queryTerms, threshold) {
  const keywords = list(segment.keywords);
  const tags = list(segment.tags);
  const matchedKeywords = keywords.filter((keyword) =>
    queryLower.includes(String(keyword).toLowerCase()),
  );
  const tagHits = tags.filter((tag) =>
    queryLower.includes(String(tag).toLowerCase()),
  ).length;
  const retrievalScore =
    matchedKeywords.length * 2 + tagHits + Number(segment.weight || 0) * 0.5;

  const resolvedPath = resolveEntryPath(segment.file);
  const content = resolvedPath ? fs.readFileSync(resolvedPath, 'utf8') : '';
  const contentLower = content.toLowerCase();
  const summaryLower = String(segment.summary || '').toLowerCase();

  const contentHits = queryTerms.filter((term) => contentLower.includes(term)).length;
  const summaryHits = queryTerms.filter((term) => summaryLower.includes(term)).length;
  const keywordDensity = queryTerms.length ? contentHits / queryTerms.length : 0;
  const summaryAlignment = queryTerms.length ? summaryHits / queryTerms.length : 0;
  const contentLength = content.length;
  const sufficiency = contentLength > 500 ? 1 : contentLength > 200 ? 0.6 : contentLength > 50 ? 0.3 : 0.1;
  const depthHits = matchedKeywords.filter((keyword) =>
    contentLower.includes(String(keyword).toLowerCase()),
  ).length;
  const keywordDepth = matchedKeywords.length ? depthHits / matchedKeywords.length : 0;
  const relevanceScore = Number((
    keywordDensity * 0.35 +
    summaryAlignment * 0.25 +
    sufficiency * 0.15 +
    keywordDepth * 0.25
  ).toFixed(3));

  return {
    id: segment.id,
    file: segment.file,
    resolvedPath: resolvedPath ? path.relative(WORKSPACE, resolvedPath).replaceAll('\\', '/') : null,
    retrievalScore: Number(retrievalScore.toFixed(3)),
    relevanceScore,
    validated: relevanceScore >= threshold,
    signals: {
      keywordDensity: Number(keywordDensity.toFixed(3)),
      summaryAlignment: Number(summaryAlignment.toFixed(3)),
      sufficiency,
      keywordDepth: Number(keywordDepth.toFixed(3)),
    },
  };
}

function query(index, queryText, threshold) {
  const queryLower = queryText.toLowerCase();
  const queryTerms = queryLower.split(/\s+/u).filter((term) => term.length > 2);
  const scored = index.segments
    .map((segment) => scoreSegment(segment, queryLower, queryTerms, threshold))
    .filter((result) => result.retrievalScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || b.retrievalScore - a.retrievalScore);
  const validated = scored.filter((result) => result.validated);

  return {
    query: queryText,
    threshold,
    candidateCount: scored.length,
    validatedCount: validated.length,
    discardedCount: scored.length - validated.length,
    validated,
    discarded: scored.filter((result) => !result.validated),
  };
}

function printHuman(result, verbose) {
  console.log(`SSC-CRAG query: ${result.query}`);
  console.log(`Threshold: ${result.threshold}`);
  console.log(`Candidates: ${result.candidateCount}, validated: ${result.validatedCount}, discarded: ${result.discardedCount}`);
  for (const item of result.validated) {
    console.log(`PASS ${item.id}: relevance=${item.relevanceScore}, retrieval=${item.retrievalScore}`);
  }
  if (verbose) {
    for (const item of result.discarded) {
      console.log(`FAIL ${item.id}: relevance=${item.relevanceScore}, retrieval=${item.retrievalScore}`);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const index = loadIndex(options.index);

  if (options.command === 'stats') {
    const result = { version: index.version, segments: index.segments.length };
    console.log(JSON.stringify(result, null, options.json ? 0 : 2));
    return;
  }

  if (options.command !== 'query' || !options.query) {
    throw new Error('Usage: node scripts/ssc-crag.cjs query "search terms" [--threshold=0.3] [--index=path] [--json]');
  }

  const result = query(index, options.query, options.threshold);
  if (options.json) console.log(JSON.stringify(result));
  else printHuman(result, options.verbose);
}

try {
  if (require.main === module) main();
} catch (error) {
  console.error(`ssc-crag: ${error.message}`);
  process.exitCode = 1;
}

module.exports = { loadIndex, query, scoreSegment, resolveEntryPath };
