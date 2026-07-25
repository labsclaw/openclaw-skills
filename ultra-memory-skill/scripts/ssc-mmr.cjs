/**
 * ssc-mmr.cjs — Maximum Marginal Relevance para o SSC Router
 *
 * Diversifica resultados de busca sem perder relevância.
 * Sem dependências externas — matemática pura.
 *
 * Uso:
 *   const mmr = require('./ssc-mmr.cjs');
 *   const resultados = mmr.reRank(queryEmb, candidates, { lambda: 0.5, topK: 5 });
 */

'use strict';

// ─── Utilitários de vetor ───────────────────────────────────────────────────

/** Soma os elementos de um vetor */
function vectorSum(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i];
  return s;
}

/**
 * Normaliza vetor in-place para norma L2 unitária.
 * Retorna o vetor original (modificado) ou array vazio se norma zero.
 */
function normalize(v) {
  if (!v || v.length === 0) return v;
  let mag = 0;
  for (let i = 0; i < v.length; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag === 0) return v; // vetor zero permanece zero
  for (let i = 0; i < v.length; i++) v[i] /= mag;
  return v;
}

/**
 * Similaridade de cosseno entre dois vetores.
 * Retorna 0 se qualquer vetor for zero ou tiver norma zero.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;

  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Distância Euclidiana entre dois vetores.
 */
function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ─── MMR ────────────────────────────────────────────────────────────────────

/**
 * Re-ordena candidatos usando Maximum Marginal Relevance.
 *
 * @param {number[]} queryEmbedding - Vetor da consulta
 * @param {Array<{id, content, score, embedding}>} candidates - Candidatos
 * @param {Object} [options]
 * @param {number} [options.lambda=0.5] - Tradeoff relevância vs diversidade.
 *   lambda=1 → pure relevance, lambda=0 → pure diversity
 * @param {number} [options.topK=5] - Máximo de resultados finais
 * @returns {Array<{id, content, originalScore, mmrScore, diversityContribution}>}
 */
function reRank(queryEmbedding, candidates, options = {}) {
  const lambda = options.lambda !== undefined ? options.lambda : 0.5;
  const topK = options.topK !== undefined ? options.topK : 5;

  // ── Edge cases ──────────────────────────────────────────────────────────
  if (!candidates || candidates.length === 0) return [];
  if (!queryEmbedding || queryEmbedding.length === 0) {
    // Sem query embedding, retorna os primeiros topK na ordem original
    return candidates.slice(0, Math.min(topK, candidates.length)).map(c => ({
      id: c.id,
      content: c.content,
      originalScore: c.score ?? 0,
      mmrScore: 0,
      diversityContribution: 0,
    }));
  }

  // ── Normalizar query embedding ─────────────────────────────────────────
  const q = normalize([...queryEmbedding]);

  // ── Preparar candidatos com embeddings normalizados ───────────────────
  const pool = candidates.map(c => {
    const emb = c.embedding ? normalize([...c.embedding]) : null;
    return {
      id: c.id,
      content: c.content,
      originalScore: c.score ?? 0,
      embedding: emb,
      simToQuery: emb ? cosineSimilarity(q, emb) : 0,
    };
  });

  // Se só tem 1 candidato ou topK >= pool, retorna ordenado por score original
  if (pool.length <= 1 || topK >= pool.length) {
    return pool
      .sort((a, b) => b.originalScore - a.originalScore)
      .slice(0, Math.min(topK, pool.length))
      .map(c => ({
        id: c.id,
        content: c.content,
        originalScore: c.originalScore,
        mmrScore: c.simToQuery,
        diversityContribution: 0,
      }));
  }

  // ── Algoritmo MMR ──────────────────────────────────────────────────────
  const selected = [];       // S — já selecionados (índices no pool)
  const remaining = [];      // C — ainda não selecionados
  const selectedSet = new Set();

  // Inicializar remaining com todos os índices
  for (let i = 0; i < pool.length; i++) remaining.push(i);

  // 1. Primeira escolha: item com maior similaridade à query
  let firstIdx = 0;
  let bestSim = -Infinity;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].simToQuery > bestSim) {
      bestSim = pool[i].simToQuery;
      firstIdx = i;
    }
  }

  selected.push(firstIdx);
  selectedSet.add(firstIdx);
  const firstIdxPos = remaining.indexOf(firstIdx);
  if (firstIdxPos !== -1) remaining.splice(firstIdxPos, 1);

  // 2. Iterar: escolher próximo que maximiza MMR
  while (selected.length < topK && remaining.length > 0) {
    let bestCandidateIdx = -1;
    let bestMMR = -Infinity;
    let bestDiversity = 0;

    for (let i = 0; i < remaining.length; i++) {
      const cIdx = remaining[i];
      const cand = pool[cIdx];

      // Se não tem embedding, só usa relevância (lambda=1 para este candidato)
      let maxSimToSelected = 0;
      if (cand.embedding) {
        maxSimToSelected = -Infinity;
        for (let j = 0; j < selected.length; j++) {
          const sIdx = selected[j];
          const sel = pool[sIdx];
          if (sel.embedding) {
            const sim = cosineSimilarity(cand.embedding, sel.embedding);
            if (sim > maxSimToSelected) maxSimToSelected = sim;
          }
        }
        // Se nenhum selected tem embedding, diversidade é 0
        if (maxSimToSelected === -Infinity) maxSimToSelected = 0;
      }

      const mmr = lambda * cand.simToQuery - (1 - lambda) * maxSimToSelected;
      const diversity = 1 - maxSimToSelected; // 1 = max diverse, 0 = min diverse

      if (mmr > bestMMR) {
        bestMMR = mmr;
        bestCandidateIdx = i;
        bestDiversity = diversity;
      }
    }

    if (bestCandidateIdx === -1) break; // segurança

    const cIdx = remaining[bestCandidateIdx];
    selected.push(cIdx);
    selectedSet.add(cIdx);
    remaining.splice(bestCandidateIdx, 1);

    // Guardar MMR score e diversidade no pool
    pool[cIdx]._mmrScore = bestMMR;
    pool[cIdx]._diversity = bestDiversity;
  }

  // ── Montar resultado na ordem de seleção ───────────────────────────────
  // O primeiro item selecionado não tem diversidade calculada pelo loop
  pool[selected[0]]._mmrScore = pool[selected[0]].simToQuery;
  pool[selected[0]]._diversity = 0;

  return selected.map(idx => ({
    id: pool[idx].id,
    content: pool[idx].content,
    originalScore: pool[idx].originalScore,
    mmrScore: pool[idx]._mmrScore ?? pool[idx].simToQuery,
    diversityContribution: pool[idx]._diversity ?? 0,
  }));
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  reRank,
  cosineSimilarity,
  euclideanDistance,
  normalize,
};
