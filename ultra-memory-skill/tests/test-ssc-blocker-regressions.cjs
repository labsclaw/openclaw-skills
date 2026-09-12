#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { VectorIndex } = require('../scripts/ssc-vec-index.cjs');
const { replaceVectorIndex } = require('../scripts/ssc-vec-rebuild.cjs');
const { readVectorManifest, writeVectorManifest } = require('../scripts/ssc-vector-manifest.cjs');
const { buildMetadataMap, decodeEmbedding, vectorAllowedForCollections } = require('../scripts/ssc-hybrid.cjs');
const { resolveEntryWeight, resolveTierMultiplier } = require('../scripts/ssc-router.cjs');

assert.equal(resolveEntryWeight({ weight: 0 }), 0);
assert.equal(resolveTierMultiplier({ tier1Weight: 0 }, 1), 0);

assert.equal(vectorAllowedForCollections(['reports']), false);
assert.equal(vectorAllowedForCollections(['segments']), true);
assert.equal(vectorAllowedForCollections(undefined), true);

const metadata = buildMetadataMap({
  segments: [{ id: 'segment', file: 'segment.md', tier: 1 }],
  reports: [{ id: 'report', file: 'report.md', summary: 'Report', tier: 1.5 }],
}, ['reports']);
assert.equal(metadata.has('segment'), false);
assert.equal(metadata.get('report').file, 'report.md');
assert.equal(metadata.get('report').summary, 'Report');
assert.equal(metadata.get('report').tier, 1.5);

const binary = Buffer.from(new Float32Array([0.25, -0.5, 1]).buffer);
assert.deepEqual(decodeEmbedding(binary, 3), [0.25, -0.5, 1]);
assert.equal(decodeEmbedding(Buffer.alloc(2), 3), null);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rebuild-rollback-'));
const dbPath = path.join(temp, 'memory.db');
const vec = new VectorIndex({ dbPath, dimension: 2 });
try {
  const db = vec.connect();
  vec.upsertChunk('old-chunk', 'old-segment', 'old', [1, 0]);
  const oldManifest = {
    schema_version: '1.0.0',
    corpus_sha256: 'old-corpus',
    rebuilt_at: '2026-09-11T00:00:00.000Z',
  };
  writeVectorManifest(db, oldManifest);
  assert.throws(() => replaceVectorIndex(
    db,
    vec,
    [{ id: 'new-chunk', segmentId: 'new-segment', content: 'new', tokens: 1 }],
    [[0, 1]],
    { schema_version: '1.0.0' },
    new Set(['new-segment', 'missing-segment']),
  ), /Cobertura vetorial inválida/);
  assert.equal(vec.getChunk('old-chunk').segment_id, 'old-segment');
  assert.equal(vec.getChunk('new-chunk'), null);
  assert.deepEqual(readVectorManifest(db), oldManifest);
} finally {
  vec.close();
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('PASS test-ssc-blocker-regressions');
