#!/usr/bin/env node
/**
 * ssc-poq-vec.cjs — Prova de Conceito: Embedding + Vector Search no SSC
 *
 * Pipeline:
 *   1. Cria chunks de teste (3-5 frases sobre memória, agentes, infra)
 *   2. Gera embeddings via Google Gemini (gemini-embedding-2, 768 dim)
 *   3. Insere no índice vetorial (sqlite-vec via better-sqlite3)
 *   4. Faz query de busca semântica
 *   5. Exibe resultados ranqueados por similaridade
 *
 * Uso:
 *   node scripts/ssc-poq-vec.cjs
 */

const path = require('path');
const { EmbedProvider } = require('./ssc-embed-provider.cjs');
const { VectorIndex } = require('./ssc-vec-index.cjs');

// ================================================================
// 1. Dados de teste — chunks sobre memória, agentes e infra
// ================================================================
const TEST_CHUNKS = [
  {
    id: 'chunk-mem-001',
    segmentId: 'seg-memoria-esparsa',
    content: 'O SSC (Sparse Selective Cache) é um cache seletivo esparso ' +
      'que armazena apenas fragmentos relevantes da memória de longo prazo. ' +
      'Ele usa BM25 para ranqueamento lexical e agora suporta busca vetorial ' +
      'semântica via embeddings, permitindo encontrar informações ' +
      'conceitualmente relacionadas mesmo sem correspondência exata de palavras-chave.',
    tokens: 45,
  },
  {
    id: 'chunk-mem-002',
    segmentId: 'seg-memoria-esparsa',
    content: 'Memória de curto prazo em agentes de IA funciona como um buffer ' +
      'transiente que mantém o contexto imediato da conversa. O SSC atua como ' +
      'ponte entre a memória de curto prazo (working memory) e a memória de ' +
      'longo prazo (persistente em disco), selecionando os segmentos mais ' +
      'relevantes para o contexto atual.',
    tokens: 52,
  },
  {
    id: 'chunk-agentes-001',
    segmentId: 'seg-arquitetura-agentes',
    content: 'Agentes autônomos no ecossistema OpenClaw operam em camadas: ' +
      'CEO (estratégia e delegação), CTO (execução técnica), e CMO (marketing ' +
      'e conteúdo). Cada agente tem acesso ao SSC para consultar memórias ' +
      'passadas, decisões anteriores e aprendizados acumulados, garantindo ' +
      'continuidade entre sessões.',
    tokens: 48,
  },
  {
    id: 'chunk-infra-001',
    segmentId: 'seg-infraestrutura',
    content: 'A infraestrutura do OpenClaw roda sobre PM2 no Windows 11, ' +
      'com Node.js v26.1.0. O banco SQLite (better-sqlite3) armazena memórias, ' +
      'embeddings e metadados. O sqlite-vec adiciona busca vetorial kNN ' +
      'diretamente no SQLite, eliminando a necessidade de um banco vetorial ' +
      'separado como Pinecone ou Weaviate.',
    tokens: 55,
  },
  {
    id: 'chunk-infra-002',
    segmentId: 'seg-infraestrutura',
    content: 'Embeddings são gerados pelo modelo gemini-embedding-2 do Google, ' +
      'com 768 dimensões e suporte a outputDimensionality. O cache em memória ' +
      'evita re-embedding de textos idênticos. O batch embedding reduz ' +
      'latência em operações com múltiplos chunks.',
    tokens: 36,
  },
];

// ================================================================
// 2. Queries de teste
// ================================================================
const TEST_QUERIES = [
  'Como funciona o cache seletivo de memória?',
  'Arquitetura de agentes e delegação de tarefas',
  'Infraestrutura e banco de dados do sistema',
  'Embeddings e busca semântica',
];

