#!/usr/bin/env node
/**
 * ssc-vec-index.cjs — Índice Vetorial para SSC usando sqlite-vec
 *
 * Gerencia uma tabela virtual vec0 (kNN search) e uma tabela chunks
 * (metadados) dentro do memory.db existente.
 *
 * Dependências (globais):
 *   - better-sqlite3
 *   - sqlite-vec (via openclaw)
 *
 * Uso:
 *   const { VectorIndex } = require('./ssc-vec-index.cjs');
 *   const idx = new VectorIndex();
 *   await idx.upsertChunk('id1', 'seg-a', 'conteúdo do chunk', embeddingArray);
 *   const results = await idx.search(queryEmbedding, 10);
 *
 * Dimensão esperada: 768 (gemini-embedding-2 com outputDimensionality=768)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const childProcess = require('child_process');

// ---------------------------------------------------------------
// Resolve módulos globais
// ---------------------------------------------------------------
const globalRoot = childProcess
  .execSync('npm root -g')
  .toString()
  .trim();

const Database = require(path.join(globalRoot, 'better-sqlite3'));
const sqliteVec = require(path.join(globalRoot, 'openclaw/node_modules/sqlite-vec'));

// ---------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------
const DEFAULT_DIMENSION = 768;
const DEFAULT_TOP_K = 10;
const WORKSPACE_DIR = path.resolve(__dirname, '..');
const MEMORY_DB_PATH = path.join(WORKSPACE_DIR, 'memory', 'memory.db');

class VectorIndex {
  /**
   * @param {object} options
   * @param {string} [options.dbPath]  — Caminho do SQLite (default: memory/memory.db)
   * @param {number} [options.dimension] — Dimensão dos embeddings (default: 768)
   */
  constructor(options = {}) {
    this.dbPath = options.dbPath || MEMORY_DB_PATH;
    this.dimension = options.dimension || DEFAULT_DIMENSION;
    this._db = null;
    this._ready = false;
  }

  // ---------------------------------------------------------------
  // Conexão com o banco
  // ---------------------------------------------------------------

  /**
   * Abre (ou cria) o banco SQLite e inicializa as tabelas.
   * Pode ser chamado múltiplas vezes — é idempotente.
   *
   * @returns {import('better-sqlite3').Database}
   */
  connect() {
    if (this._db && this._ready) {
      return this._db;
    }

    // Garante que o diretório existe
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this._db = new Database(this.dbPath);
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');

    // Carrega sqlite-vec
    sqliteVec.load(this._db);
    console.log(`[VectorIndex] sqlite-vec carregado em ${this.dbPath}`);

    // Cria tabela virtual vec0 para busca kNN
    // chunk_id TEXT PRIMARY KEY -> referência ao chunk na tabela chunks
    // embedding FLOAT[N] -> vetor float32 de N dimensões
    this._db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec
      USING vec0(
        chunk_id TEXT PRIMARY KEY,
        embedding FLOAT[${this.dimension}]
      )
    `);

    // Cria tabela de chunks (metadados + conteúdo)
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        segment_id TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Índices auxiliares
    this._db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_segment_id ON chunks(segment_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_created_at ON chunks(created_at);
    `);

    // Prepara statements comuns
    this._stmtUpsertChunk = this._db.prepare(`
      INSERT INTO chunks(id, segment_id, content, tokens, created_at)
      VALUES(?, ?, ?, ?, COALESCE(?, datetime('now')))
      ON CONFLICT(id) DO UPDATE SET
        segment_id = excluded.segment_id,
        content = excluded.content,
        tokens = excluded.tokens
    `);

    // NOTA: vec0 (virtual table) NÃO suporta UPSERT.
    // Estratégia: DELETE + INSERT para idempotência.
    this._stmtInsertVec = this._db.prepare(`
      INSERT INTO chunks_vec(chunk_id, embedding)
      VALUES(?, ?)
    `);

    this._stmtDeleteVec = this._db.prepare(`
      DELETE FROM chunks_vec WHERE chunk_id = ?
    `);

    this._stmtDeleteChunk = this._db.prepare(`
      DELETE FROM chunks WHERE id = ?
    `);

    this._stmtGetChunk = this._db.prepare(`
      SELECT id, segment_id, content, tokens, created_at
      FROM chunks WHERE id = ?
    `);

    this._stmtCount = this._db.prepare(`
      SELECT COUNT(*) as total FROM chunks
    `);

    this._stmtSearchVec = this._db.prepare(`
      SELECT chunk_id, distance
      FROM chunks_vec
      WHERE embedding MATCH ?
        AND k = ?
      ORDER BY distance
    `);

    this._ready = true;
    return this._db;
  }

  /**
   * Fecha a conexão com o banco.
   */
  close() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._ready = false;
    }
  }

  // ---------------------------------------------------------------
  // Operações CRUD
  // ---------------------------------------------------------------

  /**
   * Insere ou atualiza um chunk e seu embedding.
   *
   * @param {string} id — Identificador único do chunk
   * @param {string} segmentId — ID do segmento de origem
   * @param {string} content — Conteúdo textual do chunk
   * @param {number[]} embedding — Array de floats (768 dimensões)
   * @param {object} [options]
   * @param {number} [options.tokens] — Contagem de tokens
   * @param {string} [options.createdAt] — Data ISO (default: now)
   * @returns {{ id: string, inserted: boolean }}
   */
  upsertChunk(id, segmentId, content, embedding, options = {}) {
    this._ensureReady();

    if (!Array.isArray(embedding) || embedding.length !== this.dimension) {
      throw new Error(
        `[VectorIndex] Embedding deve ser array de ${this.dimension} floats, ` +
        `recebido ${embedding ? embedding.length : 'null'}`
      );
    }

    const tokens = options.tokens || 0;
    const createdAt = options.createdAt || null;

    // Serializa embedding como JSON array string
    const embeddingJson = JSON.stringify(embedding);

    // Transaction: upsert chunk metadata + vec embedding
    // vec0 não suporta UPSERT, então fazemos DELETE antes do INSERT
    const tx = this._db.transaction(() => {
      this._stmtUpsertChunk.run(id, segmentId, content, tokens, createdAt);
      this._stmtDeleteVec.run(id);
      this._stmtInsertVec.run(id, embeddingJson);
    });

    try {
      tx();
      return { id, inserted: true };
    } catch (err) {
      console.error(`[VectorIndex] Erro upsertChunk(${id}): ${err.message}`);
      return { id, inserted: false, error: err.message };
    }
  }

  /**
   * Remove um chunk e seu embedding.
   *
   * @param {string} id
   * @returns {boolean}
   */
  deleteChunk(id) {
    this._ensureReady();

    const tx = this._db.transaction(() => {
      this._stmtDeleteVec.run(id);
      const info = this._stmtDeleteChunk.run(id);
      return info.changes > 0;
    });

    try {
      return tx();
    } catch (err) {
      console.error(`[VectorIndex] Erro deleteChunk(${id}): ${err.message}`);
      return false;
    }
  }

  /**
   * Busca um chunk por ID.
   *
   * @param {string} id
   * @returns {object|null}
   */
  getChunk(id) {
    this._ensureReady();
    return this._stmtGetChunk.get(id) || null;
  }

  /**
   * Retorna o total de chunks indexados.
   *
   * @returns {number}
   */
  count() {
    this._ensureReady();
    const row = this._stmtCount.get();
    return row ? row.total : 0;
  }

  // ---------------------------------------------------------------
  // Busca vetorial (kNN)
  // ---------------------------------------------------------------

  /**
   * Busca os top-K chunks mais similares ao embedding de consulta.
   *
   * A distância retornada é Euclidiana (L2).
   * Para obter cosine similarity: sim = 1 - (distance^2 / 2)
   * (útil quando embeddings estão normalizados).
   *
   * @param {number[]} queryEmbedding — Array de floats (768 dim)
   * @param {number} [topK=10] — Número de resultados
   * @returns {Array<{ chunk_id: string, distance: number, content: string, segment_id: string, tokens: number, cosineSimilarity: number }>}
   */
  search(queryEmbedding, topK = DEFAULT_TOP_K) {
    this._ensureReady();

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== this.dimension) {
      throw new Error(
        `[VectorIndex] queryEmbedding deve ser array de ${this.dimension} floats`
      );
    }

    // Serializa como JSON array string
    const queryJson = JSON.stringify(queryEmbedding);

    let vecResults;
    try {
      vecResults = this._stmtSearchVec.all(queryJson, topK);
    } catch (err) {
      console.error(`[VectorIndex] Erro na busca: ${err.message}`);
      return [];
    }

    if (vecResults.length === 0) {
      return [];
    }

    // JOIN com a tabela chunks pra obter metadados
    const chunkIds = vecResults.map(r => r.chunk_id);
    const placeholders = chunkIds.map(() => '?').join(',');

    const chunksMap = {};
    const chunkRows = this._db.prepare(
      `SELECT id, segment_id, content, tokens FROM chunks WHERE id IN (${placeholders})`
    ).all(...chunkIds);

    for (const row of chunkRows) {
      chunksMap[row.id] = row;
    }

    // Monta resultados enriquecidos
    const results = vecResults.map((vr) => {
      const chunk = chunksMap[vr.chunk_id] || { content: '', segment_id: '', tokens: 0 };
      // Cosine similarity a partir de L2 distance
      // Para vetores normalizados: cos_sim = 1 - (dist^2 / 2)
      // Mas vamos calcular explicitamente
      const distSq = vr.distance * vr.distance;
      const cosineSim = Math.max(-1, Math.min(1, 1 - (distSq / 2)));

      return {
        chunk_id: vr.chunk_id,
        distance: Math.round(vr.distance * 10000) / 10000,
        cosineSimilarity: Math.round(cosineSim * 10000) / 10000,
        content: chunk.content || '',
        segment_id: chunk.segment_id || '',
        tokens: chunk.tokens || 0,
      };
    });

    return results;
  }

  /**
   * Busca com JOIN para incluir score normalizado.
   * Versão convenience que já retorna chunks completos.
   *
   * @param {number[]} queryEmbedding
   * @param {number} [topK=10]
   * @returns {Array}
   */
  searchWithContent(queryEmbedding, topK = DEFAULT_TOP_K) {
    return this.search(queryEmbedding, topK);
  }

  // ---------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------

  _ensureReady() {
    if (!this._ready || !this._db) {
      this.connect();
    }
  }

  /**
   * Gera um ID único para chunk.
   * @param {string} [prefix='chunk']
   * @returns {string}
   */
  static generateId(prefix = 'chunk') {
    const rand = crypto.randomBytes(4).toString('hex');
    return `${prefix}-${rand}`;
  }
}

