#!/usr/bin/env node
/**
 * ssc-embed-provider.cjs — Provider de embeddings via Google Gemini API
 *
 * Usa gemini-embedding-2 com outputDimensionality=768 (768 dimensões).
 * Cache em memória. Retry com backoff exponencial. Suporta batch.
 *
 * Uso:
 *   const embedder = new EmbedProvider();
 *   const vec = await embedder.embed("texto qualquer");
 *   const vecs = await embedder.embedBatch(["texto1", "texto2"]);
 *
 * Variáveis de ambiente (em ordem de prioridade):
 *   GEMINI_API_KEY
 *   GOOGLE_AI_STUDIO_KEY
 */

const https = require('https');

const DEFAULT_MODEL = 'gemini-embedding-2';
const DEFAULT_DIMENSION = 768;
const DEFAULT_MAX_BATCH = 32;
const DEFAULT_MAX_RETRIES = 3;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

class EmbedProvider {
  /**
   * @param {object} options
   * @param {string} [options.apiKey]  — API key (fallback: GEMINI_API_KEY, GOOGLE_AI_STUDIO_KEY)
   * @param {string} [options.model]   — Modelo Gemini (default: gemini-embedding-2)
   * @param {number} [options.dimension] — Dimensão do embedding (default: 768)
   * @param {number} [options.maxBatchSize] — Tamanho máximo do batch (default: 32)
   * @param {number} [options.maxRetries] — Máximo de retentativas (default: 3)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey
      || process.env.GEMINI_API_KEY
      || process.env.GOOGLE_AI_STUDIO_KEY
      || '';
    this.model = options.model || DEFAULT_MODEL;
    this.dimension = options.dimension || DEFAULT_DIMENSION;
    this.maxBatchSize = options.maxBatchSize || DEFAULT_MAX_BATCH;
    this.maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;

    /** Cache em memória: chave = hash do texto, valor = array de floats */
    this._cache = new Map();

