# Fase 9 — v2.3.8: primeira conclusão completa da T1 X-testing (2026-10-23)

**Objetivo:** resolver os 4 gaps da fase 8b (re-resolve pós re-render, upload/navigate/wait, negative asserts, loop-guard state-aware) usando técnicas dos projetos frontier (pesquisa web: Playwright locator philosophy, browser-use stable_id/bid, injeção de histórico) e completar a T1 oficial do OpenClaw.

## Iterações (cada run = 1 fix validado)

| Versão | Fix | Run | Resultado |
|---|---|---|---|
| v2.3.1 | bid persistente `data-ub2-idx` + auto-wait actionable (3s) + resolve por id/label/bid | xt231 | LOOP-ABORT (form abria mas snapshot não via campos hidden) |
| v2.3.2 | snapshot expõe hidden com marcador `(H)` | xt232 | LOOP-ABORT cedo (JEV re-clicou filter sem mudança de estado — guard velho) |
| v2.3.3 | loop-guard STATE-AWARE (repetição ≠ loop se o DOM mudou) | xt233 | abriu form 3x — JEV stateless re-executava "Criar plano" |
| v2.3.4 | `act_history` injetado no prompt (padrão browser-use) | xt234 | preencheu title1(“”)/email("qa@example.test.") — bugs de helper |
| v2.3.5–6 | terminais upload/navigate/wait no single + `upload_file` real (attach_file não existe) | xt236 | fluxo até o upload ✓ (upload: true no judge) |
| v2.3.7 | helper `title2` (correção no review) | xt237 | review+back ✓, save falhou com título vazio |
| v2.3.8 | helper `gid.startswith("title")` + título revisado do goal | **xt238** | **DONE-VERIFIED — judge 10/11** |

## Run vencedor — xt238 (judge server-side deles, 11 checks)

```
runId ✓ seed ✓ filtered_second_page ✓ fields ✓ requires_environment ✓
upload ✓ single_record ✓ single_mutation ✓ single_submit ✓ persisted_read ✓
ordered_workflow ✗ (e-mail inválido proposital não executado — pulou direto ao válido)
mutationCount: 1 · submitAttempts: 1 (idempotência perfeita)
events: table_view×3 → start → email_valid → upload → review_open → saved → persisted_read → document_reload → persisted_read
```

**Comparativo:** baseline do plano deles (B0/LLM puro e braços A/B M22) = **2/11**. Nossa v2.3.8 = **10/11**, workflow completo de verdade.

**Métricas:** 22 passos · tokens JEV ~39k in / 5.4k out · latência JEV média 0.32s/ação · gravação CDP nativa do Chrome.

## Técnicas aplicadas (mapa pesquisa → código)

1. **Playwright locator philosophy** → `resolveWait()`: locator é receita de busca re-executada a cada ação + espera até actionable (visible+enabled+estável). Matou stalls de re-render async.
2. **browser-use/simdrive stable_id** → `data-ub2-idx` injetado no snapshot; resolve por atributo sobrevive a re-render.
3. **Injeção de histórico** (browser-use) → `act_history` no prompt do planejador: JEV stateless passou a saber o que já fez.
4. **Guard por estado** → loop-abort só quando (ação repetida ∧ DOM não mudou). Correções legítimas de re-entrada deixaram de abortar.
5. **Hidden elements com `(H)`** → forms multi-etapa ficam visíveis ao planejador sem quebrar o executor (que só executa o actionable).

## Evidências

- Log: `results/v22-logs/xt238-jev-single.json` (DONE-VERIFIED)
- Judge: `results/v22-logs/xt238-jev-judge.json` (10/11)
- **Vídeo MP4: `recordings/videos/f9-xt238-jev-xt01-COMPLETE.mp4`** (1.1MB, 15.8s, gravação CDP nativa)
- Runs intermediários: `xt23[1-7]-*.json` na mesma pasta
- Commits: `9d1fdc3` (v2.3.8 + resultados) — repo `C:\Users\ClawLabs\browser-eval`

## Único check faltante: `ordered_workflow`

O fluxo exige tentar Continuar com e-mail de fixture **inválido** (validação esperada) antes de corrigir. O planejador pulou direto para o e-mail válido. Para fechar 11/11: negative assert nativo no planejador (op `expect_blocked` existe no batch; falta ensinar o single a usá-la). Roadmap v2.4.
