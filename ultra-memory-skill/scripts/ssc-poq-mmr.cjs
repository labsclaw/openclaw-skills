#!/usr/bin/env node

/**
 * ssc-poq-mmr.cjs — PoC do MMR (Maximum Marginal Relevance)
 *
 * Demonstra como MMR diversifica resultados comparado com ranking
 * por similaridade pura.
 *
 * Cenário: query sobre "inteligência artificial" com 9 candidatos
 * que variam em relevância e tópico.
 *
 * Uso: node scripts/ssc-poq-mmr.cjs
 */

'use strict';

const { reRank, cosineSimilarity } = require('./ssc-mmr.cjs');

// ─── Dados sintéticos ───────────────────────────────────────────────────────

// Query embedding (768d reduzido a 4d pra clareza visual)
const QUERY_EMB = [0.95, 0.20, 0.10, 0.05];

// 9 candidatos com diferentes graus de similaridade à query e entre si
const CANDIDATES = [
  {
    id: 'doc1',
    content: 'IA: Redes Neurais Profundas explicadas',
    score: 0.95,
    embedding: [0.90, 0.30, 0.15, 0.05],
  },
  {
    id: 'doc2',
    content: 'Transformers e mecanismos de atenção em NLP',
    score: 0.92,
    embedding: [0.88, 0.25, 0.20, 0.08],
  },
  {
    id: 'doc3',
    content: 'Deep Learning com PyTorch — tutorial prático',
    score: 0.88,
    embedding: [0.85, 0.35, 0.10, 0.02],
  },
  {
    id: 'doc4',
    content: 'História da inteligência artificial desde 1956',
    score: 0.75,
    embedding: [0.70, 0.10, 0.05, 0.80],
  },
  {
    id: 'doc5',
    content: 'Ética em IA: vieses algorítmicos e fairness',
    score: 0.70,
    embedding: [0.60, 0.05, 0.70, 0.50],
  },
  {
    id: 'doc6',
    content: 'Regulamentação de IA na União Europeia (AI Act)',
    score: 0.65,
    embedding: [0.55, 0.02, 0.80, 0.60],
  },
  {
    id: 'doc7',
    content: 'Otimização de hiperparâmetros com Optuna',
    score: 0.82,
    embedding: [0.80, 0.50, 0.10, 0.03],
  },
  {
    id: 'doc8',
    content: 'Modelos de linguagem: GPT, Claude, LLaMA comparados',
    score: 0.90,
    embedding: [0.92, 0.22, 0.18, 0.06],
  },
  {
    id: 'doc9',
    content: 'Visão computacional com CNNs e YOLO',
    score: 0.78,
    embedding: [0.75, 0.60, 0.05, 0.04],
  },
];

// ─── Helpers de visualização ────────────────────────────────────────────────