// ---------------------------------------------------------------
// Interface standalone (CLI)
// ---------------------------------------------------------------
if (require.main === module) {
  const action = process.argv[2] || 'stats';

  const idx = new VectorIndex();
  idx.connect();

  if (action === 'stats') {
    const total = idx.count();
    console.log(`\n=== VectorIndex Stats ===`);
    console.log(`Database: ${idx.dbPath}`);
    console.log(`Dimensão: ${idx.dimension}`);
    console.log(`Chunks indexados: ${total}`);

    // Amostra
    if (total > 0) {
      const samples = idx._db.prepare('SELECT id, segment_id, tokens, created_at FROM chunks ORDER BY created_at DESC LIMIT 5').all();
      console.log(`\nÚltimos chunks:`);
      for (const s of samples) {
        console.log(`  [${s.id}] seg=${s.segment_id}, tokens=${s.tokens}, criado=${s.created_at}`);
      }
    }
  } else if (action === 'list') {
    const chunks = idx._db.prepare('SELECT id, segment_id, substr(content, 1, 80) AS preview, tokens, created_at FROM chunks ORDER BY created_at DESC LIMIT 20').all();
    console.log(`\n=== Chunks (últimos 20) ===`);
    for (const c of chunks) {
      console.log(`\n[${c.id}] seg=${c.segment_id} (${c.tokens} tokens, ${c.created_at})`);
      console.log(`  "${c.preview}..."`);
    }
  } else {
    console.log(`Uso: node scripts/ssc-vec-index.cjs [stats|list]`);
  }

  idx.close();
}

module.exports = { VectorIndex };
