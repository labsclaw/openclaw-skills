#!/usr/bin/env node
/**
 * ssc-poq-hybrid.cjs — PoC: Comparação de Estratégias de Busca Híbrida
 *
 * Indexa 5 segments reais e executa 4 queries com diferentes combinações
 * de flags, comparando resultados e tempo de execução.
 *
 * Estratégias testadas:
 *   1. BM25 only           (useVector=false)
 *   2. Vector only          (hybridAlpha=0, useVector=true)
 *   3. Hybrid balanced      (hybridAlpha=0.6)
 *   4. Hybrid+MMR+Expand    (tudo ligado)
 *
 * Uso:
 *   node scripts/ssc-poq-hybrid.cjs
 *
 * Flags:
 *   --rebuild   Força recriação do índice vetorial
 *   --verbose   Log detalhado
 *
 * @module ssc-poq-hybrid
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { hybridSearch } = require('./ssc-hybrid.cjs');
const { EmbedProvider } = require('./ssc-embed-provider.cjs');
const { VectorIndex } = require('./ssc-vec-index.cjs');
const { chunkMarkdown } = require('./ssc-chunker.cjs');

// ============================================================================
// Configuração
// ============================================================================

const WORKSPACE_DIR = path.resolve(__dirname, '..');
const MEMORY_DIR = path.join(WORKSPACE_DIR, 'memory');
const SEGMENTS_DIR = path.join(MEMORY_DIR, 'segments');

// Segments a indexar (5 obrigatórios + extras)
const TARGET_SEGMENTS = [
  's001-infra',
  's006-ssc-memory-v4',
  's012-social-media',
  's004-skills',
  's008-finance',
];

// Queries de teste
const QUERIES = [
  { label: 'Infra cloud deploy', text: 'infra cloud deploy' },
  { label: 'Memory cache search', text: 'memory cache search' },
  { label: 'Social media content', text: 'social media content' },
  { label: 'System architecture design', text: 'system architecture design' },
];

// Estratégias
const STRATEGIES = [
  {
    id: 'BM25 Only',
    label: 'BM25 Only',
    options: { useVector: false, useMmr: false, useQueryExpansion: false },
  },
  {
    id: 'Vector Only',
    label: 'Vector Only',
    options: { useVector: true, useMmr: false, useQueryExpansion: false, hybridAlpha: 0 },
  },
  {
    id: 'Hybrid Balanced',
    label: 'Hybrid Balanced (α=0.6)',
    options: { useVector: true, useMmr: false, useQueryExpansion: false, hybridAlpha: 0.6 },
  },
  {
    id: 'Hybrid+MMR+Expand',
    label: 'Hybrid+MMR+Expand',
    options: { useVector: true, useMmr: true, useQueryExpansion: true, hybridAlpha: 0.6, mmrLambda: 0.5 },
  },
];

// ============================================================================
// Utilitários
// ============================================================================

function padRight(str, len) {
  const s = String(str);
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function formatTime(ms) {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Setup do Índice Vetorial
// ============================================================================

/**
 * Verifica se o VectorIndex tem dados. Se vazio, populam os chunks dos
 * 5 segments alvo com embeddings.
 *
 * @param {boolean} forceRebuild — Se true, recria do zero
 */
