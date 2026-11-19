# Item 2, A001: entrega para revisão

Veredito do item: **parcial**. Identidade com escopo e bloqueio de ambiguidade: fulfilled nos casos executados. Pós-condição: observada quando declarada; caminho legado sem predicado continua não verificado. Não fechar A001 como fulfilled universal nem alterar a classificação da auditoria histórica.

## Entrada, consumidores e fallback, identificados antes da mudança

[PLAN.md](PLAN.md), registrado antes da implementação. Base local: `d7c12039b5e2188719bc2ffcd99b1c30cc6793f4`, A002 aprovado pelo Hermes. Branch: `fix/browser-v26-a001-20261119`.

Entrada normal: recipe.run_recipe -> recipe.execute_batch; single -> agent_loop.execute -> execute_batch; batch -> execute_batch. Todos usam o mesmo template. O teste principal também passa por run_recipe, não só por uma cópia avulsa do resolvedor.

Compatibilidade: id global único, label exato único e índices explícitos sem identidade semântica continuam aceitos. Campos de identidade são cumulativos. Não há fallback global/por índice quando scope/id/name/role conflitam. Aposentada a seleção por primeiro texto parcial. Recipes antigas que dependiam de label contraditório descartado ou substring precisam revisão, não migração silenciosa dos recibos antigos. Falhas estruturadas de identidade/efeito interrompem recipe sem reparo que retire scope e sem retry de escrita.

## Implementação, arquivo:linha

- `scripts/agent_loop.py:403`: travessia atual de DOM e shadow roots abertos, nome semântico e roles nativos limitados.
- `scripts/agent_loop.py:450`: resolvedor cumulativo por scope + id/role/name/label/tag; unicidade do container e do alvo, incluindo duplicatas ocultas; sem primeiro match ou fallback após conflito.
- `scripts/agent_loop.py:470`, `:548`, `:559`: validação e observação de pós-condição declarativa. Baseline relido imediatamente antes do despacho; polling assíncrono, igualdade estrita e mudança em relação ao baseline; timeout/stale/ambiguidade não viram sucesso.
- `scripts/agent_loop.py:609`, `:619`, `:635`, `:646`: type/press/select/click integram o observador. Sem predicado, `effect.verified=false`; `ok` legado significa despacho apenas.
- `scripts/agent_loop.py:1264`: enriquecimento single não sobrescreve identidade explícita nem injeta texto de estado como label contraditório.
- `scripts/recipe.py:105`: extrai o literal via AST, sem executar o módulo. Corrige diferença real de escapes entre recipe e single/batch; ambos agora geram JS idêntico.
- `scripts/recipe.py:460`: preserva label, scope, role, name e postcondition, mesmo com id.
- `scripts/recipe.py:499`: identidade inválida/efeito falho interrompem antes de retry/reparo/verifier final.
- `references/semantic-targets.md`: contrato de entrada, exemplo, limites e migração; descoberto pelo adendo em SKILL.md.

## Critério por critério

| Aceite | Evidência executada | Veredito |
|---|---|---|
| Homônimos em escopos distintos não se confundem | after-final: scope_id e scope_semantic nos quatro caminhos; boundaries-final: both_scopes clica left/right nessa ordem, duplicate_id_scoped escolhe só right; shadow_scope preserva container aberto | fulfilled nos casos executados |
| Ambiguidade bloqueia, não primeiro match | after-final: scope_ambiguous, global_ambiguous com índice, local_ambiguous e hidden_duplicate, sem cliques; boundaries-final: ambiguidade surgindo durante espera bloqueia antes de ação; após clique, ambiguidade da pós-condição falha e interrompe | fulfilled nos casos executados |
| Pós-condição observada, não presumida | after-final: efeito assíncrono correto passa; errado, ausente e já presente falham; boundaries-final: stale_during_wait falha, e recipe_no_replay_no_repair_no_verifier registra um clique, uma tentativa e zero chamadas ao reparador/verifier | fulfilled somente com predicado explícito; legado não verificado |

## Evidências executadas e preservação das tentativas

Todos os arquivos abaixo são novos. Caminhos relativos a esta pasta; hashes completos em [SHA256SUMS.txt](SHA256SUMS.txt).

- `baseline.json`: código A002, teste inicial, 36/80. Não comparar como teste idêntico ao final: houve correção de setup do teste.
- `after-01.json`: 76/80. Quatro falhas do teste effect_missing: expressão de setup retornava função e Playwright a executava antes da ação, gerando um hit extra. Não foi escondido nem sobrescrito.
- `baseline-02.json`: teste corrigido contra arquivos exatos de `d7c1203` em diretório temporário, 36/80, exit 1. Sem checkout destrutivo ou alteração na branch.
- `after-02.json`: 80/80, exit 0, antes do ajuste de extração AST.
- `boundaries.json`: 8/8 antes de AST.
- `template-before.json`: 4/6 e templates diferentes. Reproduz falha com espaços e aria-labelledby com duas referências no adapter recipe.
- `template-after.json`: 6/6 e templates idênticos, exit 0.
- `after-final.json`: 80/80 no estado final, exit 0. Mesmo teste que baseline-02.
- `boundaries-final.json`: 8/8 no estado final, exit 0.
- `a002-regression.json` e `a002-regression-final.json`: 20/20 em cada estado, mantendo A002.
- `recipe-regression.json` e `recipe-regression-final.json`: 31 testes existentes, exit 0. São controles unitários, não bateria completa com judge.
- `static-checks.json`: integridade histórica, diff, lint, validação da skill e hashes do código final.

Comandos no diretório ultra-browser-v2-skill (sempre escolher nome de recibo novo):

```powershell
python -B scripts/test_semantic_target.py --receipt <novo-main.json>
python -B scripts/test_semantic_boundaries.py --receipt <novo-boundaries.json>
python -B scripts/test_semantic_template.py --receipt <novo-template.json>
python -B scripts/test_resolve_wait.py --receipt <novo-a002.json>
python -B -m unittest discover -s scripts -p 'test_recipe.py' -v
```

Chromium real isolado via Playwright. Adapters de produção serializam o código real; transporte substituído por page.evaluate. No run_recipe, navegação é stub para manter a fixture em about:blank. Não houve inferência nem leitura de judge privado, nem prova do transporte Hermes/runtime. A suíte geral não foi declarada verde: os 19 erros de dependências históricas da rodada A002 permanecem uma limitação conhecida; não reexecutada integralmente aqui.

## Lacuna que impede fechar o item integralmente

Ações legadas sem postcondition mantêm compatibilidade de despacho e recebem `effect.verified=false`; o teste legacy_dispatch_unverified prova esse estado nos quatro caminhos. Não é prova de efeito. Não há forma legítima de inferir o efeito esperado de um clique arbitrário só a partir do label. Não foram inventados predicados para receitas antigas, nem removida sua evidência histórica. Para fechar a cobertura universal, consumidores precisam declarar o efeito esperado ou adotar um gate que recuse ações sem esse contrato. Esse gate universal/migração não foi imposto silenciosamente nesta entrega.

O contrato de nome/role é um subconjunto declarado, não algoritmo integral W3C; iframes e shadow roots fechados não cobertos. Não foi validada generalização para outra aplicação. Providers, browser-eval e instalação de runtime permaneceram intocados. A005 e demais itens não iniciados. Sem push/merge nesta etapa de revisão.
