# Fase 3 — Modelos Free como Motor de Decisão (2026-10-17)

**Arquitetura testada:** padrão JEV adaptado — snapshot → tabela indexada de elementos → modelo free escolhe UMA ação JSON → executa via browser-harness (CDP no Chrome real) → re-snapshot → repetir. Zero screenshots, texto estruturado apenas.

## Resultados da matriz (3 modelos × T1/T4/T6)

### v1 — Snapshot ingênuo (label ambíguo)

| Modelo | T1 (click+report) | T4 (form complexo) | T6 (KPI) |
|---|---|---|---|
| mimo-v2.6-flash-free | ✅ DONE | ❌ loop | ✅ DONE |
| big-pickle | ❌ BLOCKED (literalismo) | ❌ loop | ✅ DONE |
| deepseek-v4.1-flash-free | ❌ BLOCKED (literalismo) | ❌ loop | ✅ DONE |

### v3 — Snapshot com estado explícito (`value=...`, `current=...`, `checked=...`)

| Modelo | T4 (form complexo) | Steps | Latência total |
|---|---|---|---|
| mimo-v2.6-flash-free | ✅ DONE | 6 | 178s |
| deepseek-v4.1-flash-free | ✅ DONE | 5 | 120s |
| big-pickle | ✅ DONE | 6 | 222s |

**Verifier independente (código, não modelo): PASS** — `OK: Roger Oliveira | roger@labsclaw.dev | plano=pro`, terms=true, plan=pro.

## Achados arquiteturais (validados empiricamente)

1. **ESTADO EXPLÍCUITO É OBRIGATÓRIO para modelos pequenos.** A falha unânime na v1: inputs mostrados por placeholder → o modelo não distingue "campo vazio" de "campo preenchido" → redigita eternamente. Na v3, `value="Roger Oliveira"` vs `value=(empty)` resolveu para TODOS os 3 modelos free. É exatamente o padrão do jev-ultrafast (`Where from? · San Francisco`).
2. **Executor deve resolver option-text → option-value.** O modelo manda `select value="Pro"` (texto visível), mas `option value="pro"`. Sem resolução text→value o select nunca muda e o modelo entra em loop de retry. Fix: procurar `o.text === want || o.value === want` com fallback `includes`.
3. **Literalismo custa caro em modelos pequenos.** T1: "More information..." vs "Learn more" — big-pickle e deepseek BLOQUEARAM em vez de clicar no near-match. Regra no prompt ("click the closest match instead of blocking") corrigiu o mimo na v1; aplicar em todos.
4. **T6 (leitura de KPI) é easy para todos** — 1 step, ~25s. Modelos free são suficientes para extração; a dificuldade está em estados de UI mutantes.
5. **opencode CLI como backend de inferência funciona** — cada decisão é um `opencode run` stateless (~25-55s por passo). Lento vs JEV (7s/ciclo), mas $0 e disponível. Para produção: TypeSafe API ($0.042/1M input) daria ~10-30x mais velocidade; a skill deve ser provider-agnostic.
6. **Snapshot de texto estruturado basta** — nenhum modelo pediu screenshot; a tabela indexada + pageText resolveu tudo, mantendo o custo de token mínimo.

## Gap restante

- **Latência opencode CLI** (25-55s/decisão) domina o tempo total. Mitigações futuras: daemon opencode (sessão persistente), JEV pago, ou batching de decisões.
- **T2 (multi-hop Wikipedia) não rodado na matriz v3** — o loop v1 mostrou seletores frágeis; com estado explícito espera-se pass, mas falta validar.