    if (!this.apiKey) {
      console.warn('[EmbedProvider] ⚠️  Nenhuma API key encontrada. ' +
        'Defina GEMINI_API_KEY ou GOOGLE_AI_STUDIO_KEY.');
    }
  }

  // ---------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------

  /**
   * Gera hash simples do texto pra usar como chave do cache.
   * @param {string} text
   * @returns {string}
   */
  _hash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // converte pra int32
    }
    return `h${hash}:${text.length}`;
  }

  /**
   * Aguarda N milissegundos.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------
  // HTTP request com retry
  // ---------------------------------------------------------------

  /**
   * Faz uma requisição POST HTTPS com retry exponencial.
   * @param {string} path — caminho da API (ex: /v1beta/...)
   * @param {object} bodyObj — corpo JSON
   * @param {number} retryCount — tentativa atual (0-index)
   * @returns {Promise<object>} — resposta parsed
   */
  _request(path, bodyObj, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const url = `${BASE_URL}${path}?key=${this.apiKey}`;
      const body = JSON.stringify(bodyObj);
      const urlObj = new URL(url);

      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 30000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Erro parse JSON: ${e.message}`));
            }
          } else {
            const retryable = res.statusCode === 429 || res.statusCode >= 500;
            const err = new Error(
              `HTTP ${res.statusCode}: ${data.substring(0, 300)}`
            );
            err.statusCode = res.statusCode;
            err.retryable = retryable;
            reject(err);
          }
        });
      });

      req.on('error', (e) => {
        const err = new Error(`Request error: ${e.message}`);
        err.retryable = true;
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        const err = new Error('Request timeout');
        err.retryable = true;
        reject(err);
      });

      req.write(body);
      req.end();
    }).catch(async (err) => {
      if (err.retryable && retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.warn(
          `[EmbedProvider] ⚠️  Retry ${retryCount + 1}/${this.maxRetries} ` +
          `após ${delay}ms: ${err.message}`
        );
        await this._sleep(delay);
        return this._request(path, bodyObj, retryCount + 1);
      }
      throw err;
    });
  }

  // ---------------------------------------------------------------
  // Embedding de texto único
  // ---------------------------------------------------------------

  /**
   * Gera embedding para um texto.
   * Usa cache se disponível.
   *
   * @param {string} text
   * @returns {Promise<number[]>} — array de floats (768 dimensões)
   */
  async embed(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('[EmbedProvider] text deve ser uma string não vazia');
    }

    const key = this._hash(text);
    const cached = this._cache.get(key);
    if (cached) {
      return cached;
    }

    const body = {
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
      outputDimensionality: this.dimension,
    };

    const result = await this._request(
      `/models/${this.model}:embedContent`,
      body
    );

    const values = result.embedding.values;
    this._cache.set(key, values);
    return values;
  }

  // ---------------------------------------------------------------
  // Embedding em lote (batch)
  // ---------------------------------------------------------------

  /**
   * Gera embeddings para múltiplos textos em lote.
   * Automaticamente quebra em sub-batches respeitando maxBatchSize.
   * Usa cache individual para cada texto.
   *
   * @param {string[]} texts — array de textos
   * @param {number} [maxBatchSize] — override do tamanho do batch
   * @returns {Promise<number[][]>} — array de arrays de floats
   */
  async embedBatch(texts, maxBatchSize = this.maxBatchSize) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const results = new Array(texts.length).fill(null);
    const uncachedIndices = [];
    const uncachedTexts = [];

    // 1. Verifica cache pra cada texto
    for (let i = 0; i < texts.length; i++) {
      const key = this._hash(texts[i]);
      const cached = this._cache.get(key);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    if (uncachedTexts.length === 0) {
      return results; // tudo em cache
    }

    // 2. Quebra em sub-batches
    for (let start = 0; start < uncachedTexts.length; start += maxBatchSize) {
      const batchTexts = uncachedTexts.slice(start, start + maxBatchSize);
      const batchIndices = uncachedIndices.slice(start, start + maxBatchSize);

      if (batchTexts.length === 1) {
        // Batch de 1: usa endpoint single (mais simples)
        const vec = await this.embed(batchTexts[0]);
        const idx = batchIndices[0];
        results[idx] = vec;
      } else {
        // Batch: usa endpoint batchEmbedContents
        const requests = batchTexts.map((text) => ({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
          outputDimensionality: this.dimension,
        }));

        const result = await this._request(
          `/models/${this.model}:batchEmbedContents`,
          { requests }
        );

        for (let j = 0; j < result.embeddings.length; j++) {
          const values = result.embeddings[j].values;
          const idx = batchIndices[j];
          results[idx] = values;
          // Escreve no cache
          this._cache.set(this._hash(batchTexts[j]), values);
        }
      }
    }

    return results;
  }

  // ---------------------------------------------------------------
  // Estatísticas do cache
  // ---------------------------------------------------------------

  /** @returns {{ size: number }} */
  cacheStats() {
    return { size: this._cache.size };
  }

  /** Limpa o cache de embeddings */
  clearCache() {
    const size = this._cache.size;
    this._cache.clear();
    return { cleared: size };
  }
}

// ---------------------------------------------------------------
// Interface standalone (CLI)
// ---------------------------------------------------------------
if (require.main === module) {
  (async () => {
    const embedder = new EmbedProvider();

    if (!embedder.apiKey) {
      console.error('[ssc-embed-provider] ❌ Nenhuma API key configurada.');
      console.error('  Defina GEMINI_API_KEY ou GOOGLE_AI_STUDIO_KEY.');
      process.exit(1);
    }

    const text = process.argv[2] || 'Olá, mundo! Teste de embedding.';
    console.log(`\n=== EmbedProvider ===`);
    console.log(`Modelo: ${embedder.model}`);
    console.log(`Dimensão: ${embedder.dimension}`);
    console.log(`Texto: "${text}"\n`);

    try {
      console.time('embed');
      const vec = await embedder.embed(text);
      console.timeEnd('embed');
      console.log(`Dimensão obtida: ${vec.length}`);
      console.log(`Primeiros 5 valores: [${vec.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
      console.log(`Últimos 5 valores: [${vec.slice(-5).map(v => v.toFixed(6)).join(', ')}]`);

      // Testa batch com 3 textos
      console.log(`\n--- Teste batch ---`);
      const texts = [
        'Memória de curto prazo em agentes de IA.',
        'Cache seletivo esparso para recuperação eficiente.',
        'Arquitetura de sistemas multi-agente.',
      ];
      console.time('embedBatch');
      const vecs = await embedder.embedBatch(texts);
      console.timeEnd('embedBatch');
      console.log(`Batch: ${vecs.length} embeddings gerados`);
      for (let i = 0; i < vecs.length; i++) {
        console.log(`  [${i}] dim=${vecs[i].length}, primeiros 3: [${vecs[i].slice(0, 3).map(v => v.toFixed(6)).join(', ')}]`);
      }

      // Testa cache (segunda chamada deve ser instantânea)
      console.log(`\n--- Teste cache ---`);
      console.time('embed-cached');
      const cached = await embedder.embed(text);
      console.timeEnd('embed-cached');
      console.log(`Cache hits: ${embedder.cacheStats().size} entradas`);

    } catch (err) {
      console.error(`[ssc-embed-provider] ❌ Erro: ${err.message}`);
      process.exit(1);
    }
  })();
}

module.exports = { EmbedProvider };
