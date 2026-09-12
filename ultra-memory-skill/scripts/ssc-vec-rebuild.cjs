#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { EmbedProvider } = require('./ssc-embed-provider.cjs');
const { VectorIndex } = require('./ssc-vec-index.cjs');
const { chunkMarkdown } = require('./ssc-chunker.cjs');
const { buildCorpusManifest, resolveSegmentPath, writeVectorManifest } = require('./ssc-vector-manifest.cjs');

const ROOT = path.resolve(process.env.OPENCLAW_WORKSPACE || path.join(__dirname, '..'));
const INDEX_PATH = path.join(ROOT, 'memory', 'index.json');

const CHUNK_CONFIG = Object.freeze({ maxTokens: 500, overlapTokens: 50 });

function loadCorpus() {
  const raw = fs.readFileSync(INDEX_PATH, 'utf8');
  const index = JSON.parse(raw);
  const chunks = [];
  for (const segment of index.segments || []) {
    const filePath = resolveSegmentPath(ROOT, segment.file);
    const content = fs.readFileSync(filePath, 'utf8');
    chunks.push(...chunkMarkdown(content, { segmentId: segment.id, ...CHUNK_CONFIG }));
  }
  return { index, chunks };
}

function replaceVectorIndex(db, vecIndex, chunks, embeddings, manifest, expectedIds) {
  const replace = db.transaction(() => {
    db.exec('DELETE FROM chunks_vec');
    db.exec('DELETE FROM chunks');
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const result = vecIndex.upsertChunk(c.id, c.segmentId, c.content, embeddings[i], { tokens: c.tokens });
      if (!result.inserted) throw new Error(result.error || `Falha ao inserir ${c.id}`);
    }
    const indexedIds = new Set(db.prepare('SELECT DISTINCT segment_id FROM chunks').all().map(r => r.segment_id));
    const missing = [...expectedIds].filter(id => !indexedIds.has(id));
    const unexpected = [...indexedIds].filter(id => !expectedIds.has(id));
    if (missing.length || unexpected.length) {
      throw new Error(`Cobertura vetorial inválida: ${JSON.stringify({ missing_segment_ids: missing, unexpected_segment_ids: unexpected })}`);
    }
    writeVectorManifest(db, manifest);
    return indexedIds;
  });
  return replace();
}

async function main() {
  const { index, chunks } = loadCorpus();
  const embedder = new EmbedProvider();
  if (!embedder.apiKey) {
    throw new Error('Provider de embeddings não configurado');
  }
  if (chunks.length === 0) throw new Error('Corpus não gerou chunks');

  const embeddings = [];
  for (let offset = 0; offset < chunks.length; offset += 16) {
    const batch = chunks.slice(offset, offset + 16);
    const result = await embedder.embedBatch(batch.map(c => c.content), 16);
    if (result.length !== batch.length || result.some(v => !Array.isArray(v) || v.length !== 768)) {
      throw new Error(`Batch de embeddings inválido no offset ${offset}`);
    }
    embeddings.push(...result);
    process.stderr.write(`\rEmbeddings ${embeddings.length}/${chunks.length}`);
  }
  process.stderr.write('\n');

  const vecIndex = new VectorIndex();
  vecIndex.connect();
  const db = vecIndex._db;
  const manifest = {
    ...buildCorpusManifest({
      root: ROOT,
      indexPath: INDEX_PATH,
      embeddingModel: embedder.model,
      embeddingDimension: embedder.dimension,
      chunkConfig: CHUNK_CONFIG,
    }),
    rebuilt_at: new Date().toISOString(),
  };
  const expectedIds = new Set((index.segments || []).map(s => s.id));
  const indexedIds = replaceVectorIndex(db, vecIndex, chunks, embeddings, manifest, expectedIds);
  const missing = [...expectedIds].filter(id => !indexedIds.has(id));
  const unexpected = [...indexedIds].filter(id => !expectedIds.has(id));
  const report = {
    schema_version: '1.0.0',
    rebuilt_at: manifest.rebuilt_at,
    index_sha256: manifest.index_sha256,
    corpus_sha256: manifest.corpus_sha256,
    document_hashes: manifest.document_hashes,
    embedding_model: embedder.model,
    embedding_dimension: embedder.dimension,
    chunk_config: CHUNK_CONFIG,
    segments_expected: expectedIds.size,
    segments_indexed: indexedIds.size,
    chunks_indexed: vecIndex.count(),
    missing_segment_ids: missing,
    unexpected_segment_ids: unexpected,
  };
  vecIndex.close();
  if (missing.length || unexpected.length) throw new Error(`Cobertura vetorial inválida: ${JSON.stringify(report)}`);
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[ssc-vec-rebuild] ${err.message}`);
    process.exit(1);
  });
}

module.exports = { loadCorpus, replaceVectorIndex, main };