async function ensureVectorIndex(forceRebuild = false) {
  const vecIndex = new VectorIndex();
  vecIndex.connect();

  const existingCount = vecIndex.count();

  if (!forceRebuild && existingCount > 0) {
    console.log(`  ✓ VectorIndex já tem ${existingCount} chunks indexados`);
    vecIndex.close();
    return;
  }

  if (forceRebuild) {
    console.log('  ♻️  Forçando recriação do VectorIndex...');
    // Apaga chunks existentes
    const db = vecIndex._db;
    db.exec('DELETE FROM chunks_vec');
    db.exec('DELETE FROM chunks');
  }

  // Verifica API key
  const embedder = new EmbedProvider();
  if (!embedder.apiKey) {
    console.log('  ⚠️  GEMINI_API_KEY não definida.');
    console.log('  Será usado BM25 puro como fallback nas queries.');
    console.log('  Defina GEMINI_API_KEY ou GOOGLE_AI_STUDIO_KEY para ativar busca vetorial.');
    vecIndex.close();
    return;
  }

  // Indexa os segments
  let totalChunks = 0;
  let totalTime = 0;

  for (const segId of TARGET_SEGMENTS) {
    const filePath = path.join(SEGMENTS_DIR, `${segId}.md`);

    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  Segmento não encontrado: ${segId}.md — pulando`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const chunks = chunkMarkdown(content, { segmentId: segId, maxTokens: 500, overlapTokens: 50 });

    console.log(`  ${segId}: ${chunks.length} chunks gerados`);

    if (chunks.length === 0) continue;

    // Embeddings em batch (mais rápido que individual)
    const texts = chunks.map(c => c.content);
    const t0 = Date.now();

    try {
      const embeddings = await embedder.embedBatch(texts, 16);

      if (embeddings.length !== texts.length) {
        console.log(`    ⚠️  Embeddings retornaram ${embeddings.length} de ${texts.length}`);
        continue;
      }

      const elapsed = Date.now() - t0;
      totalTime += elapsed;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const emb = embeddings[i];

        if (!emb || emb.length === 0) continue;

        vecIndex.upsertChunk(chunk.id, segId, chunk.content, emb, {
          tokens: chunk.tokens,
        });
      }

      totalChunks += chunks.length;
      console.log(`    Embeddings: ${chunks.length} chunks em ${formatTime(elapsed)}`);
    } catch (err) {
      console.log(`    ❌ Erro nos embeddings: ${err.message}`);
    }
  }

  console.log(`\n  ✓ VectorIndex populado: ${totalChunks} chunks em ${formatTime(totalTime)}`);
  vecIndex.close();
}

// ============================================================================
// Execução de Estratégias
// ============================================================================

/**
 * Executa todas as estratégias para uma query e retorna resultados
 * comparativos.
 */
async function runStrategies(query, queryLabel) {
  const results = [];

  for (const strategy of STRATEGIES) {
    const t0 = Date.now();

    try {
      const result = await hybridSearch(query, {
        topK: 5,
        verbose: false,
        ...strategy.options,
      });

      const elapsed = Date.now() - t0;

      results.push({
        strategyId: strategy.id,
        strategyLabel: strategy.label,
        elapsed,
        matched: result.totalMatches,
        topIds: result.results.map(r => r.id),
        topScores: result.results.map(r => r.score),
        strategy: result.strategy,
        timing: result.timing,
        raw: result,
      });
    } catch (err) {
      results.push({
        strategyId: strategy.id,
        strategyLabel: strategy.label,
        elapsed: Date.now() - t0,
        matched: 0,
        topIds: [],
        topScores: [],
        error: err.message,
      });
    }
  }

  return results;
}

// ============================================================================
// Relatório
// ============================================================================

function printHeader() {
  console.log('');
  console.log('='.repeat(80));
  console.log('  🔬 SSC Hybrid Search — Prova de Conceito');
  console.log('='.repeat(80));
  console.log('');
}

function printSetupInfo() {
  const embedder = new EmbedProvider();
  const hasApiKey = !!embedder.apiKey;

  console.log('📋 Configuração:');
  console.log(`  Segmentos alvo: ${TARGET_SEGMENTS.join(', ')}`);
  console.log(`  API Key: ${hasApiKey ? '✅ Configurada' : '❌ Não configurada (vector indisponível)'}`);
  console.log(`  Queries: ${QUERIES.length}`);
  console.log(`  Estratégias: ${STRATEGIES.length}`);
  console.log('');
}

function printStrategyResults(queryLabel, results) {
  console.log(`\n  ┌─ Query: "${queryLabel}"`);
  console.log(`  │`);

  for (const r of results) {
    const timeStr = formatTime(r.elapsed);
    const statusIcon = r.error ? '❌' : '✅';
    const matchStr = `${r.matched} matched → [${r.topIds.join(', ')}]`;

    // Destaques visuais para hits corretos
    const scoresStr = r.topScores.length > 0
      ? r.topScores.map(s => s.toFixed(4)).join(', ')
      : '-';

    console.log(`  ├─ ${statusIcon} ${padRight(r.strategyLabel, 28)} ${padRight(timeStr, 8)} ${matchStr}`);
    if (r.error) {
      console.log(`  │  ⚠️  ${r.error}`);
    }
    console.log(`  │    Scores: [${scoresStr}]`);
    if (r.timing) {
      const parts = [];
      if (r.timing.expansion > 0) parts.push(`expand:${formatTime(r.timing.expansion)}`);
      if (r.timing.bm25 > 0) parts.push(`bm25:${formatTime(r.timing.bm25)}`);
      if (r.timing.vector > 0) parts.push(`vector:${formatTime(r.timing.vector)}`);
      if (r.timing.mmr > 0) parts.push(`mmr:${formatTime(r.timing.mmr)}`);
      if (r.timing.combination > 0) parts.push(`comb:${formatTime(r.timing.combination)}`);
      if (parts.length > 0) {
        console.log(`  │    Breakdown: ${parts.join(', ')}`);
      }
    }
    console.log(`  │`);
  }
  console.log(`  └─`);
}

function printSummaryTable(allResults) {
  console.log('\n' + '='.repeat(80));
  console.log('📊  TABELA COMPARATIVA');
  console.log('='.repeat(80));

  // Cabeçalho
  const colQuery = 28;
  const colStrat = 24;
  const colTime = 9;
  const colMatches = 8;
  const colResults = 35;

  const hdr = `  ${padRight('Query', colQuery)} ${padRight('Estratégia', colStrat)} ${padRight('Tempo', colTime)} ${padRight('Matches', colMatches)} ${padRight('Top Resultados', colResults)}`;
  console.log(`  ${'─'.repeat(hdr.length)}`);
  console.log(hdr);
  console.log(`  ${'─'.repeat(hdr.length)}`);

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const queryLabel = QUERIES[qi].label;
    const results = allResults[qi];

    for (let si = 0; si < results.length; si++) {
      const r = results[si];
      const label = qi === 0 ? queryLabel : '';
      const timeStr = formatTime(r.elapsed);
      const matchStr = `${r.matched}`;

      // Mostra os top 2 IDs + "..." se mais
      const topPreview = r.topIds.slice(0, 2).join(', ') + (r.topIds.length > 2 ? ', ...' : '');

      const statusIcon = r.error ? '❌' : '✅';
      const line = `  ${padRight(label, colQuery)} ${padRight(statusIcon + ' ' + r.strategyLabel, colStrat)} ${padRight(timeStr, colTime)} ${padRight(matchStr, colMatches)} ${padRight(topPreview, colResults)}`;
      console.log(line);
    }

    if (qi < QUERIES.length - 1) {
      console.log(`  ${'·'.repeat(hdr.length)}`);
    }
  }

  console.log(`  ${'─'.repeat(hdr.length)}`);
}

function printTimingComparison(allResults) {
  console.log('\n📈  COMPARAÇÃO DE TEMPO');
  console.log('');

  const colQuery = 28;
  const colTotal = 12;

  // Cabeçalho da tabela de tempos
  const stratLabels = STRATEGIES.map(s => padRight(s.id.split(' ')[0], 14));
  const hdr = `  ${padRight('Query', colQuery)} ${stratLabels.join(' ')} ${padRight('Total Médio', colTotal)}`;
  console.log(`  ${'─'.repeat(hdr.length)}`);
  console.log(hdr);
  console.log(`  ${'─'.repeat(hdr.length)}`);

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const queryLabel = QUERIES[qi].label;
    const results = allResults[qi];

    const times = results.map(r => {
      const t = r.elapsed;
      if (t < 1) return '<1ms';
      if (t < 1000) return `${t.toFixed(0)}ms`.padStart(6);
      return `${(t / 1000).toFixed(1)}s`.padStart(6);
    });

    const avgTime = results.reduce((s, r) => s + r.elapsed, 0) / results.length;
    const avgStr = formatTime(avgTime).padStart(8);

    console.log(`  ${padRight(queryLabel, colQuery)} ${times.map(t => padRight(t, 14)).join('')} ${avgStr}`);
  }

  console.log(`  ${'─'.repeat(hdr.length)}`);
}

function printVerdict(allResults) {
  console.log('\n📋  VEREDITO');
  console.log('');

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const queryLabel = QUERIES[qi].label;
    const results = allResults[qi];

    // Acha qual estratégia deu o melhor resultado (mais matches ou maior score)
    const best = results.reduce((best, r) => {
      const bestScore = best.topScores[0] || 0;
      const rScore = r.topScores[0] || 0;
      return rScore > bestScore ? r : best;
    }, results[0]);

    // Acha a mais rápida
    const fastest = results.reduce((f, r) => r.elapsed < f.elapsed ? r : f, results[0]);

    // A que deu mais resultados
    const mostMatches = results.reduce((m, r) => r.matched > m.matched ? r : m, results[0]);

    console.log(`  Query "${queryLabel}":`);
    console.log(`    🏆 Melhor score: ${best.strategyLabel} (${(best.topScores[0] || 0).toFixed(4)})`);
    console.log(`    ⚡ Mais rápida:   ${fastest.strategyLabel} (${formatTime(fastest.elapsed)})`);
    console.log(`    📦 Mais matches: ${mostMatches.strategyLabel} (${mostMatches.matched})`);
    console.log('');
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const forceRebuild = args.includes('--rebuild');
  const verbose = args.includes('--verbose');

  printHeader();
  printSetupInfo();

  // 1. Setup do VectorIndex
  console.log('🔧 Preparando índice vetorial...');
  await ensureVectorIndex(forceRebuild);
  console.log('');

  // 2. Executa as queries
  console.log('🚀 Executando estratégias...');
  const allResults = [];

  for (let qi = 0; qi < QUERIES.length; qi++) {
    const { label, text } = QUERIES[qi];
    if (verbose) {
      console.log(`\n  ── Query ${qi + 1}/${QUERIES.length}: "${label}"`);
    }

    const results = await runStrategies(text, label);
    allResults.push(results);

    if (verbose) {
      printStrategyResults(label, results);
    } else {
      const statuses = results.map(r => r.error ? '❌' : '✅').join(' ');
      const times = results.map(r => formatTime(r.elapsed)).join(', ');
      console.log(`  [${qi + 1}/${QUERIES.length}] "${label}" → ${statuses} (${times})`);
    }
  }

  // 3. Relatórios
  console.log('\n');
  printSummaryTable(allResults);
  printTimingComparison(allResults);
  printVerdict(allResults);

  // 4. Resumo final
  console.log('\n' + '='.repeat(80));
  console.log('  ✅ PoC concluída!');
  console.log('');

  // Estatísticas agregadas
  const totalTime = allResults.flat().reduce((s, r) => s + r.elapsed, 0);
  const totalQueries = allResults.flat().length;
  const totalErrors = allResults.flat().filter(r => r.error).length;

  console.log(`  Total de execuções: ${totalQueries}`);
  console.log(`  Erros: ${totalErrors}`);
  console.log(`  Tempo total: ${formatTime(totalTime)}`);
  console.log(`  Média por query: ${formatTime(totalTime / totalQueries)}`);
  console.log('');
}

main().catch(err => {
  console.error('\n❌ PoC falhou:', err.message);
  if (process.argv.includes('--verbose')) {
    console.error(err);
  }
  process.exit(1);
});