function pad(s, len) {
  const str = String(s);
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function simToQuery(emb) {
  return cosineSimilarity(QUERY_EMB, emb).toFixed(4);
}

function printTabela(titulo, resultados) {
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  ${titulo}`);
  console.log(`${'═'.repeat(78)}`);
  console.log(
    `  ${pad('Ordem', 6)} ${pad('ID', 6)} ${pad('Score Orig.', 12)} ` +
    `${pad('Sim.Query', 10)} ${pad('MMR Score', 10)} ${pad('Diversid.', 10)} Conteúdo`
  );
  console.log(`  ${'─'.repeat(76)}`);

  resultados.forEach((r, i) => {
    const sim = cosineSimilarity(QUERY_EMB, CANDIDATES.find(c => c.id === r.id)?.embedding || []).toFixed(4);
    console.log(
      `  ${pad(i + 1, 6)} ${pad(r.id, 6)} ${pad(r.originalScore.toFixed(4), 12)} ` +
      `${pad(sim, 10)} ${pad(r.mmrScore.toFixed(4), 10)} ${pad(r.diversityContribution.toFixed(4), 10)} ${r.content}`
    );
  });

  // Mostrar grupos temáticos
  const temas = resultados.map(r => {
    const id = r.id;
    if (['doc1', 'doc2', 'doc3', 'doc7', 'doc8'].includes(id)) return '🧠 Técnico';
    if (['doc4'].includes(id)) return '📜 História';
    if (['doc5', 'doc6'].includes(id)) return '⚖️ Ética/Regulação';
    if (['doc9'].includes(id)) return '👁️ Visão';
    return '❓';
  });
  console.log(`  ${'─'.repeat(76)}`);
  console.log(`  Temas: ${temas.join(' → ')}`);
  console.log(`  Temas únicos: ${new Set(temas).size} de ${temas.length} resultados`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log(`\n  🧪 PoC — Maximum Marginal Relevance (MMR)`);
  console.log(`  ${'─'.repeat(50)}`);
  console.log(`  Query embedding: [${QUERY_EMB.join(', ')}]`);
  console.log(`  Candidatos: ${CANDIDATES.length} docs`);

  // Análise prévia: similaridade de cada candidato com a query
  console.log(`\n  📊 Similaridade individual com a query:`);
  CANDIDATES.forEach(c => {
    const sim = simToQuery(c.embedding);
    const match = parseFloat(sim) >= 0.85 ? '✅' : parseFloat(sim) >= 0.60 ? '🔶' : '🔴';
    console.log(`     ${match} ${pad(c.id, 6)} sim=${sim}  "${c.content}"`);
  });

  // ── 1. Ranking por similaridade pura (lambda=1.0) ──────────────────────
  const rankingPuro = reRank(QUERY_EMB, CANDIDATES, { lambda: 1.0, topK: 5 });
  printTabela('RANKING PURO (lambda=1.0) — sem diversificação', rankingPuro);

  // ── 2. MMR balanceado (lambda=0.5) ─────────────────────────────────────
  const rankingMMR = reRank(QUERY_EMB, CANDIDATES, { lambda: 0.5, topK: 5 });
  printTabela('MMR BALANCEADO (lambda=0.5) — relevância + diversidade', rankingMMR);

  // ── 3. Diversidade pura (lambda=0.0) ───────────────────────────────────
  const rankingDiverso = reRank(QUERY_EMB, CANDIDATES, { lambda: 0.0, topK: 5 });
  printTabela('DIVERSIDADE PURA (lambda=0.0) — só diversidade', rankingDiverso);

  // ── Comparação final ───────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  🔬 COMPARAÇÃO DIRETA`);
  console.log(`${'═'.repeat(78)}`);

  const idsPuro = rankingPuro.map(r => r.id);
  const idsMMR = rankingMMR.map(r => r.id);

  console.log(`\n  Ranking puro (lambda=1):   ${idsPuro.join(' → ')}`);
  console.log(`  MMR balanceado (lambda=0.5): ${idsMMR.join(' → ')}`);

  // Docs que entraram no MMR mas não no puro
  const novos = idsMMR.filter(id => !idsPuro.includes(id));
  // Docs que saíram no MMR
  // const removidos = idsPuro.filter(id => !idsMMR.includes(id));

  if (novos.length > 0) {
    console.log(`\n  ✅ MMR diversificou! Incluiu: ${novos.join(', ')}`);
    novos.forEach(id => {
      const c = CANDIDATES.find(x => x.id === id);
      console.log(`     → "${c.content}" (score original: ${c.score})`);
    });
  }

  if (novos.length === 0) {
    console.log(`\n  ℹ️  Mesmos documentos, mas ordem pode ter mudado.`);
  }

  // Contar temas únicos em cada ranking
  function contarTemas(ranking) {
    const temas = ranking.map(r => {
      const id = r.id;
      if (['doc1', 'doc2', 'doc3', 'doc7', 'doc8'].includes(id)) return 'Técnico';
      if (['doc4'].includes(id)) return 'História';
      if (['doc5', 'doc6'].includes(id)) return 'Ética';
      if (['doc9'].includes(id)) return 'Visão';
      return '?';
    });
    return new Set(temas).size;
  }

  const temasPuro = contarTemas(rankingPuro);
  const temasMMR = contarTemas(rankingMMR);

  console.log(`\n  📊 Cobertura temática:`);
  console.log(`     Ranking puro: ${temasPuro} tema(s)`);
  console.log(`     MMR:          ${temasMMR} tema(s)`);
  if (temasMMR > temasPuro) {
    console.log(`  ✅ MMR cobre mais tópicos distintos!`);
  }

  // ── Edge cases ──────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  🧪 EDGE CASES`);
  console.log(`${'═'.repeat(78)}`);

  // Edge 1: menos candidatos que topK
  const edge1 = reRank(QUERY_EMB, CANDIDATES.slice(0, 2), { lambda: 0.5, topK: 5 });
  console.log(`\n  Edge 1 — menos candidatos (2) que topK (5): ${edge1.length} resultado(s) ✓`);

  // Edge 2: zero candidatos
  const edge2 = reRank(QUERY_EMB, [], { lambda: 0.5, topK: 5 });
  console.log(`  Edge 2 — zero candidatos: ${edge2.length} resultado(s) ✓`);

  // Edge 3: embedding vazio
  const edge3 = reRank([], CANDIDATES.slice(0, 3), { lambda: 0.5, topK: 3 });
  console.log(`  Edge 3 — query embedding vazio: ${edge3.length} resultado(s), sem crash ✓`);

  // Edge 4: candidatos sem embedding
  const candSemEmb = CANDIDATES.slice(0, 3).map(c => ({ ...c, embedding: null }));
  const edge4 = reRank(QUERY_EMB, candSemEmb, { lambda: 0.5, topK: 3 });
  console.log(`  Edge 4 — candidatos sem embedding: ${edge4.length} resultado(s) ✓`);

  console.log(`\n  ✅ PoC concluída com sucesso!\n`);
}

main();
