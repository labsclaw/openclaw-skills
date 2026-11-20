# Fase 8b — T1 X-Testing (xt-web-form-01) na ultra-browser-v2 — 2026-10-23

**Escopo:** reaproveitar a tarefa T1 oficial do plano JEV/X-Testing do OpenClaw (`PLANO.md` do browser-benchmark-20261016) como segunda tarefa-padrão da bateria — fixture sintética deles (`fixture/server.py` + judge server-side de 11 checks), **prompt idêntico ao registrado no plano deles**, nos nossos motores. Judge deles = independência de verdade (não é o nosso verifier).

## O que a tarefa exige (vs T4)
Filtros (canal WEB + status Em análise) → paginação até DEMO-024 na página 2 → form multi-etapas → **e-mail inválido de propósito + correção** → campo condicional (Requer ambiente → Homologação sintética) → upload → modal de revisão → back-and-fix do título → submit único → **reload com persistência**. Judge valida ordered_workflow, single_mutation, upload SHA256, etc.

## Resultados (runs únicos, runId próprio por run — sem reset entre runs)

| Motor | Modo | Resultado agente | Judge deles (11 checks) | Observações |
|---|---|---|---|---|
| JEV TypeSafe (8 heads) | batch | workflow parcial | `filtered_second_page: true`; fields/upload/ordered: false | Filtros+paginação OK; plano batch trava quando a página re-renderiza (índices do snapshot invalidam entre etapas do form) |
| MiMo-V2.6-Flash (opencode CLI, **key renovada**) | single | LOOP-ABORT (9 steps) | `filtered_second_page: true`, `start` registrado; resto false | Filtros OK, chegou ao form (start), loop-guard abortou clicando 2x no "Criar plano" |

**Referência do plano deles:** B0 (LLM puro, MiMo) = juiz 2/11; M22 A/B (MiMo baseline vs JEV+MiMo) = 2/11 ambos, 18-30 calls. **Nossos runs parciais (filtros+paginação+navegação até o start do form) já cobrem o que o B0 deles fazia de igual ou melhor**, mas nenhum braço completou o workflow inteiro — a tarefa é dura de verdade (validação proposital de erro, condicionais, upload, back-and-fix, idempotência).

## Diagnóstico técnico (o que faltou — vira roadmap v2.3)

1. **Índices frágeis entre re-renders:** o snapshot indexa por posição DOM; quando o form troca de etapa, os índices apontam pra elementos novos (o jev-ultrafast resolve com freshness guards + re-resolve por node handle — o nosso batch executa a lista contra os índices do snapshot antigo). Fix: re-resolver cada ação no executor por id/label no momento da execução (matcher), não índice congelado.
2. **Ação `upload` e `reload` não existem** no nosso action space (click/type/select/assert apenas). A tarefa exige file input + navegação de volta. Fix: ops `upload(element, file)` e `navigate(url)` + `wait(selector)`.
3. **Fluxo com erro proposital** (e-mail inválido → corrigir): exige assert de ERRO esperado (negative assert) — nosso `assert_text` só cobre sucesso. Fix: `assert_text_absent`/`expect_blocked`.
4. **Modal/back-and-fix** exigem re-planejamento por observação — modo single serve, mas o loop-guard atual conta o clique repetido no mesmo botão como loop (aqui era comportamento correto: re-entrar no form após voltar). Fix: loop-guard ignorar cliques que mudam estado observável.

## Estado do MiMo free (2026-10-23)
- **opencode CLI: renovado e funcionando** (`~/.local/share/opencode/auth.json` novo login) — probe "OK" imediato
- AMD: 429 rate-limit (consumido pela bateria de hoje) — capacidade, não outage
- Portanto: MiMo free disponível via opencode; AMD aguarda janela de quota

## Evidências
- `results/v22-logs/xt01-{runid}-jev.json`, `xt01-opencode-mimo-single.json` (+ runs 1: `xt01-hermes-f8xt01b-*-jev/amd-mimo`)
- Judge JSON: `harness/runs/hermes-*` do repo deles (`~/.openclaw/workspace/pocs/browser-benchmark-20261016/harness/runs/`)
- Gravações CDP: `~/.config/browser-harness/agent-workspace/recordings/ub22-*` dos runs (--record)
- Fixture server: portas 8769/8770, runIds `hermes-f8xt01b-015010` / `hermes-xt01-mimo-020009` (state.json preservado, sem reset)

## Conclusão
A T1-Xtesting entra como **tarefa-padrão #2** da bateria (com a T4). Ela expôs exatamente as lacunas previstas pelo padrão OpenGCUA (re-resolve por estado, ops de upload/navigate, negative asserts) — nenhum motor free/LLM completou ainda, nem no plano deles (2/11). Esses 4 gaps são o roadmap da **v2.3**: executor com re-resolve por label, action space estendido, negative asserts e loop-guard com estado. O comparativo honesto: bateria dupla (T4 determinística + T1 dinâmica) separa "planeja bem" de "navega bem".
