#!/usr/bin/env node
/**
 * ssc-router.cjs — SSC Router v4.1 (Hybrid BM25 + Tiered Retrieval)
 * 
 * Features:
 * - Hybrid BM25 + Exact Keyword + Tag matching (Word Boundary enforced)
 * - 5 Tiers: Segments (x2.0), Reports/Rules (x1.5), Daily (x0.5), Meta/Raw/Research/References/Atoms (x0.3)
 * - JSON output for sub-agents & CLI tools (--json)
 * - Auto-updates accessCount in memory/index.json
 * 
 * Usage:
 *   node scripts/ssc-router.cjs query "heartbeat alert storm" [--top=5] [--json] [--dry-run]
 *   node scripts/ssc-router.cjs query --hybrid "query" [--top=5] [--alpha=0.6] [--vector] [--mmr] [--expand] [--json]
 *   node scripts/ssc-router.cjs stats
 *   node scripts/ssc-router.cjs list
 */

const fs = require('fs');
const path = require('path');
const { rebuild, tokenize } = require('./ssc-rebuild.cjs');

// Hybrid search (carregado sob demanda via lazy require)
let _hybridSearch = null;
async function getHybridSearch() {
  if (!_hybridSearch) {
    const mod = require('./ssc-hybrid.cjs');
    _hybridSearch = mod.hybridSearch;
  }
  return _hybridSearch;
}

const workspaceDir = path.resolve(process.env.OPENCLAW_WORKSPACE || path.join(__dirname, '..'));
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

function resolveEntryWeight(entry) {
  return entry.weight ?? 1.0;
}

function resolveTierMultiplier(config, tier) {
  const tierWeights = {
    1: config.tier1Weight ?? 2.0,
    1.5: config.tier1_5Weight ?? 1.5,
    2: config.tier2Weight ?? 0.5,
    3: config.tier3Weight ?? 0.3,
  };
  return tierWeights[tier] ?? 0.5;
}

function querySSC(queryText, options = {}) {
  const topK = options.topK || 5;
  const dryRun = !!options.dryRun;
  const requestedCollections = Array.isArray(options.collections) ? new Set(options.collections) : null;
  
  const index = loadIndex();
  const queryLower = queryText.toLowerCase();
  const queryTokens = tokenize(queryText);
  
  if (queryTokens.length === 0) {
    return { results: [], totalMatches: 0, topK, query: queryText };
  }

  const queryTokenSet = new Set(queryTokens);
  const config = index.config || {};
  const idfStats = (index.bm25Stats && index.bm25Stats.idf) || {};
  const avgDocLength = (index.bm25Stats && index.bm25Stats.avgDocLength) || 100;

  const scoredEntries = [];

  const tierKeys = ['segments', 'reports', 'rules', 'daily', 'meta', 'raw', 'research', 'references', 'atoms']
    .filter(key => !requestedCollections || requestedCollections.has(key));

  function scoreEntry(entry) {
    const tier = entry.tier || 2;
    const tierMultiplier = resolveTierMultiplier(config, tier);
    
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
      const rawScore = (bm25Score * 1.2) + (keywordHits * 2.0) + (tagHits * 1.5) + (resolveEntryWeight(entry) * 0.5);
      const finalScore = rawScore * tierMultiplier;

      scoredEntries.push({
        id: entry.id,
        file: entry.file,
        summary: entry.summary,
        tier: tier,
        tierLabel: entry.tierLabel || `Tier ${tier}`,
        score: Math.round(finalScore * 100) / 100,
        bm25Score: Math.round(bm25Score * 100) / 100,
        keywordHits: keywordHits,
        tagHits: tagHits,
        matchedKeywords: matchedKw,
        entryRef: entry
      });
    }
  }

  for (const tierKey of tierKeys) {
    if (index[tierKey]) {
      for (const entry of index[tierKey]) {
        scoreEntry(entry);
      }
    }
  }

  // Sort by final score descending
  scoredEntries.sort((a, b) => b.score - a.score);
  const topResults = scoredEntries.slice(0, topK);

  // Update accessCount if not dryRun
  if (!dryRun && topResults.length > 0) {
    for (const res of topResults) {
      res.entryRef.accessCount = (res.entryRef.accessCount || 0) + 1;
    }
    try {
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    } catch (e) {}
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
  console.log(`\n=== SSC Router v4.1 Hybrid Stats ===`);
  for (const key of ['segments', 'reports', 'rules', 'daily', 'meta', 'raw', 'research', 'references', 'atoms']) {
    if (index[key] && index[key].length > 0) console.log(`  ${key}: ${index[key].length}`);
  }
  console.log(`BM25 Corpus Docs: ${index.bm25Stats ? index.bm25Stats.docCount : 0}`);
  console.log(`Last Updated: ${index.lastUpdated}`);
}

