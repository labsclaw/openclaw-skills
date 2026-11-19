# Evidência da avaliação (por que cada regra da skill existe)

Fonte: repo `browser-eval` — fases 0-3, executadas 2026-10-17. Toda execução gravada (CDP screencast).

## Regra → Evidência

| Regra da skill | Evidência empírica |
|---|---|
| **Estado explícito por elemento** (`value=`, `current=`, `checked=`) | v1 (label ambíguo): 0/3 modelos completaram T4 (loop infinito de re-type). v3 (estado explícito): 3/3 DONE (mimo 178s, deepseek 120s, big-pickle 222s). `results/phase3-free-models.md` |
| **Executor resolve option text → value** | v1-v2: modelo manda `select "Pro"`, `option value="pro"` nunca setado → loop de retry. Fix aplicado → T4 passa. `fixtures/phase3-logs-v1-buggy-select.json` |
| **Near-match > bloqueio** no prompt | T1 (example.com): big-pickle e deepseek BLOCKED porque link era "Learn more" vs "More information..." pedido. Regra adicionada → mimo passou na v1. `phase3-logs-v1` |
| **Verifier independente** | jev-ultrafast: "A DONE choice still requires independent outcome verification". Nosso T4-verifier por código confirmou `OK: Roger Oliveira... plano=pro` + terms=true. Fase 2 T3: resultado de voos verificado por JS, não pelo modelo. |
| **Uma decisão JSON por ciclo** | jev-ultrafast: 2.798s Wikipedia / 7.1s Flights com 1 request/ciclo e heads especulativos. Nosso loop free (opencode CLI): 25-55s/decisão — funciona, custo $0, latência é o trade-off. |
| **Recording-first** | Fase 0: gravação nativa browser-harness (frames JPEG + events.jsonl + video.html replay). Fases 2-3: todas as tarefas gravadas; events.jsonl tem URL/clique/latência por ação. |
| **Stealth em camadas** | ultra-chrome-stealth-navigator: CDP attach no Chrome real = "90% dos sinais de bot eliminados". Fase 2 T5: 0 bloqueios em 4 tentativas (2 alvos). stealth-timing: delays 300ms-2.5s, hover, scroll em passos, Turnstile passivo. |
| **Chrome real > perfil novo** | Tabela comparativa em `ultra-chrome-stealth-navigator-skill` (detectabilidade baixa vs alta). Confirmado indiretamente: T1 Google sem CAPTCHA, FRED/Danske sem challenge. |
| **pageText no snapshot** | T6 (KPI): todos os modelos extraíram o valor em 1 step ~25s sem nenhum clique. Sem pageText (v1 pré-fix T6), modelo usou WebFetch do opencode para contornar. |
| **Loop guard (mesma ação x3)** | v1: deepseek repetiu `type el=1` 8x; big-pickle `select` 6x. Guard adicionado na skill. |
| **Não confiar em screenshot** | Nenhum dos runs precisou de screenshot; tabela textual + pageText bastou. jev-ultrafast idem ("No screenshots in the default agent loop"). |

## Números-chave

- **Bateria Fase 2 (harness-CDP direto):** 5/6 PASS (T5 nulo — alvo fora do ar; 0 bloqueios bot).
- **Matriz Fase 3 free models:** v1: 3/9 → v3: 3/3 na T4 (tarefa mais difícil) + T6 3/3 (1-step) + T1 2/3 pós-regra near-match.
- **Latência por decisão:** opencode free 25-55s (stateless CLI) vs JEV pago ~1-3s (claim do repo). Custo JEV: $0.042/1M input ≈ $0.004/100k tokens.
- **Gravação:** ~60-180KB/frame JPEG, events.jsonl ~1KB/evento — evidência completa de tarefa de 3-6 min cabe em <2MB.

## Fixture para re-avaliação futura

`fixtures/html/t4-form.html` (inputs+select+shadow DOM checkbox+submit+iframe) e `t6-dashboard.html` (4 KPIs + tabela) — sirva com `python -m http.server 8765` e re-use a bateria em `fixtures/phase3_agent_loop.py` para comparar modelos novos contra o mesmo gabarito.
