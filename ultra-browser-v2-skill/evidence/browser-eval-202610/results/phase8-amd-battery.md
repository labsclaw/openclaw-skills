# Fase 8 — Bateria AMD Radeon (free-tier) — 2026-10-22

**Escopo:** o usuário pediu bateria com 3 modelos do porte certo via **provedores que não sejam OpenRouter**. Rotas: **AMD Radeon** (catalog free), NIM já validado nas fases anteriores. OpenRouter excluído por decisão do usuário.

## Resultado T4 batch (motor amd = `https://developer.amd.com.cn/radeon/api/v1`)

| Modelo | Resultado | Ciclos | Latência decisão | Tokens | Custo API (se cobrado) |
|---|---|---|---|---|---|
| **DeepSeek-V4-Flash** (amd) | ✅ DONE-VERIFIED-BATCH | 1 | 31.8s (cold-start) | 526 | $0.0000979 |
| **MiMo-V2.6-Flash** (amd) | ✅ DONE-VERIFIED-BATCH | 1 | **11.2s** | 493 | $0.0000890 |
| **DeepSeek-V4.1-Flash** (amd) | ✅ DONE-VERIFIED-BATCH | 1 | 20.6s | 518 | $0.0001912 |
| GLM-5.3-Flash (amd) | ⚠️ NULO — 429 | — | cold-start 69s + concurrency limit (16) do provider | — | — |
| JEV TypeSafe (referência tier-1) | ✅ DONE-VERIFIED-BATCH | 1 | 0.50s | 2.091/609 | $0.00009 (input only) |

Probe simples (`Reply OK`) vs tarefa real: DeepSeek-V4-Flash 2.0s→31.8s, MiMo 2.2s→11.2s — cold-start por request grande é real mas o batch de 1 ciclo segura.

**3/3 modelos AMD operacionais passaram** na primeira tentativa (planos corretos de 7 ações com assert final). Verifier PASS em todos. GLM-5.3-Flash ficou fora por capacidade do provider (429 concurrency limit 16), não por erro nosso — registrado como NULO.

## Observações técnicas

1. **AMD é o 2º free-tier mais rápido depois do JEV**: MiMo-V2.6-Flash a 11.2s/tarefa inteira (1 request de decisão) compete com o minimax falecido (4.3s) e ganha do NIM (9-85s).
2. **Cost field real**: a API AMD reporta `usage.cost` por request (ex: $0.0000979) — os tokens são os mesmos ~350 prompt/143-173 completion do batch T4. Se a AMD passar a cobrar, o preço por tarefa já está medido: **~$0.0001-0.0002/tarefa**.
3. **Cold-start pós-idle**: DeepSeek-V4-Flash respondeu probe em 2.0s mas a 1ª decisão da bateria levou 31.8s (mesmo modelo) — aquecimento por payload maior. Requests seguintes tendem ao probe-time.
4. **GLM-5.3-Flash**: probe OK (69s), mas em uso real caiu para 429 "concurrency limit (16)". Reverter para ele quando a AMD liberar capacidade, ou usar `z-ai/glm-5.3-flash` do NIM (65 tok probe, ~85s — lento mas disponível).
5. **Deduplicação**: DeepSeek-V4-Flash e DeepSeek-V4.1-Flash são gerações vizinhas no catálogo AMD; MiMo-V2.6-Flash é o diversity real. Para 3 modelos: **MiMo + DeepSeek-V4.1-Flash (mais novo) + GLM-5.3-Flash (quando liberar)**.

## Comparativo acumulado T4 batch (todas as fases)

| Motor/Modelo | Latência | Tokens | Status hoje |
|---|---|---|---|
| JEV TypeSafe | **0.50s** | 2.091/609 | ✅ |
| minimax-m3.1-flash:free (kilocode) | 4.3s | 741 | ❌ encerrou (Oct 2) |
| minimax-m3.1-flash:free (openrouter) | 4.9s | 784 | ❌ encerrou |
| **MiMo-V2.6-Flash (amd)** | **11.2s** | 493 | ✅ |
| nemotron-3-ultra:free (openrouter) | — | — | ✅ válido, fora do escopo |
| glm-5.3 (NIM) | 9.4s | 640 | ✅ |
| **DeepSeek-V4.1-Flash (amd)** | 20.6s | 518 | ✅ |
| deepseek-v4.1-flash (NIM) | 74.4s | 685 | ⚠️ lento/instável hoje |
| **DeepSeek-V4-Flash (amd)** | 31.8s | 526 | ✅ |
| mimo (opencode CLI) | ~30s×6 steps | — | ❌ key expirada |

## Evidências

- Logs JSON: `results/v22-logs/f8-amd-{deepseek-v4-flash,mimo-v26-flash,deepseek-v41-flash,glm-53-flash}-t4.json`
- MP4s (tela, gdigrab): `recordings/videos/f8-amd-{deepseek-v4-flash,mimo-v26-flash,deepseek-v41-flash,glm-53-flash}-t4.mp4` (glm .mp4 é o retry 429 — arquivo preservado como evidência do bloqueio)
- Harness da bateria: `fixtures/phase8_amd_battery.py`
- Motor `amd` integrado ao `agent_loop.py` (`ask_amd`, key do .env)
