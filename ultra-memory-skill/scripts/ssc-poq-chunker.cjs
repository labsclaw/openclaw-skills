// ssc-poq-chunker.cjs — Prova de Conceito do Módulo de Chunking SSC
//
// Lê 2-3 segments reais de memory/segments/, chunkeriza,
// exibe estatísticas, e salva resultado sample em memory/tmp/chunker-sample.json.

'use strict';

const path = require('path');
const fs = require('fs');
const { chunkMarkdown, chunkAllSegments } = require('./ssc-chunker.cjs');

// ---------------------------------------------------------------------------
// Utilitários de formatação
// ---------------------------------------------------------------------------

function pad(n, w) {
  return String(n).padStart(w, ' ');
}

function bar(value, max, width = 30) {
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

// ---------------------------------------------------------------------------
// PoC principal
// ---------------------------------------------------------------------------

const MEMORY_DIR = path.resolve(__dirname, '..', 'memory');

console.log('══════════════════════════════════════════════════════════════');
console.log('  SSC Chunker — Prova de Conceito');
console.log('══════════════════════════════════════════════════════════════');
console.log();
console.log(`  Diretório: ${MEMORY_DIR}/segments/`);
console.log();

// ─── 1. Chunkeriza todos os segments ────────────────────────────────────

console.log('─── Chunkerizando todos os segments ─────────────────────────');
console.log();

const allChunks = chunkAllSegments(MEMORY_DIR);

console.log();
console.log(`  Total de chunks: ${allChunks.length}`);

if (allChunks.length > 0) {
  const tokensArr = allChunks.map((c) => c.tokens);
  const avgTokens = tokensArr.reduce((a, b) => a + b, 0) / tokensArr.length;
  const maxTokens = Math.max(...tokensArr);
  const minTokens = Math.min(...tokensArr);

  console.log(`  Média de tokens : ${avgTokens.toFixed(1)}`);
  console.log(`  Maior chunk     : ${maxTokens} tokens`);
  console.log(`  Menor chunk     : ${minTokens} tokens`);
  console.log();

  // Distribuição
  const buckets = [0, 100, 200, 300, 400, 500, Infinity];
  const labels = ['0-100', '101-200', '201-300', '301-400', '401-500', '500+'];
  const counts = new Array(buckets.length - 1).fill(0);

  for (const t of tokensArr) {
    for (let i = 0; i < buckets.length - 1; i++) {
      if (t > buckets[i] && t <= buckets[i + 1]) {
        counts[i]++;
        break;
      }
    }
  }

  console.log('  Distribuição de tamanho de chunks:');
  const maxCount = Math.max(...counts, 1);
  for (let i = 0; i < labels.length; i++) {
    const pct = ((counts[i] / allChunks.length) * 100).toFixed(1);
    console.log(`    ${pad(labels[i], 8)} │${bar(counts[i], maxCount, 25)}│ ${pad(counts[i], 3)} (${pct}%)`);
  }
}

console.log();
console.log('─── Amostra de chunks ────────────────────────────────────────');
console.log();

// Mostra alguns chunks de exemplo (primeiros 5 + alguns aleatórios)
const sampleIndices = [];
if (allChunks.length <= 5) {
  for (let i = 0; i < allChunks.length; i++) sampleIndices.push(i);
} else {
  sampleIndices.push(0, 1, 2);
  const mid = Math.floor(allChunks.length / 2);
  if (mid > 2 && mid < allChunks.length - 1) sampleIndices.push(mid);
  sampleIndices.push(allChunks.length - 1);
}

for (const idx of [...new Set(sampleIndices)].sort((a, b) => a - b)) {
  const c = allChunks[idx];
  const preview = c.content.length > 120
    ? c.content.substring(0, 120) + '...'
    : c.content;

  console.log(`  [${String(idx).padStart(3, ' ')}] id="${c.id}" tok=${String(c.tokens).padStart(3, ' ')} h="${c.header || '(sem header)'}"`);
  console.log(`       "${preview}"`);
  console.log();
}

// ─── 2. Edge case: arquivo vazio ────────────────────────────────────────

console.log('─── Edge case: conteúdo vazio ───────────────────────────────');
const emptyResult = chunkMarkdown('', { segmentId: 'empty' });
console.log(`  chunkMarkdown('') → ${JSON.stringify(emptyResult)}`);
console.log();

// ─── 3. Edge case: sem headers ──────────────────────────────────────────

console.log('─── Edge case: sem headers ──────────────────────────────────');
const noHeaderContent = [
  'Este é um texto markdown sem headers.',
  '',
  'Apenas parágrafos soltos. Deve ser chunkerizado como texto plano.',
  '',
  'Terceiro parágrafo para testar a divisão.',
].join('\n');
const noHeaderResult = chunkMarkdown(noHeaderContent, {
  maxTokens: 30, // forçando quebra
  segmentId: 'noheader',
});
console.log(`  Conteúdo: "${noHeaderContent.replace(/\n/g, '\\n')}"`);
console.log(`  Resultado: ${JSON.stringify(noHeaderResult, null, 2)}`);
console.log();

// ─── 4. Edge case: section única > maxTokens (quebra por parágrafo) ─────

console.log('─── Edge case: section > maxTokens (quebra por parágrafo) ────');
const longSection = [
  '# Seção Grande',
  '',
  'Primeiro parágrafo. '.repeat(100),
  '',
  'Segundo parágrafo. '.repeat(100),
  '',
  'Terceiro parágrafo. '.repeat(100),
].join('\n');
const longResult = chunkMarkdown(longSection, {
  maxTokens: 100,
  segmentId: 'long',
});
console.log(`  Total chunks: ${longResult.length}`);
longResult.forEach((c, i) => {
  const preview = c.content.length > 80
    ? c.content.substring(0, 80) + '...'
    : c.content;
  console.log(`  [${i}] id="${c.id}" tok=${c.tokens} "${preview}"`);
});
console.log();

// ─── 5. Verificação de overlap ──────────────────────────────────────────

console.log('─── Verificação de overlap ───────────────────────────────────');
if (longResult.length >= 2) {
  const c0 = longResult[0];
  const c1 = longResult[1];
  const overlapInChunk1 = c0.content.slice(-80);
  const startOfChunk2 = c1.content.slice(0, 80);
  console.log(`  Fim do chunk 0: "...${overlapInChunk1}"`);
  console.log(`  Início do chunk 1: "${startOfChunk2}..."`);
  const hasOverlap = c1.content.includes(c0.content.slice(-40));
  console.log(`  Overlap detectado: ${hasOverlap ? '✅ SIM' : '❌ NÃO'}`);
}
console.log();

// ─── 6. Salva sample ────────────────────────────────────────────────────

const SAMPLE_PATH = path.resolve(MEMORY_DIR, 'tmp', 'chunker-sample.json');
const sample = {
  generatedAt: new Date().toISOString(),
  config: { maxTokens: 500, overlapTokens: 50 },
  stats: {
    totalChunks: allChunks.length,
    avgTokens: allChunks.length > 0
      ? (allChunks.reduce((s, c) => s + c.tokens, 0) / allChunks.length).toFixed(1)
      : 0,
    maxTokens: allChunks.length > 0 ? Math.max(...allChunks.map((c) => c.tokens)) : 0,
    minTokens: allChunks.length > 0 ? Math.min(...allChunks.map((c) => c.tokens)) : 0,
  },
  // Salva apenas primeiros 20 chunks + estatísticas completas
  chunkSample: allChunks.slice(0, 20).map((c) => ({
    id: c.id,
    segmentId: c.segmentId,
    tokens: c.tokens,
    header: c.header,
    contentPreview: c.content.length > 200
      ? c.content.substring(0, 200) + '...'
      : c.content,
  })),
  totalChunksGenerated: allChunks.length,
};

fs.writeFileSync(SAMPLE_PATH, JSON.stringify(sample, null, 2), 'utf-8');
console.log(`  Sample salvo em: ${SAMPLE_PATH}`);
console.log();

// ─── Resumo final ───────────────────────────────────────────────────────

console.log('══════════════════════════════════════════════════════════════');
console.log('  PoC concluída com sucesso!');
console.log('══════════════════════════════════════════════════════════════');
