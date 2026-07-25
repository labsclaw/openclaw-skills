#!/usr/bin/env node
/**
 * ssc-query-expand.cjs — Módulo de Query Expansion para o SSC
 *
 * Expande a query do usuário com termos relacionados pra melhorar
 * o recall da busca BM25 no Semantic Segment Cache.
 *
 * Estratégias:
 *   - "llm": usa antigravity proxy (chat completions) pra gerar termos
 *   - "simple": tokenização + bigrams + stopword removal (sem dependências)
 *
 * Uso:
 *   const { expandQuery } = require("./ssc-query-expand.cjs");
 *   const result = await expandQuery("meu termo de busca");
 *
 * @module ssc-query-expand
 */

const http = require("http");
const https = require("https");

// ---------------------------------------------------------------------------
// Stopwords básicas (pt-BR + en)
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  // Português
  "a", "ao", "aos", "aquele", "aquela", "aquelas", "aqueles", "aquilo",
  "as", "até", "com", "como", "da", "das", "de", "dela", "delas",
  "dele", "deles", "depois", "do", "dos", "e", "ela", "elas", "ele",
  "eles", "em", "entre", "era", "eram", "essa", "essas", "esse",
  "esses", "esta", "estas", "estava", "este", "estes", "eu", "foi",
  "foram", "há", "isso", "isto", "já", "la", "lhe", "lhes", "lo",
  "mas", "me", "mesmo", "na", "nas", "não", "no", "nos", "nós",
  "num", "numa", "o", "os", "ou", "para", "pela", "pelas", "pelo",
  "pelos", "por", "qual", "quando", "que", "quem", "se", "sem",
  "seu", "seus", "sua", "suas", "só", "também", "te", "tem",
  "ter", "teu", "teus", "to", "tu", "um", "uma", "umas", "uns",
  "à", "às",
  // Inglês
  "a", "about", "above", "after", "again", "all", "also", "am",
  "an", "and", "any", "are", "as", "at", "be", "because", "been",
  "before", "being", "below", "between", "both", "but", "by",
  "could", "did", "do", "does", "done", "each", "few", "for",
  "from", "further", "had", "has", "have", "having", "here",
  "how", "i", "if", "in", "into", "is", "it", "its", "just",
  "like", "made", "make", "may", "me", "might", "more", "most",
  "much", "my", "no", "nor", "not", "now", "of", "on", "once",
  "only", "or", "other", "our", "out", "over", "own", "per",
  "put", "rather", "s", "said", "same", "shall", "she", "should",
  "show", "side", "since", "so", "some", "such", "take", "than",
  "that", "the", "their", "them", "then", "there", "these", "they",
  "this", "through", "to", "too", "under", "upon", "us", "very",
  "was", "way", "we", "were", "what", "when", "where", "which",
  "while", "who", "why", "will", "with", "would", "you", "your",
]);

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Tokeniza uma string: lowercase, remove pontuação, split por whitespace.
 * @param {string} str
 * @returns {string[]}
 */
