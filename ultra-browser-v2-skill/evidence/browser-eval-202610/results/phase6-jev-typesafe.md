# Fase 6 — JEV TypeSafe live (2026-10-17, TYPESAFE_API_KEY fornecida pelo usuário)

## Probe de autenticação
`POST https://api.typesafe.ai/v1/systemone` — **funcionou de primeira**: `jev-1.13.0`, latência 0.51s no primeiro request (decisão de navegação real da T4).

## Integração (tier 1 do agent_loop)

Implementado em `ultra-browser-v2/scripts/agent_loop.py` (`--engine typesafe`, default quando TYPESAFE_API_KEY presente):
- **Uma request por ciclo de decisão** com 2 heads especulativos (padrão jev-ultrafast):
  - `operation` (Choice): click | type | select | done | blocked
  - `target` (Choice): índice de cada elemento visível — critérios gerados dinamicamente do snapshot
- Probabilidades + confidence gravadas no log por passo (ex: op=click 0.92, tgt=5 0.95)
- Texto de formulário via text-helper (valores vêm do goal; texto livre seria LLM)
- Fallback: `--engine opencode` (free models) continua disponível

## Resultado T4 (mesma tarefa de sempre: form + select + shadow-DOM checkbox + submit + iframe)

| Motor | Resultado | Decisões | Tokens in/out | Latência/decisão | Custo |
|---|---|---|---|---|---|
| **JEV typesafe (run 1)** | ✅ DONE-VERIFIED | 6 | — | 0.33–0.52s | — |
| **JEV typesafe (run 2, medida completa)** | ✅ DONE-VERIFIED | 7 | **4.220 / 606** | **média 0.43s** | **$0.000177** (input; output free) |
| opencode free (mimo, melhor free) | ✅ DONE-VERIFIED | 6 | ~1.692 / ~132 (est.) | ~30s (25-55s range) | $0 (free tier) |
| opencode free (deepseek) | ✅ DONE (v3) | 5 | ~1.410 / ~110 (est.) | ~25s | $0 (free tier) |
| opencode free (big-pickle) | ✅ DONE (v3) | 6 | ~1.692 / ~132 (est.) | ~37s | $0 (free tier) |

**JEV é ~70x mais rápido por decisão** que o melhor free model via opencode CLI. Medição de tokens: a API TypeSafe reporta usage por request (4.220 in / 606 out na tarefa completa); para os free models, o opencode CLI não reporta usage — estimativa pelo prompt reconstruído da T4: ~282 tokens input + ~22 output por decisão (mimo: 6 decisões ≈ 1.692 in / 132 out). Aplicando um preço hipotético de $0.07/1M in + $0.28/1M out (faixa flash), a tarefa custaria: JEV $0.000465, free models $0.00013-0.00016 — fração de centavo em qualquer motor. O fan-out especulativo funcionou como documentado: nas decisões de click no submit, `target=5` já vinha com 0.94-0.95 de probabilidade junto com a decisão de operação.

## Qualidade das decisões JEV (log do run 2)

Sequência observada: type→name, type→email, select→plan, click→terms, click→submit, done. **Zero loops, zero ações desperdiçadas** — contra os free models que precisaram de estado explícito + regra near-match + loop guard para chegar ao mesmo resultado. O design de typed questions elimina as classes de erro dos free models:
- não há como devolver JSON malformado (Choice = enum)
- não há literalismo (escolhe da lista, não "bloqueia por label")
- confidence baixa é visível (ex: tgt=0.34 no primeiro passo → poderia pedir re-decisão sem gastar execução)

## Evidências em vídeo (MP4 identificado)

`recordings/videos/`:
- `jev-typesafe-t4-ub2-1792217777.mp4` (12.0s verificado)
- `free-model-t4-ub2-1792216908.mp4` (12.7s)
- `free-model-t4-ub2-1792217310.mp4` (11.8s)

Todos com render narration/chapters do browser-harness (plan, routes, outcome card).

## Decisão de arquitetura (atualiza o model routing da skill)

| Tier | Motor | Quando |
|---|---|---|
| **1 (default)** | **JEV TypeSafe** | Sempre que TYPESAFE_API_KEY disponível — 0.4s/decisão, ~$0.00002/decisão |
| 2 | opencode CLI free | Sem key; tarefas de leitura simples; contingência |
| 3 | LLM caro | Nunca necessário na bateria — mantido só como fallback genérico |

A diretriz "se falhar mude para o do Openrouter" não foi necessária: TypeSafe funcionou direto. OpenRouter não expõe JEV no catálogo local (só kilocode tinha `typesafe/jev-router`, 402 sem créditos).