// ================================================================
// 3. Main
// ================================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   SSC PoC — Embedding + Vector Search              ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // --- 3a. Provider de embeddings ---
  const embedder = new EmbedProvider();
  if (!embedder.apiKey) {
    console.error('\n❌ Nenhuma API key encontrada. Defina GEMINI_API_KEY ou GOOGLE_AI_STUDIO_KEY.');
    process.exit(1);
  }
  console.log(`\n📦 EmbedProvider: modelo=${embedder.model}, dimensão=${embedder.dimension}`);

  // --- 3b. Índice vetorial ---
  const idx = new VectorIndex();
  idx.connect();
  console.log(`📂 VectorIndex: ${idx.dbPath}`);

  // --- 3c. Gera embeddings e insere ---
  console.log(`\n🔢 Gerando embeddings para ${TEST_CHUNKS.length} chunks...`);
  console.time('⏱️  Embedding total');

  const texts = TEST_CHUNKS.map(c => c.content);
  const embeddings = await embedder.embedBatch(texts);

  console.timeEnd('⏱️  Embedding total');

  console.log(`\n📥 Inserindo ${TEST_CHUNKS.length} chunks no índice...`);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < TEST_CHUNKS.length; i++) {
    const chunk = TEST_CHUNKS[i];
    const emb = embeddings[i];

    if (!emb) {
      console.error(`  ❌ Embedding vazio para ${chunk.id}`);
      errors++;
      continue;
    }

    const result = idx.upsertChunk(chunk.id, chunk.segmentId, chunk.content, emb, {
      tokens: chunk.tokens,
    });

    if (result.inserted) {
      inserted++;
      console.log(`  ✅ ${chunk.id} (${chunk.segmentId}) — ${emb.length} dimensões`);
    } else {
      console.error(`  ❌ ${chunk.id}: ${result.error || 'fallha'}`);
      errors++;
    }
  }

  console.log(`\n📊 Resultado: ${inserted} inseridos, ${errors} erros`);
  console.log(`📊 Total no índice: ${idx.count()} chunks`);

  if (inserted === 0) {
    console.error('\n❌ Nenhum chunk inserido. Abortando.');
    idx.close();
    process.exit(1);
  }

  // --- 3d. Buscas semânticas ---
  console.log(`\n${'='.repeat(58)}`);
  console.log('🔍 BUSCAS SEMÂNTICAS');
  console.log(`${'='.repeat(58)}`);

  for (const query of TEST_QUERIES) {
    console.log(`\n📝 Query: "${query}"`);

    try {
      console.time('⏱️  Embed query');
      const queryEmb = await embedder.embed(query);
      console.timeEnd('⏱️  Embed query');

      console.time('⏱️  Search');
      const results = idx.search(queryEmb, 3);
      console.timeEnd('⏱️  Search');

      if (results.length === 0) {
        console.log('  (sem resultados)');
        continue;
      }

      console.log(`  Resultados (top ${results.length}):`);
      for (const r of results) {
        // Barra de similaridade visual
        const sim = r.cosineSimilarity;
        const barLen = Math.round(Math.abs(sim) * 20);
        const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);

        console.log(`\n  ┌─ ${r.chunk_id} [seg: ${r.segment_id}]`);
        console.log(`  │ 📊 Cosine sim: ${(sim * 100).toFixed(1)}%  ${bar}`);
        console.log(`  │ 📏 Distância L2: ${r.distance}`);
        console.log(`  │ 📄 ${r.content.substring(0, 120)}...`);
      }
    } catch (err) {
      console.error(`  ❌ Erro na query "${query}": ${err.message}`);
    }
  }

  // --- 3e. Estatísticas finais ---
  console.log(`\n${'='.repeat(58)}`);
  console.log('📊 ESTATÍSTICAS FINAIS');
  console.log(`${'='.repeat(58)}`);
  console.log(`  Chunks no índice: ${idx.count()}`);
  console.log(`  Cache embeddings: ${embedder.cacheStats().size} entradas`);

  // Verifica integridade: lista chunks no banco
  const dbChunks = idx._db.prepare(
    'SELECT id, segment_id, tokens, created_at FROM chunks ORDER BY created_at'
  ).all();
  console.log(`  Chunks no banco: ${dbChunks.length}`);
  for (const c of dbChunks) {
    console.log(`    • ${c.id} (${c.segment_id}) — ${c.tokens} tokens`);
  }

  // --- 3f. Limpeza ---
  console.log(`\n🧹 Limpando chunks de teste do índice...`);
  for (const chunk of TEST_CHUNKS) {
    idx.deleteChunk(chunk.id);
  }
  console.log(`  Removidos: ${TEST_CHUNKS.length} chunks`);

  idx.close();
  console.log(`\n✅ PoC concluída com sucesso!`);
}

main().catch((err) => {
  console.error(`\n❌ Erro fatal: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
