# Padrões JEV herdados (com fonte)

Os dois projetos avaliados como arquitetura (runtime free indisponível em 2026-10-17 — ver `eval-results.md` Fase 0):

## jev-ultrafast (browser-use/jev-ultrafast)

| Padrão | Como aplicamos na v2 |
|---|---|
| Action space dinâmico indexado: `[1] button · Change ticket type` — só operações suportadas oferecidas | `snapshot.js`: tabela `[idx] tag · estado`, re-indexada por ciclo |
| **Uma request por decisão** — operation+target heads especulativos numa chamada | Loop decide UMA ação JSON por ciclo (`agent_loop.py`) |
| Snapshot atômico com freshness guards | `snapshot.js` IIFE única; executor revalida elemento por índice |
| "Model output never becomes selectors, coordinates, shell commands, or executable JavaScript" | Modelo devolve só `{action, element, value}`; executor mapeia idx→elemento por walker próprio |
| "A DONE choice still requires independent outcome verification" | `verifier.js` por código; done sem PASS não encerra |
| "Wait for useful state" (200ms sugestões, 50ms animação) | `human_pause()` pós-exec; re-snapshot detecta mudança de estado |
| "No screenshots in the default agent loop" — estado estruturado | Tabela textual + pageText; CDP screencast só para evidência (recording), nunca como input do modelo |
| Texto gerado por "small LLM" só quando op=TYPE_TEXT | Free models via opencode CLI geram `value` no JSON da ação |

## jev-browser-use (wy-coliney/jev-browser-use)

| Padrão | Como aplicamos na v2 |
|---|---|
| "Jev clicks, Codex thinks and verifies" — decisões repetitivas no barato, julgamento no caro | Model routing: tier 1 JEV API (rápido) → tier 2 opencode free ($0) → tier 3 caro (fallback) |
| Handoff com completion signal trazendo o verificador de volta | `done` do modelo dispara verifier independente; falha → loop continua |
| "Jev receives accessibility text, not screenshots" | idem — a11y-ish walker textual |
| Sessões retêm progresso entre handoffs | Estado vive no navegador (Chrome real); cada decisão é stateless e o snapshot reconstroi o contexto |
| Custo: Jev $0.042/1M input vs GPT-5.6 $2-10/1M (48-238x) | Justifica o routing: 95% das decisões de navegação não precisam de frontier model (provado: 3/3 free models na T4) |

## TypeSafe primitives (docs.typesafe.ai) — hook futuro

Choice/Score/Noul com confidence por typed questions: quando `TYPESAFE_API_KEY` existir, substituir o prompt JSON do tier 2 por Choice heads com `confidence` — o loop pode pedir re-decisão quando confidence < threshold sem queimar um ciclo de execução. A interface `ask_model()` fica igual; só o transporte muda.
