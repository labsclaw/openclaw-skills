# Fase 10 — JEV + DeepSeek-V4.1-Flash (value-model) na T1 X-testing (2026-10-23)

**Objetivo:** gravar execução completa do combo que faltava — JEV decide ações + **DeepSeek 4 Flash gera os valores** — na página oficial do OpenClaw, em **webm**. Padrão A/B do plano M22 deles, implementado como `--value-model`.

## Disponibilidade DeepSeek no dia
- `opencode/deepseek-v4-flash-free`: server error (lado deles)
- `nvidia deepseek-v4-flash`: HTTP 410 Gone; `deepseek-v4.1-flash`: timeout 240s+
- `kilo ~deepseek*`: 404
- **`amd DeepSeek-V4.1-Flash`: OK (45s cold-start)** — usado

## Implementação v2.4 (`--value-model engine/model`)
`make_value_model_fn()`: text_helper que manda goal + campo-alvo + histórico pro LLM, que responde **só o valor**. Fallback no helper regex. Fixes derivados dos runs:

| Fix | Achado do run |
|---|---|
| v2.4.1 select accent-insensitive (NFD) | DeepSeek respondeu "Em analise"/"Integracao" sem acento → option not found |
| v2.4.2 prompt e-mail inválido obrigatório | DeepSeek digitava o válido direto → `email_invalid_blocked` nunca acontecia |
| v2.4.3 prompt título: registro 1º, revisado só após back | `title_changed` fora de ordem |
| v2.4.4 resolveWait não devolve não-actionable | clique no save com modal fechado "passava" (ok:true) sem efeito |
| v2.4.5 falhas entram no act_history | planejador re-tentava elemento que acabara de falhar |

## Runs

| Run | Resultado | Judge |
|---|---|---|
| xt24ds (run1) | snapshot TIMEOUT | — (Chrome pediu "Allow remote debugging" pós-queda do gateway; user liberou) |
| xt24ds (run2) | LOOP-ABORT (select "Em analise" sem acento) | expôs o fix v2.4.1 |
| xt24ds2 | workflow completo, save único, persistência | 9/11 |
| xt24ds3 | **+ email_invalid_blocked** (DeepSeek tentou inválido de propósito) | **10/11, DONE-VERIFIED** |
| xt24ds4 | review_back ok, save no modal fechado | expôs v2.4.4 |
| xt24ds5 | save corretamente recusado (não-actionable) | expôs v2.4.5 |
| xt24ds6 | LOOP-ABORT cedo (variância estocástica JEV) | — |
| **xt24ds7** | **start → email_invalid_blocked → email_valid → upload → review_open → saved → persisted_read** | **10/11** (mutationCount 1, submitAttempts 1) |

O 11º check (`ordered_workflow`) exige a subsequência `review_open → review_back → title_changed → review_open → saved`; nos runs completos o JEV salvou direto do primeiro review (variância do planejador estocástico — mesma taxa do xt238 JEV puro).

## Evidências
- Log: `results/v22-logs/xt24ds7-jev-deepseek.json`
- Judge: `results/v22-logs/xt24ds7-jev-deepseek-judge.json`
- **Vídeo webm: `recordings/videos/f9-xt24ds7-jev-deepseek-xt01.webm`** (5.9MB, 20s, gravação CDP nativa)
- Vídeo mp4 alternativo: `recordings/videos/f9-xt238-jev-xt01-COMPLETE.mp4` (run JEV puro)
- Tokens JEV ~39k in/5.4k out por run completo (idêntico ao JEV puro — o value-model adiciona ~15 calls DeepSeek)

## Conclusão
Combo validado de ponta a ponta na página do OpenClaw: **JEV (decisão) + DeepSeek-V4.1-Flash free (valores) + nossa skill v2.4.5** completam a T1 com e-mail inválido proposital, upload, condicional e persistência — 10/11 no judge independente deles, mesmo placar do JEV puro, agora com cobertura do caso de validação negativa.