function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")  // pontuação vira espaço (hífen preservado)
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Verifica se o antigravity proxy está acessível.
 * @param {string} apiBase
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function probeProxy(apiBase, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const url = new URL(apiBase.replace(/\/v1$/, "") + "/health");
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.get(url.href, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Faz requisição POST JSON para um endpoint HTTP(S).
 * @param {string} apiBase  — ex: "http://127.0.0.1:8080/v1"
 * @param {object} body     — payload JSON
 * @param {number} timeoutMs
 * @returns {Promise<object>}
 */
function jsonPost(apiBase, path, body, timeoutMs = 15000) {
  const url = new URL(apiBase.replace(/\/+$/, "") + path);
  const mod = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: timeoutMs,
    };

    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout após ${timeoutMs}ms`));
    });

    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Estratégias de expansão
// ---------------------------------------------------------------------------

/**
 * Estratégia "simple": tokeniza, extrai bigrams, remove stopwords.
 * Sem dependência externa — funciona offline.
 *
 * @param {string} query
 * @param {object} options
 * @param {number} options.maxTerms
 * @returns {{ original: string, expanded: string[], combined: string }}
 */
function simpleExpand(query, { maxTerms = 8 } = {}) {
  const tokens = tokenize(query);
  const filtered = tokens.filter((t) => !STOPWORDS.has(t) && t.length > 1);

  // Conjunto pra dedup
  const termSet = new Set();

  // 1. Adiciona tokens relevantes (não-stopwords)
  for (const t of filtered) {
    if (termSet.size >= maxTerms) break;
    if (t !== tokens.join(" ")) termSet.add(t);
  }

  // 2. Bigrams de palavras adjacentes (se ainda cabe)
  if (termSet.size < maxTerms && filtered.length >= 2) {
    for (let i = 0; i < filtered.length - 1; i++) {
      if (termSet.size >= maxTerms) break;
      const bg = filtered[i] + " " + filtered[i + 1];
      termSet.add(bg);
    }
  }

  // 3. Variações morfológicas simples (plurais -> singular)
  const extraTerms = [];
  for (const t of filtered) {
    if (termSet.size + extraTerms.length >= maxTerms) break;
    // Se termina com "s" (plural), adiciona singular
    if (t.endsWith("s") && t.length > 3) {
      const singular = t.slice(0, -1);
      if (!termSet.has(singular) && !extraTerms.includes(singular)) {
        extraTerms.push(singular);
      }
    }
    // Se termina com "es", tenta sem "es"
    if (t.endsWith("es") && t.length > 4) {
      const s = t.slice(0, -2);
      if (!termSet.has(s) && !extraTerms.includes(s)) {
        extraTerms.push(s);
      }
    }
  }

  const expanded = [...termSet, ...extraTerms].slice(0, maxTerms);

  return {
    original: query,
    expanded,
    combined: [query, ...expanded].join(" "),
  };
}

/**
 * Estratégia "llm": usa modelo via antigravity proxy pra gerar termos.
 * Fallback pra simpleExpand se a API falhar.
 *
 * @param {string} query
 * @param {object} options
 * @param {string} options.model
 * @param {string} options.apiBase
 * @param {number} options.maxTerms
 * @param {number} options.timeoutMs
 * @returns {Promise<{ original: string, expanded: string[], combined: string }>}
 */
async function llmExpand(query, options = {}) {
  const {
    model = "gemini-3.6-flash-high",
    apiBase = "http://127.0.0.1:8080/v1",
    maxTerms = 8,
    timeoutMs = 15000,
  } = options;

  const prompt = `Generate ${maxTerms} search terms related to: '${query}'. Return ONLY a comma-separated list, no explanation.`;

  try {
    const body = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 256,
    };

    const resp = await jsonPost(apiBase, "/chat/completions", body, timeoutMs);

    if (resp.status !== 200) {
      throw new Error(`LLM retornou status ${resp.status}: ${JSON.stringify(resp.data).slice(0, 200)}`);
    }

    const content =
      resp.data?.choices?.[0]?.message?.content ||
      resp.data?.choices?.[0]?.text ||
      "";

    if (!content) {
      throw new Error("LLM retornou resposta vazia");
    }

    // Parse: split por vírgula, trim, lowercase, dedup
    const terms = content
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^["']|["']$/g, ""))
      .filter((t) => t.length > 0 && t !== query.toLowerCase());

    const expanded = [...new Set(terms)].slice(0, maxTerms);

    return {
      original: query,
      expanded,
      combined: [query, ...expanded].join(" "),
    };
  } catch (err) {
    // Fallback: tenta simple expand
    console.warn(`[ssc-expand] LLM fallback: ${err.message}`);
    return simpleExpand(query, { maxTerms });
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Expande a query do usuário pra melhorar recall da busca BM25.
 *
 * @param {string} query  — termo original de busca
 * @param {object} [options]
 * @param {string} [options.strategy="llm"]  — "llm" | "simple"
 * @param {string} [options.model="gemini-3.6-flash-high"]
 * @param {string} [options.apiBase="http://127.0.0.1:8080/v1"]
 * @param {number} [options.maxTerms=8]
 * @param {number} [options.timeoutMs=15000]
 * @returns {Promise<{ original: string, expanded: string[], combined: string }>}
 */
async function expandQuery(query, options = {}) {
  const {
    strategy = "llm",
    model = "gemini-3.6-flash-high",
    apiBase = "http://127.0.0.1:8080/v1",
    maxTerms = 8,
    timeoutMs = 15000,
  } = options;

  if (!query || typeof query !== "string" || !query.trim()) {
    return { original: "", expanded: [], combined: "" };
  }

  query = query.trim();

  if (strategy === "simple") {
    return simpleExpand(query, { maxTerms });
  }

  // strategy === "llm"
  const available = await probeProxy(apiBase, 3000);
  if (!available) {
    console.warn(`[ssc-expand] Proxy ${apiBase} indisponível, usando strategy "simple"`);
    return simpleExpand(query, { maxTerms });
  }

  return llmExpand(query, { model, apiBase, maxTerms, timeoutMs });
}

// ---------------------------------------------------------------------------
// CLI mode: execução direta
// ---------------------------------------------------------------------------
if (require.main === module) {
  const query = process.argv[2];
  if (!query) {
    console.error("Uso: node scripts/ssc-query-expand.cjs <query> [strategy]");
    process.exit(1);
  }
  const strategy = process.argv[3] || "simple";

  expandQuery(query, { strategy })
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      console.error("Erro:", err.message);
      process.exit(1);
    });
}

module.exports = { expandQuery };
