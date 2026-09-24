#!/usr/bin/env node
/**
 * ssc-hybrid.cjs — Hybrid Search (BM25 + Vector + MMR + Query Expansion)
 *
 * Pipeline:
 *   1. (Optional) Query expansion — expands query with related terms
 *   2. BM25 search on index.json (reuses ssc-router logic)
 *   3. (Optional) Vector search via sqlite-vec (EmbedProvider + VectorIndex)
 *   4. Score combination: hybridAlpha * BM25 + (1 - hybridAlpha) * Vector
 *   5. (Optional) MMR diversity re-ranking on vector chunks
 *   6. Sort and return topK results
 *
 * Usage:
 *   const { hybridSearch } = require('./ssc-hybrid.cjs');
 *   const results = await hybridSearch("minha query", { useVector: true });
 *
 * Dependencies (all local):
 *   - ssc-router.cjs    — BM25 search
 *   - ssc-embed-provider.cjs — Google Gemini embeddings
 *   - ssc-vec-index.cjs — sqlite-vec index
 *   - ssc-mmr.cjs       — MMR re-ranking
 *   - ssc-query-expand.cjs — Query expansion
 *   - ssc-chunker.cjs   — Chunking utilities
 *   - ssc-rebuild.cjs   — Tokenize utility
 */

'use strict';

// Lazy imports (evitam circular dependency com ssc-router.cjs)
let _querySSC = null;
let _loadIndex = null;
function _getQuerySSC() {
  if (!_querySSC) {
    const mod = require('./ssc-router.cjs');
    _querySSC = mod.querySSC;
    _loadIndex = mod.loadIndex;
  }
  return _querySSC;
}
function _getLoadIndex() {
  if (!_loadIndex) {
    const mod = require('./ssc-router.cjs');
    _querySSC = mod.querySSC;
    _loadIndex = mod.loadIndex;
  }
  return _loadIndex;
}

const { EmbedProvider } = require('./ssc-embed-provider.cjs');
const { VectorIndex } = require('./ssc-vec-index.cjs');
const { reRank } = require('./ssc-mmr.cjs');
const { expandQuery } = require('./ssc-query-expand.cjs');
const path = require('path');

const WORKSPACE_DIR = path.resolve(__dirname, '..');

// ============================================================================
// Score normalization
// ============================================================================

/**
 * Normaliza um array de scores para [0, 1] dividindo pelo valor máximo.
 *
 * @param {number[]} scores — Scores brutos
 * @returns {number[]} — Scores normalizados entre 0 e 1
 */
function normalizeScores(scores) {
  if (!scores || scores.length === 0) return [];
  const max = Math.max(...scores);
  if (max <= 0) return scores.map(() => 0);
  return scores.map(s => s / max);
}

// ============================================================================
// Hybrid Search Pipeline
// ============================================================================

/**
 * Orquestra o pipeline híbrido completo de busca.
 *
 * @param {string} query — Consulta do usuário
 * @param {object} [options]
 * @param {number}  [options.topK=5]              — Número de resultados finais
 * @param {number}  [options.hybridAlpha=0.6]     — Peso do BM25 na combinação
 *   (0 = só vetorial, 1 = só BM25)
 * @param {boolean} [options.useVector=true]      — Ativa/desativa busca vetorial
 * @param {boolean} [options.useMmr=false]        — Ativa/desativa MMR
 * @param {number}  [options.mmrLambda=0.5]       — Tradeoff relevância vs diversidade
 * @param {boolean} [options.useQueryExpansion=false] — Ativa/desativa query expansion
 * @param {string}  [options.expandStrategy='simple'] — 'simple' | 'llm'
 * @param {boolean} [options.verbose=false]       — Log detalhado
 * @returns {Promise<object>} Resultado da busca híbrida
 */
