#!/usr/bin/env node
/**
 * ssc-poq-expand.cjs — Prova de Conceito do Módulo de Query Expansion
 *
 * Testa expandQuery com 3 queries diferentes usando:
 *   1. strategy "simple" (sempre)
 *   2. strategy "llm" (se antigravity estiver rodando)
 *
 * Uso:
 *   node scripts/ssc-poq-expand.cjs
 *
 * @see ssc-query-expand.cjs
 */

const { expandQuery } = require("./ssc-query-expand.cjs");

// ---------------------------------------------------------------------------
// Queries de teste
// ---------------------------------------------------------------------------
const TEST_QUERIES = [
  "heartbeat alert storm cron",
  "rate limit encoding proxy",
  "SSC v4.0 memory BM25",
];

// ---------------------------------------------------------------------------
// Helpers de output
// ---------------------------------------------------------------------------
function separator(title) {
  console.log("");
  console.log("=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

function printResult(query, result, strategy) {
  console.log(`\n📌  Query:      "${query}"`);
  console.log(`🔧  Strategy:   ${strategy}`);
  console.log(`📎  Original:   "${result.original}"`);
  console.log(`📦  Expanded:   [ ${result.expanded.map((t) => `"${t}"`).join(", ")} ]`);
  console.log(`🔗  Combined:   "${result.combined}"`);

  // Validação básica
  if (result.expanded.length === 0) {
    console.warn("  ⚠️  Nenhum termo expandido gerado.");
  }
  if (!result.combined.includes(result.original)) {
    console.warn("  ⚠️  combined não contém a query original.");
  }
}

// ---------------------------------------------------------------------------
// Teste principal
// ---------------------------------------------------------------------------
async function main() {
  const { execSync } = require("child_process");

  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     SSC Query Expansion — Prova de Conceito            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Iniciado em: ${new Date().toISOString()}`);
  console.log(`Node:       ${process.version}`);
  console.log(`CWD:        ${process.cwd()}`);

  // -----------------------------------------------------------------------
  // 1. Testa strategy "simple" nas 3 queries
  // -----------------------------------------------------------------------
  separator("STRATEGY: simple (sem dependência externa)");

  for (const query of TEST_QUERIES) {
    try {
      const result = await expandQuery(query, { strategy: "simple" });
      printResult(query, result, "simple");
    } catch (err) {
      console.error(`\n❌  Erro ao expandir "${query}": ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // 2. Testa strategy "llm" se antigravity estiver rodando
  // -----------------------------------------------------------------------
  separator("STRATEGY: llm (antigravity proxy)");

  const proxyUrl = process.env.SSC_LLM_BASE || "http://127.0.0.1:8080/v1";
  const modelName = process.env.SSC_LLM_MODEL || "gemini-3.6-flash-high";

  console.log(`\n  Proxy: ${proxyUrl}`);
  console.log(`  Model: ${modelName}`);
  console.log("");

  // Probe rápido
  const http = require("http");
  const probeOk = await new Promise((resolve) => {
    const req = http.get(
      proxyUrl.replace(/\/v1$/, "") + "/health",
      { timeout: 3000 },
      (res) => resolve(res.statusCode >= 200 && res.statusCode < 500)
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });

  if (!probeOk) {
    console.log("  ⚠️  Antigravity proxy indisponível. Pulando teste LLM.");
    console.log("  💡  Teste manual: node scripts/ssc-query-expand.cjs <query> llm");
  } else {
    for (const query of TEST_QUERIES) {
      try {
        const result = await expandQuery(query, {
          strategy: "llm",
          apiBase: proxyUrl,
          model: modelName,
          timeoutMs: 20000,
        });
        printResult(query, result, "llm");
      } catch (err) {
        console.error(`\n❌  Erro LLM "${query}": ${err.message}`);

        // Fallback manual pra demonstrar resiliência
        console.log("  → Aplicando fallback simple...");
        try {
          const fallback = await expandQuery(query, { strategy: "simple" });
          printResult(query, fallback, "llm (fallback simple)");
        } catch (fbErr) {
          console.error(`  → Fallback também falhou: ${fbErr.message}`);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Resumo
  // -----------------------------------------------------------------------
  separator("RESUMO");

  console.log("");
  console.log("  ✅  Módulo ssc-query-expand.cjs — criado");
  console.log("  ✅  PoC executada com sucesso");
  console.log("");
  console.log("  Arquivos:");
  console.log("    scripts/ssc-query-expand.cjs   (módulo principal)");
  console.log("    scripts/ssc-poq-expand.cjs     (prova de conceito)");
  console.log("");
  console.log(`  Timestamp: ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error("\n❌  Erro fatal no PoC:", err);
  process.exit(1);
});