function showList() {
  const index = loadIndex();
  for (const key of ['segments', 'reports', 'rules', 'daily', 'meta', 'raw', 'research', 'references', 'atoms']) {
    if (index[key] && index[key].length > 0) {
      console.log(`\n=== ${key} (${index[key].length}) ===`);
      for (const entry of index[key].slice(0, 10)) {
        console.log(`  [T${entry.tier}] ${entry.id} - ${entry.summary}`);
      }
      if (index[key].length > 10) console.log(`  ... and ${index[key].length - 10} more`);
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args.find(arg => ['stats', 'list', 'query', '-Query'].includes(arg));

  if (mode === 'stats') {
    showStats();
  } else if (mode === 'list') {
    showList();
  } else if (mode === 'query' || mode === '-Query') {
    const queryIdx = args.indexOf('query') >= 0 ? args.indexOf('query') : args.indexOf('-Query');
    const queryText = args.slice(queryIdx + 1).filter(arg => !arg.startsWith('--')).join(' ').trim();
    const jsonFlag = args.includes('--json');
    const dryRun = args.includes('--dry-run');
    
    let topK = 5;
    const topIdx = args.findIndex(a => a.startsWith('--top='));
    if (topIdx >= 0) {
      topK = parseInt(args[topIdx].split('=')[1], 10) || 5;
    }

    const useHybrid = args.includes('--hybrid');

    if (useHybrid) {
      // ── Modo híbrido ────────────────────────────────────────────────────
      (async () => {
        try {
          const hybridSearch = await getHybridSearch();
          const hybridAlpha = parseFloat(args.find(a => a.startsWith('--alpha='))?.split('=')[1] || '0.6');
          const mmrLambda = parseFloat(args.find(a => a.startsWith('--mmr-lambda='))?.split('=')[1] || '0.5');
          const useVector = !args.includes('--no-vector');
          const useMmr = args.includes('--mmr');
          const useQueryExpansion = args.includes('--expand');
          const expandStrategy = args.find(a => a.startsWith('--expand-strategy='))?.split('=')[1] || 'simple';
          const verbose = args.includes('--verbose') || args.includes('-v');

          const output = await hybridSearch(queryText, {
            topK,
            hybridAlpha,
            useVector,
            useMmr,
            mmrLambda,
            useQueryExpansion,
            expandStrategy,
            verbose,
            dryRun,
          });

          if (jsonFlag) {
            console.log(JSON.stringify(output, null, 2));
          } else {
            const strategyEmoji = {
              'hybrid+mmr': '🔀',
              'hybrid': '🌀',
              'bm25-fallback': '⚠️',
              'bm25-only': '📄',
            };
            console.log(`\n${strategyEmoji[output.strategy] || '🌀'}  SSC Hybrid Results (Query: '${output.query}')`);
            console.log(`Strategy: ${output.strategy} | ${output.results.length} of ${output.totalMatches} matches | ${output.timing.total}ms`);
            if (output.expandedQuery) {
              console.log(`Expanded: "${output.expandedQuery}"`);
            }
            console.log('');
            for (const r of output.results) {
              const tierLabel = r.tier === 1 ? '[Seg]' : '[Daily]';
              console.log(`${tierLabel} ${r.id} — ${r.summary || '(sem resumo)'}`);
              console.log(`  Score: ${r.score} (BM25: ${r.bm25Score}, Vec: ${r.vecScore})`);
              if (r.mmrScore !== undefined) {
                console.log(`  MMR:  ${r.mmrScore} (diversity: ${r.diversityContribution})`);
              }
              console.log(`  File: ${r.file}\n`);
            }
          }
        } catch (err) {
          console.error(`[Router] ❌ Hybrid search failed: ${err.message}`);
          console.error(`[Router] Falling back to BM25...`);
          const output = querySSC(queryText, { topK, dryRun });
          if (jsonFlag) {
            console.log(JSON.stringify(output, null, 2));
          } else {
            console.log(`\n=== SSC v4.1 BM25 (fallback) Results (Query: '${output.query}') ===`);
            console.log(`Top ${output.results.length} of ${output.totalMatches} matches:\n`);
            for (const r of output.results) {
              console.log(`[${r.tierLabel}] ${r.id} - ${r.summary}`);
              console.log(`  Score: ${r.score} (BM25: ${r.bm25Score}, Hits: ${r.keywordHits} kw)`);
              if (r.matchedKeywords.length > 0) {
                console.log(`  Matched: ${r.matchedKeywords.join(', ')}`);
              }
              console.log(`  File: ${r.file}\n`);
            }
          }
        }
      })();
    } else {
      // ── Modo BM25 clássico ────────────────────────────────────────────────
      const output = querySSC(queryText, { topK, dryRun });

      if (jsonFlag) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log(`\n=== SSC v4.1 Hybrid Results (Query: '${output.query}') ===`);
        console.log(`Top ${output.results.length} of ${output.totalMatches} matches:\n`);
        for (const r of output.results) {
          console.log(`[${r.tierLabel}] ${r.id} - ${r.summary}`);
          console.log(`  Score: ${r.score} (BM25: ${r.bm25Score}, Hits: ${r.keywordHits} kw, Tier: ${r.tierLabel})`);
          if (r.matchedKeywords.length > 0) {
            console.log(`  Matched: ${r.matchedKeywords.join(', ')}`);
          }
          console.log(`  File: ${r.file}\n`);
        }
      }
    }
  } else {
    console.log(`Usage: node scripts/ssc-router.cjs query "your search terms" [--top=5] [--json] [--dry-run]`);
    console.log(`       node scripts/ssc-router.cjs query --hybrid "query" [--top=5] [--alpha=0.6] [--mmr] [--expand] [--json]`);
    console.log(`       node scripts/ssc-router.cjs stats`);
    console.log(`       node scripts/ssc-router.cjs list`);
    console.log(`\nHybrid flags:`);
    console.log(`  --hybrid              Ativa busca híbrida (BM25 + Vector)`);
    console.log(`  --alpha=N             Peso BM25 (default: 0.6)`);
    console.log(`  --no-vector           Desativa busca vetorial`);
    console.log(`  --mmr                 Ativa MMR (diversificação)`);
    console.log(`  --mmr-lambda=N        Lambda MMR (default: 0.5)`);
    console.log(`  --expand              Ativa query expansion`);
    console.log(`  --expand-strategy=N   simple|llm (default: simple)`);
  }
}

module.exports = { querySSC, loadIndex, rebuild, getHybridSearch, resolveEntryWeight, resolveTierMultiplier };