async function hybridSearch(query, options = {}) {
  const {
    topK = 5,
    hybridAlpha = 0.6,
    useVector = true,
    useMmr = false,
    mmrLambda = 0.5,
    useQueryExpansion = false,
    expandStrategy = 'simple',
    verbose = false,
  } = options;

  const startTime = Date.now();

  // ── Validação ─────────────────────────────────────────────────────────────
  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      query: '',
      results: [],
      totalMatches: 0,
      topK,
      strategy: 'none',
      timing: { total: 0 },
    };
  }

  const log = verbose ? (...args) => console.log('[Hybrid]', ...args) : () => {};
  const timing = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Query Expansion
  // ═══════════════════════════════════════════════════════════════════════════

  let expandedQuery = query.trim();
  let expansionTerms = [];

  if (useQueryExpansion) {
    const t0 = Date.now();
    log('Expandindo query via', expandStrategy, '...');
    try {
      const expResult = await expandQuery(query.trim(), { strategy: expandStrategy });
      expandedQuery = expResult.combined || expResult.original;
      expansionTerms = expResult.expanded || [];
      timing.expansion = Date.now() - t0;
      log(`Query expandida: "${expandedQuery}"`);
      if (expansionTerms.length > 0) {
        log(`Termos adicionados: ${expansionTerms.join(', ')}`);
      }
    } catch (err) {
      log(`Query expansion falhou: ${err.message}, usando original`);
      timing.expansion = Date.now() - t0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: BM25 Search (reutiliza lógica do ssc-router)
  // ═══════════════════════════════════════════════════════════════════════════

  const t1 = Date.now();
  log('Executando BM25...');
  const _qssc = _getQuerySSC();
  const bm25Results = _qssc(query.trim(), { topK: topK * 3 });
  timing.bm25 = Date.now() - t1;
  log(`BM25: ${bm25Results.totalMatches} matches, top ${bm25Results.results.length} resultados`);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Vector Search (via EmbedProvider + VectorIndex)
  // ═══════════════════════════════════════════════════════════════════════════

  let queryEmbedding = null;
  let vecChunks = [];
  let vectorAvailable = false;

  if (useVector) {
    const t2 = Date.now();
    log('Executando busca vetorial...');

    try {
      const embedder = new EmbedProvider();

      if (!embedder.apiKey) {
        log('⚠️  GEMINI_API_KEY não definida — pulando busca vetorial');
        log('  Defina GEMINI_API_KEY ou GOOGLE_AI_STUDIO_KEY');
      } else {
        // Embed da query expandida (ou original)
        queryEmbedding = await embedder.embed(expandedQuery);
        log(`Query embedding gerado: ${queryEmbedding.length} dimensões`);

        // kNN search no VectorIndex
        const vecIndex = new VectorIndex();
        vecIndex.connect();
        vecChunks = vecIndex.search(queryEmbedding, topK * 3);
        log(`Vector search: ${vecChunks.length} chunks encontrados`);

        // Armazena referência do VectorIndex pra MMR (se necessário)
        if (useMmr) {
          timing._vecIndex = vecIndex;
        } else {
          vecIndex.close();
        }

        vectorAvailable = true;
      }
    } catch (err) {
      log(`Vector search falhou: ${err.message}`);
    }

    timing.vector = Date.now() - t2;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: Score Combination (hibridização)
  // ═══════════════════════════════════════════════════════════════════════════

  const t3 = Date.now();
  log('Combinando scores...');

  // Mapa BM25: segment_id → score bruto
  const bm25Scores = new Map();
  const bm25Values = [];
  for (const r of bm25Results.results) {
    bm25Scores.set(r.id, r.score);
    bm25Values.push(r.score);
  }

  // Mapa vetorial: segment_id → { maxCosineSimilarity, chunks[] }
  const vecScores = new Map();
  const vecChunksBySeg = new Map();
  const vecValues = [];

  for (const chunk of vecChunks) {
    const segId = chunk.segment_id;
    const cosim = chunk.cosineSimilarity || 0;

    // Agrega por segmento (pega o melhor cosine similarity)
    if (!vecScores.has(segId) || cosim > vecScores.get(segId)) {
      vecScores.set(segId, cosim);
    }

    // Armazena chunks por segmento
    if (!vecChunksBySeg.has(segId)) {
      vecChunksBySeg.set(segId, []);
    }
    vecChunksBySeg.get(segId).push(chunk);

    vecValues.push(cosim);
  }

  // Normaliza BM25 scores para [0, 1]
  const bm25NormMap = new Map();
  const normedBm25 = normalizeScores(bm25Values);
  let idx = 0;
  for (const r of bm25Results.results) {
    bm25NormMap.set(r.id, normedBm25[idx++]);
  }

  // Normaliza vector scores para [0, 1]
  const vecNormMap = new Map();
  const normedVec = normalizeScores(vecValues);
  idx = 0;
  for (const [segId] of vecScores) {
    vecNormMap.set(segId, normedVec[idx++]);
  }

  // Carrega index.json para metadados (summary, file, etc.)
  const _lidx = _getLoadIndex();
  const index = _lidx();
  const segmentMeta = new Map();
  if (index.segments) {
    for (const seg of index.segments) {
      segmentMeta.set(seg.id, seg);
    }
  }

  // Junta os segmentos de ambas as fontes
  const allSegIds = new Set([...bm25Scores.keys(), ...vecScores.keys()]);
  // Se não há resultados de nenhum lado, retorna vazio
  if (allSegIds.size === 0) {
    return {
      query,
      results: [],
      totalMatches: 0,
      topK,
      strategy: 'none',
      timing: { total: Date.now() - startTime },
    };
  }

  const combined = [];

  for (const segId of allSegIds) {
    const bm25Norm = bm25NormMap.get(segId) || 0;
    const vecNorm = vecNormMap.get(segId) || 0;
    const bm25Raw = bm25Scores.get(segId) || 0;
    const vecRaw = vecScores.get(segId) || 0;

    // Fórmula de combinação linear
    let combinedScore;
    if (useVector && vectorAvailable) {
      // Híbrido: BM25 * alpha + Vector * (1 - alpha)
      combinedScore = hybridAlpha * bm25Norm + (1 - hybridAlpha) * vecNorm;
    } else {
      // BM25 puro (vector indisponível ou desligado)
      combinedScore = bm25Norm;
    }

    const meta = segmentMeta.get(segId);
    combined.push({
      id: segId,
      file: meta ? meta.file : '',
      summary: meta ? meta.summary : '',
      tier: meta ? meta.tier : 1,
      score: Math.round(combinedScore * 10000) / 10000,
      bm25Score: Math.round(bm25Raw * 100) / 100,
      vecScore: Math.round(vecRaw * 10000) / 10000,
      bm25Norm: Math.round(bm25Norm * 10000) / 10000,
      vecNorm: Math.round(vecNorm * 10000) / 10000,
      matchedKeywords: meta ? (meta.keywords || []) : [],
      chunks: vecChunksBySeg.get(segId) || [],
      strategy: (useVector && vectorAvailable) ? 'hybrid' : 'bm25-only',
    });
  }

  // Ordenação inicial por score combinado (descendente)
  combined.sort((a, b) => b.score - a.score);
  timing.combination = Date.now() - t3;

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: MMR (Maximum Marginal Relevance)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // O MMR atua no nível de chunks (não segmentos), diversificando resultados
  // que são similares entre si. Para cada segmento combinado, tentamos obter
  // o embedding do chunk mais relevante para usar na diversificação.
  //
  // Edge case: se embeddings não estão disponíveis, MMR não é aplicado e
  // o resultado mantém a ordenação por score combinado.
  // ═══════════════════════════════════════════════════════════════════════════

  let mmrApplied = false;
  let vecIndexForMmr = null;

  if (useMmr && queryEmbedding && combined.length > 1) {
    const t4 = Date.now();
    log('Aplicando MMR...');

    // Reabre VectorIndex se necessário (pode ter sido fechado acima)
    if (vectorAvailable && timing._vecIndex) {
      vecIndexForMmr = timing._vecIndex;
    } else if (vectorAvailable) {
      try {
        vecIndexForMmr = new VectorIndex();
        vecIndexForMmr.connect();
      } catch (e) {
        log(`Não foi possível conectar VectorIndex para MMR: ${e.message}`);
      }
    }

    // Constrói candidatos a partir dos top combined * 2 segmentos
    const mmrCandidateCount = Math.min(combined.length, topK * 2);
    const mmrCandidates = [];

    for (let i = 0; i < mmrCandidateCount; i++) {
      const seg = combined[i];
      const chunks = seg.chunks || [];

      if (chunks.length > 0 && vecIndexForMmr) {
        // Pega o melhor chunk deste segmento que tenha embedding
        let bestChunk = null;
        for (const chunk of chunks) {
          try {
            const row = vecIndexForMmr._db
              .prepare('SELECT embedding FROM chunks_vec WHERE chunk_id = ?')
              .get(chunk.chunk_id);
            if (row && row.embedding) {
              const emb = JSON.parse(row.embedding);
              if (Array.isArray(emb) && emb.length > 0) {
                bestChunk = { ...chunk, embedding: emb };
                break; // primeiro chunk com embedding serve
              }
            }
          } catch (e) {
            // tenta próximo chunk
          }
        }

        if (bestChunk) {
          mmrCandidates.push({
            id: bestChunk.chunk_id,
            segmentId: seg.id,
            content: bestChunk.content || seg.summary,
            score: seg.score,
            embedding: bestChunk.embedding,
          });
        } else {
          // Sem embedding disponível — entra com score puro (sem contribuição de diversidade)
          mmrCandidates.push({
            id: seg.id,
            segmentId: seg.id,
            content: seg.summary || seg.id,
            score: seg.score,
            embedding: null,
          });
        }
      } else {
        // Segmento BM25-only — sem embedding
        mmrCandidates.push({
          id: seg.id,
          segmentId: seg.id,
          content: seg.summary || seg.id,
          score: seg.score,
          embedding: null,
        });
      }
    }

    if (mmrCandidates.length > 0) {
      const mmrResults = reRank(queryEmbedding, mmrCandidates, {
        lambda: mmrLambda,
        topK: Math.min(topK, mmrCandidates.length),
      });

      // Reconstrói ordered list combinando MMR + os não processados
      const mmrOrderedIds = [];
      const mmrScoreMap = new Map();
      const mmrDiversityMap = new Map();

      for (const mr of mmrResults) {
        const mappedSegId = mr.segmentId || mr.id;
        if (!mmrOrderedIds.includes(mappedSegId)) {
          mmrOrderedIds.push(mappedSegId);
        }
        // Guarda o melhor MMR score para este segmento
        const existing = mmrScoreMap.get(mappedSegId);
        if (existing === undefined || mr.mmrScore > existing) {
          mmrScoreMap.set(mappedSegId, mr.mmrScore);
          mmrDiversityMap.set(mappedSegId, mr.diversityContribution);
        }
      }

      // Reordena os combined conforme MMR
      const mmrOrdered = [];
      const unmatched = [];

      for (const segId of mmrOrderedIds) {
        const seg = combined.find(s => s.id === segId);
        if (seg) {
          mmrOrdered.push({
            ...seg,
            score: Math.round((mmrScoreMap.get(segId) || seg.score) * 10000) / 10000,
            mmrScore: Math.round((mmrScoreMap.get(segId) || 0) * 10000) / 10000,
            diversityContribution: Math.round((mmrDiversityMap.get(segId) || 0) * 10000) / 10000,
            strategy: 'hybrid+mmr',
          });
        }
      }

      for (const seg of combined) {
        if (!mmrOrderedIds.includes(seg.id)) {
          unmatched.push(seg);
        }
      }

      // Limpa e re-popula combined com MMR order + unmatched
      combined.length = 0;
      combined.push(...mmrOrdered, ...unmatched);
      mmrApplied = true;
      log(`MMR aplicado: ${mmrOrdered.length} ordenados + ${unmatched.length} complementares`);
    }

    timing.mmr = Date.now() - t4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6: Final sort and truncation
  // ═══════════════════════════════════════════════════════════════════════════

  if (!mmrApplied) {
    // Re-sort por score (já deve estar ordenado, mas segurança)
    combined.sort((a, b) => b.score - a.score);
  }

  const topResults = combined.slice(0, topK);
  timing.total = Date.now() - startTime;

  // Fecha VectorIndex se ainda aberto
  if (timing._vecIndex && !mmrApplied) {
    try { timing._vecIndex.close(); } catch (e) { /* ok */ }
  }
  if (vecIndexForMmr) {
    try { vecIndexForMmr.close(); } catch (e) { /* ok */ }
  }
  delete timing._vecIndex;

  // Determina a estratégia usada
  let strategy;
  if (mmrApplied) {
    strategy = 'hybrid+mmr';
  } else if (useVector && vectorAvailable) {
    strategy = 'hybrid';
  } else if (useVector && !vectorAvailable) {
    strategy = 'bm25-fallback';
  } else {
    strategy = 'bm25-only';
  }

  log(`Estratégia: ${strategy}`);
  log(`Tempo total: ${timing.total}ms`);
  if (timing.bm25) log(`  BM25: ${timing.bm25}ms`);
  if (timing.vector) log(`  Vector: ${timing.vector}ms`);
  if (timing.combination) log(`  Combinação: ${timing.combination}ms`);
  if (timing.mmr) log(`  MMR: ${timing.mmr}ms`);
  if (timing.expansion) log(`  Expansion: ${timing.expansion}ms`);

  return {
    query,
    expandedQuery: useQueryExpansion && expandedQuery !== query ? expandedQuery : undefined,
    expansionTerms: useQueryExpansion && expansionTerms.length > 0 ? expansionTerms : undefined,
    totalMatches: combined.length,
    topK,
    results: topResults,
    strategy,
    timing: {
      total: timing.total,
      bm25: timing.bm25 || 0,
      vector: timing.vector || 0,
      combination: timing.combination || 0,
      mmr: timing.mmr || 0,
      expansion: timing.expansion || 0,
    },
  };
}

// ============================================================================
// CLI — Execução direta
// ============================================================================

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);

    // Pega query (primeiro argumento não-flag)
    const query = args.find(a => !a.startsWith('--')) || '';

    // Flags
    const topK = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] || '5', 10);
    const hybridAlpha = parseFloat(args.find(a => a.startsWith('--alpha='))?.split('=')[1] || '0.6');
    const useVector = !args.includes('--no-vector');
    const useMmr = args.includes('--mmr');
    const mmrLambda = parseFloat(args.find(a => a.startsWith('--mmr-lambda='))?.split('=')[1] || '0.5');
    const useQueryExpansion = args.includes('--expand');
    const expandStrategy = args.find(a => a.startsWith('--expand-strategy='))?.split('=')[1] || 'simple';
    const verbose = args.includes('--verbose') || args.includes('-v');
    const jsonFlag = args.includes('--json');

    if (!query) {
      console.log('Uso: node scripts/ssc-hybrid.cjs "query" [opções]');
      console.log('');
      console.log('Opções:');
      console.log('  --top=N                  Número de resultados (default: 5)');
      console.log('  --alpha=N                Peso BM25 (default: 0.6)');
      console.log('  --no-vector              Desativa busca vetorial');
      console.log('  --mmr                    Ativa MMR');
      console.log('  --mmr-lambda=N           Lambda do MMR (default: 0.5)');
      console.log('  --expand                 Ativa query expansion');
      console.log('  --expand-strategy=simple|llm  Estratégia de expansão (default: simple)');
      console.log('  --json                   Output JSON');
      console.log('  --verbose, -v            Log detalhado');
      process.exit(1);
    }

    try {
      const result = await hybridSearch(query, {
        topK,
        hybridAlpha,
        useVector,
        useMmr,
        mmrLambda,
        useQueryExpansion,
        expandStrategy,
        verbose,
      });

      if (jsonFlag) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const strategyEmoji = {
          'hybrid+mmr': '🔀',
          'hybrid': '🌀',
          'bm25-fallback': '⚠️',
          'bm25-only': '📄',
          'none': '❌',
        };

        console.log(`\n${strategyEmoji[result.strategy] || '❓'}  Hybrid Search Results`);
        console.log(`Query: '${result.query}'`);
        console.log(`Strategy: ${result.strategy}`);
        if (result.expandedQuery) {
          console.log(`Expanded: "${result.expandedQuery}"`);
        }
        console.log(`Matches: ${result.totalMatches} total, Top: ${result.results.length}`);
        console.log(`Timing: ${result.timing.total}ms total`);
        console.log('');

        for (const r of result.results) {
          const tierLabel = r.tier === 1 ? '[Seg]' : '[Daily]';
          console.log(`${tierLabel} ${r.id} — ${r.summary || '(sem resumo)'}`);
          console.log(`  Score: ${r.score}`);
          console.log(`    BM25: ${r.bm25Score} (norm: ${r.bm25Norm})`);
          if (r.strategy !== 'bm25-only') {
            console.log(`    Vec:  ${r.vecScore} (norm: ${r.vecNorm})`);
          }
          if (r.mmrScore !== undefined) {
            console.log(`    MMR:  ${r.mmrScore} (diversity: ${r.diversityContribution})`);
            console.log(`    Alpha: ${r.bm25Norm !== undefined && r.vecNorm !== undefined ? `${r.bm25Norm}×${hybridAlpha} + ${r.vecNorm}×${(1 - hybridAlpha).toFixed(1)}` : ''}`);
          }
          console.log(`  ${r.file}`);
          if (r.chunks && r.chunks.length > 0) {
            console.log(`  ${r.chunks.length} chunk(s) vetorial(is)`);
          }
          console.log('');
        }
      }
    } catch (err) {
      console.error(`[Hybrid] ❌ Erro: ${err.message}`);
      if (verbose) console.error(err);
      process.exit(1);
    }
  })();
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  hybridSearch,
  normalizeScores,
};
