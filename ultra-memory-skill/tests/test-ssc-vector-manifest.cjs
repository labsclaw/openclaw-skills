#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  buildCorpusManifest,
  compareVectorManifest,
} = require('../scripts/ssc-vector-manifest.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-manifest-'));
try {
  fs.mkdirSync(path.join(root, 'memory', 'segments'), { recursive: true });
  fs.writeFileSync(path.join(root, 'memory', 'segments', 'a.md'), '# A\nconteudo inicial\n', 'utf8');
  const indexPath = path.join(root, 'memory', 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify({ segments: [{ id: 'a', file: 'memory/segments/a.md' }] }), 'utf8');

  const first = buildCorpusManifest({
    root,
    indexPath,
    embeddingModel: 'model-a',
    embeddingDimension: 768,
    chunkConfig: { maxTokens: 500, overlapTokens: 50 },
  });
  assert.equal(compareVectorManifest(first, first).valid, true);

  fs.writeFileSync(indexPath, JSON.stringify({
    lastUpdated: '2099-01-01T00:00:00.000Z',
    segments: [{ id: 'a', file: 'memory/segments/a.md', accessCount: 99 }],
  }), 'utf8');
  const metadataOnly = buildCorpusManifest({
    root,
    indexPath,
    embeddingModel: 'model-a',
    embeddingDimension: 768,
    chunkConfig: { maxTokens: 500, overlapTokens: 50 },
  });
  assert.equal(compareVectorManifest(first, metadataOnly).valid, true);

  fs.writeFileSync(path.join(root, 'memory', 'segments', 'a.md'), '# A\nconteudo alterado\n', 'utf8');
  const changedContent = buildCorpusManifest({
    root,
    indexPath,
    embeddingModel: 'model-a',
    embeddingDimension: 768,
    chunkConfig: { maxTokens: 500, overlapTokens: 50 },
  });
  const contentVerdict = compareVectorManifest(first, changedContent);
  assert.equal(contentVerdict.valid, false);
  assert.ok(contentVerdict.reasons.includes('document_hashes_mismatch'));

  const changedModel = { ...first, embedding_model: 'model-b' };
  const modelVerdict = compareVectorManifest(first, changedModel);
  assert.equal(modelVerdict.valid, false);
  assert.ok(modelVerdict.reasons.includes('embedding_model_mismatch'));

  const changedConfig = { ...first, chunk_config: { maxTokens: 400, overlapTokens: 50 } };
  const configVerdict = compareVectorManifest(first, changedConfig);
  assert.equal(configVerdict.valid, false);
  assert.ok(configVerdict.reasons.includes('chunk_config_mismatch'));

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-manifest-outside-'));
  try {
    fs.writeFileSync(path.join(outside, 'secret.md'), '# outside\n', 'utf8');
    const linkedDir = path.join(root, 'memory', 'linked-segments');
    fs.symlinkSync(outside, linkedDir, 'junction');
    fs.writeFileSync(indexPath, JSON.stringify({
      segments: [{ id: 'escape', file: 'memory/linked-segments/secret.md' }],
    }), 'utf8');
    assert.throws(() => buildCorpusManifest({
      root,
      indexPath,
      embeddingModel: 'model-a',
      embeddingDimension: 768,
      chunkConfig: { maxTokens: 500, overlapTokens: 50 },
    }), /Segmento fora do workspace/);
  } finally {
    fs.rmSync(outside, { recursive: true, force: true });
  }

  console.log('PASS test-ssc-vector-manifest');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
