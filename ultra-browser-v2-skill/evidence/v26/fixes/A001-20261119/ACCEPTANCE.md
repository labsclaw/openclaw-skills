# A001, aceite da entrega para revisão

**Veredito: parcial.** Este registro prevalece sobre REPORT.md e checkpoints intermediários desta pasta. Não declarar A001 integralmente fulfilled: há lacuna observada no contrato legado sem pós-condição.

## Entrada e compatibilidade

Identificados antes da mudança em PLAN.md: `recipe.run_recipe -> recipe.execute_batch`, single `agent_loop.execute -> execute_batch` e batch `execute_batch`. Template compartilhado, agora equivalente também na extração da recipe. Mantidos IDs únicos e labels exatos/únicos; índice somente sem identidade semântica. Não manter fallback global/primeiro match quando scope, role, nome ou label conflitam. Ambiguidade inclui alvos ocultos. Reparo legado não pode remover escopo ou predicado: alvo contratado ausente é falha fechada. Recipes baseadas em substring ou label contraditório precisam revisão, sem modificar recibos/receitas históricas.

## Mudanças

- `scripts/agent_loop.py:403`, `:450`: DOM atual com shadow roots abertos, resolução cumulativa por scope/id/role/name/label/tag e checagem de unicidade do escopo/alvo.
- `scripts/agent_loop.py:470`, `:548`, `:559`: predicado declarativo validado, leitura antes da ação e após despacho, com polling assíncrono limitado. Exige valor esperado e mudança observada. Retorno sem predicado recebe `effect.verified=false`, não prova de efeito.
- `scripts/agent_loop.py:586`: alvo semântico ou com predicado ausente não entra em reparo legado que descartaria contrato.
- `scripts/agent_loop.py:612`, `:622`, `:638`, `:649`: integração em type/press/select/click; falha de pós-condição interrompe batch.
- `scripts/agent_loop.py:1267`: enriquecimento single preserva identidade explícita.
- `scripts/recipe.py:105`: AST extrai o mesmo literal JS avaliado do single/batch, sem execução de provider/CLI. A extração antiga mantinha escapes Python duplicados.
- `scripts/recipe.py:460`, `:499`: não descarta label com id; falha de identidade/efeito encerra sem retry, reparo ou verifier que apague falha.
- `references/semantic-targets.md`: entrada e formato consumidos de fato, com link em SKILL.md.

## Critérios e evidência executada

| Critério | Evidência | Estado |
|---|---|---|
| Homônimos em escopos distintos não se confundem | `after-accepted-scope.json`: scope_id/scope_semantic em single, batch, recipe-adapter e run_recipe. `boundaries-accepted-scope.json`: ambos os escopos clicados em ordem left/right, IDs repetidos isolados por escopo e shadow scope | fulfilled nos casos executados |
| Ambiguidade bloqueia ação | Casos scope/global/local/hidden duplicate, inclusive índice fornecido, sem clique. Ambiguidade surgindo durante espera bloqueia. Homônimo fora do scope não é acionado pelo reparador; zero chamadas a ele | fulfilled nos casos executados |
| Pós-condição observada | Efeito assíncrono correto passa; ausente, incorreto, antigo ou alterado durante espera falha. Ambiguidade posterior falha. Uma tentativa/um clique e zero reparos/verifier no erro. Predicado não pode ser descartado por fallback | fulfilled com predicado; legado sem predicado não verificado |

**Execuções do código final:**

- `after-accepted-scope.json`: 80/80, exit 0; mesmo teste corrigido que `baseline-02.json` (36/80, exit 1 contra arquivos exatos de d7c1203 em temporário).
- `boundaries-accepted-scope.json`: 10/10, exit 0, incluindo scope ausente e alvo id-only com predicado ausente, sem downgrade/reparo/verifier.
- `template-accepted-scope.json`: 6/6, exit 0, templates idênticos. Reprodução anterior em `template-before.json`: 4/6, templates distintos.
- `a002-accepted-scope.json`: 20/20, exit 0, preservando o aceite A002.
- `recipe-regression-accepted-scope.json`: 31 testes existentes, exit 0. Não é bateria com judge.
- `static-checks-closure.json`: hashes do código final conferem com os recibos acima; A002 SHA 8/8; históricos intactos, diff/lint/validação da skill.

## Limites e preservação

Chromium real isolado, adapters de produção com transporte substituído por page.evaluate. Navegação stub em run_recipe. Sem inferência, judge privado ou contato externo deliberado pelo teste. Isso não é prova de rede A025 nem teste do transporte Hermes/runtime. A suíte geral continua sem alegação de verde: seus 19 erros de dependências históricas da etapa A002 não foram apagados nem reexecutados integralmente aqui.

O teste `legacy_dispatch_unverified` confirma nos quatro caminhos que ações sem predicado continuam com `effect.verified=false`, mesmo que o despacho tenha `ok=true`. Não se pode deduzir o efeito esperado de um clique arbitrário só pelo label. Faltam contratos explícitos dos consumidores legados, ou um gate universal com migração deliberada, para fechar a cobertura integral. Não impus esse rompimento de compatibilidade silenciosamente.

Nome/role é subconjunto documentado, não implementação W3C integral. Iframes e shadow roots fechados não cobertos. Não houve sincronização de browser-eval/runtime, mudanças em providers, push/merge ou início do A005.

Todos os recibos anteriores, inclusive falhos e checkpoints com sufixo final/closure, foram preservados. Em after-01 (76/80), quatro falhas eram do setup: uma expressão retornava uma função, executada pelo Playwright antes da ação. A correção ganhou novo baseline e novos recibos. REPORT.md, static-checks.json e SHA256SUMS.txt são checkpoint anterior ao fechamento do bypass de reparo, não o inventário atual.

**Manifesto autoritativo da entrega:** SHA256SUMS-final.txt, com caminhos e hashes de todos os arquivos novos e dos testes atuais. O manifesto anterior registra hashes do checkpoint antigo; não usá-lo para validar a versão atual de test_semantic_boundaries.py. Recibos executados não foram reescritos. Consulte REPORT.md somente para o histórico de investigação anterior.
