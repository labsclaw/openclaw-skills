#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_KEY = 'active';
const SCHEMA_VERSION = '1.0.0';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function resolveSegmentPath(root, file) {
  if (typeof file !== 'string' || !file.trim() || path.isAbsolute(file) || file.split(/[\\/]+/u).includes('..')) {
    throw new Error(`Segmento fora do workspace: ${file}`);
  }
  const rootReal = fs.realpathSync.native(root);
  let filePath;
  try {
    filePath = fs.realpathSync.native(path.resolve(rootReal, file));
  } catch {
    throw new Error(`Arquivo de segmento inválido: ${file}`);
  }
  const relative = path.relative(rootReal, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Segmento fora do workspace: ${file}`);
  }
  if (!fs.statSync(filePath).isFile()) throw new Error(`Arquivo de segmento inválido: ${file}`);
  return filePath;
}

function buildCorpusManifest({ root, indexPath, embeddingModel, embeddingDimension, chunkConfig }) {
  const indexRaw = fs.readFileSync(indexPath, 'utf8');
  const index = JSON.parse(indexRaw);
  const documents = (index.segments || []).map(segment => {
    const filePath = resolveSegmentPath(root, segment.file);
    return {
      id: segment.id,
      file: path.relative(root, filePath).replaceAll('\\', '/'),
      sha256: sha256(fs.readFileSync(filePath)),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  return {
    schema_version: SCHEMA_VERSION,
    index_sha256: sha256(indexRaw),
    corpus_sha256: sha256(stableJson(documents)),
    document_hashes: documents,
    embedding_model: embeddingModel,
    embedding_dimension: embeddingDimension,
    chunk_config: chunkConfig,
  };
}

function compareVectorManifest(stored, current) {
  const reasons = [];
  if (!stored) return { valid: false, reasons: ['manifest_missing'] };
  if (stored.schema_version !== current.schema_version) reasons.push('schema_version_mismatch');
  // index_sha256 é auditável, mas não participa do gate: lastUpdated/accessCount
  // mudam sem alterar os chunks. IDs, paths e conteúdo são cobertos abaixo.
  if (stored.corpus_sha256 !== current.corpus_sha256 || stableJson(stored.document_hashes) !== stableJson(current.document_hashes)) {
    reasons.push('document_hashes_mismatch');
  }
  if (stored.embedding_model !== current.embedding_model) reasons.push('embedding_model_mismatch');
  if (stored.embedding_dimension !== current.embedding_dimension) reasons.push('embedding_dimension_mismatch');
  if (stableJson(stored.chunk_config) !== stableJson(current.chunk_config)) reasons.push('chunk_config_mismatch');
  return { valid: reasons.length === 0, reasons };
}

function ensureManifestTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS vector_manifest (
    manifest_key TEXT PRIMARY KEY,
    manifest_json TEXT NOT NULL,
    rebuilt_at TEXT NOT NULL
  )`);
}

function writeVectorManifest(db, manifest) {
  ensureManifestTable(db);
  db.prepare(`INSERT INTO vector_manifest(manifest_key, manifest_json, rebuilt_at)
    VALUES(?, ?, ?)
    ON CONFLICT(manifest_key) DO UPDATE SET
      manifest_json = excluded.manifest_json,
      rebuilt_at = excluded.rebuilt_at`).run(MANIFEST_KEY, JSON.stringify(manifest), manifest.rebuilt_at);
}

function readVectorManifest(db) {
  const table = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'vector_manifest'").get();
  if (!table) return null;
  const row = db.prepare('SELECT manifest_json FROM vector_manifest WHERE manifest_key = ?').get(MANIFEST_KEY);
  return row ? JSON.parse(row.manifest_json) : null;
}

module.exports = {
  buildCorpusManifest,
  compareVectorManifest,
  ensureManifestTable,
  readVectorManifest,
  resolveSegmentPath,
  stableJson,
  writeVectorManifest,
};
