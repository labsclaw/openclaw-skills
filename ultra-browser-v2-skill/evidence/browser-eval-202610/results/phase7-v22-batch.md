# Fase 7 — v2.2 BATCH MODE (padrão OpenGCUA adaptado) — 2026-10-19

## O que mudou (v2.1 → v2.2)

| | v2.1 single | v2.2 batch |
|---|---|---|
| Ciclo | snapshot → 1 ação → re-snapshot... | snapshot → **plano multi-ação + asserts** → executa lote → verifier |
| Requests do motor por tarefa | 5-7 | **1** (re-planeja só se assert falhar) |
| Execuções browser | 1 por ação | **1 por lote** (JS único) |
| Erro intermediário | detectado só no próximo ciclo | **assert inline para o lote no primeiro falho** |
| Padrão | jev-ultrafast (1 decisão/ciclo) | + OpenGCUA code-execution (operações como programa) |

Implementação: `ask_jev_plan` (N pares especulativos op_k/tgt_k numa request JEV — TypeSafe: "adding questions barely changes response time"), `execute_batch` (JS que executa a lista com asserts e para no primeiro falho), `--mode batch` no CLI (single intacto). Motores free ganham `ask_nvidia` (NIM) e `ask_kilocode` (Kilo :free) — opencode CLI caiu (API key expirada, 2026-10-19).

## Resultado T4 (mesma tarefa de sempre)

| Motor | Modo | Resultado | Ciclos | Requests | Latência decisão | Tokens |
|---|---|---|---|---|---|---|
| **JEV typesafe** | batch (--n-heads 6) | ✅ DONE-VERIFIED-BATCH | **1** | **1** | **0.51s** | 2.091 in / 609 out |
| **MiniMax M3.1 Flash :free** (kilocode) | batch | ✅ DONE-VERIFIED-BATCH | **1** | **1** | **4.3s** | 741 |
| **glm-5.3** (NIM) | batch | ✅ DONE-VERIFIED-BATCH | **1** | **1** | 9.4s | 640 |
| **deepseek-v4.1-flash** (NIM) | batch | ✅ DONE-VERIFIED-BATCH | **1** | **1** | 74.4s (NIM cold-start hoje) | 685 |
| JEV typesafe | single (v2.1, Fase 6) | ✅ DONE-VERIFIED | 7 | 7 | 0.43s/decisão (~3s total) | 4.220/606 |
| mimo free | single (Fase 3/5) | ✅ DONE-VERIFIED | 6 | 6 | ~30s/decisão (~3min) | ~1.692 est. |

**Batch corta as requests do motor em ~6x** (7→1) e os free models passaram de "3-6 min com 5-6 decisões" para **uma decisão única de 4-74s** — com o mesmo DONE-VERIFIED e verifier PASS em todos. O ganho espelha o -53% steps/tarefa do OSWorld-v2 reportado pelo OpenGCUA (aqui mais extremo porque a T4 é determinística uma vez observada).

### Qualidade dos planos (free models)

Os três free models (minimax, glm, deepseek) **planejaram corretamente na primeira e única tentativa**: `[type name, type email, select Pro, click terms, click submit, assert_text "OK:", done]` — incluindo o assert final. O estado explícito do snapshot (v2.1) continua sendo o que torna isso possível.

## MiniMax M3.1 Flash free — rotas verificadas

| Rota | Modelo | Status |
|---|---|---|
| **kilocode** | `minimax/minimax-m3.1-flash:free` | ✅ T4 batch 4.3s / 741 tok (key .env) |
| **openrouter** | `minimax/minimax-m3.1-flash:free` | ✅ T4 batch 4.9s / 784 tok (key adicionada ao .env em 2026-10-19) |
| nvidia | `minimaxai/minimax-3.1-flash` | ❌ não existe no catálogo NIM (83 models, 0 minimax) |

OpenRouter `:free` catalog (18 modelos): minimax-m3.1-flash, nemotron-3-super/ultra, nemotron-3.5-lightning, gemma-4-26b/31b, inkling, laguna-s/xs-2.1, xing4.0, dots-3-note, lfm-2.5-2.6b, north-mini-code, flint-v1.0, content-safety (não-chat). Motor `openrouter` integrado ao agent_loop (batch + single).

## Ambientes/keys — estado em 2026-10-19

- opencode CLI: **API key expirada** ("Create a new API key in OpenCode Console") — tier 2 down
- kilocode: key do `.env` OK; a do credential_pool do Hermes é outra (401) — usar a do .env
- NIM: 2 keys válidas, catálogo 83 modelos; deepseek-v4.1-flash com cold-start de ~89s hoje (probe simples), glm-5.3 normal
- TypeSafe JEV: OK

## Evidências

- Runs (JSON completos): `$TMPDIR/v22_jev_t4.json`, `v22_kilocode_minimax-m3.1-flash.json`, `v22_nvidia_z-ai_glm-5.3.json`, `v22_nvidia_deepseek-ai_deepseek-v4.1-flash.json` (copiados para `results/v22-logs/`)
- Gravações CDP: `~/.config/browser-harness/agent-workspace/recordings/ub22-*` (copiadas para `recordings/`)
- Vídeos MP4 identificados: `recordings/videos/v22-{engine}-t4-*.mp4`
- Erro opencode registrado: `v22_deepseek-v4.1-flash-free.json`, `v22_mimo-v2.6-flash-free.json`, `v22_big-pickle.json` (todos "API key has expired")

## Conclusão

Batch/code-action é o modo default da v2.2: mesma confiabilidade (verifier PASS em 4/4 motores), custo de motor 6x menor, e os free models ficam finalmente competitivos com o JEV em tarefas determinísticas (4.3s vs 0.51s) a custo zero. JEV mantém a vantagem em routing fino, confiança por decisão e tarefas não-determinísticas onde re-planejamento por observação importa.
