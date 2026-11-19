# Item 4: A029/A030/A044

Base a58c426. Veredito: **fulfilled no runner Chromium local e nas entradas
exercitadas**. Não equivale à adoção no Hermes ou ao aceite da bateria completa.

## Mudanças e critérios

| Critério | Implementação | Evidência executada |
|---|---|---|
| Solicitar e conferir 1280x900 | scripts/environment_runner.py:65 solicita viewport no launch; :100 mede innerWidth/innerHeight e visualViewport; :116 confere antes/depois de cada chamada | after-final.json, requested_and_measured, live_mismatch_blocks_before_task, visible_default; medidas reais em Chromium headless e visível |
| Perfil novo por runId | environment_runner.py:65 mkdir exclusivo vazio, launch_persistent_context com user-data-dir novo, confirmação Browser.getBrowserCommandLine e cookies iniciais; :30 gate | after-final.json, receipt_A_valid, new_profile_B_clean_same_origin, receipt_B_distinct, same_run_rejected_no_overwrite; A foi marcado com cookie/localStorage, B no mesmo origin observou ambos ausentes |
| Registrar evidência | environment_runner.py:24 create-only; :65 environment-start.json; :143 environment.json final, incluindo erros; battery_pilot.py:245 worker, :440 gate do recibo | after-final.json incorpora recibos reais completos; normal_battery_worker e audit_initial_navigation_preserved |
| Maximize não basta | environment_runner.py:116 mantém maximize como no-op compatível, prova vem de medidas; environment_passed rejeita observações ausentes | baseline_no_contract observou 1100x700 em controle local, não no Hermes; maximize_not_source_of_proof e gate_rejects_maximize_only |
| Não inferir vazamento/dimensão legada | docs e escopo explícitos; nenhuma alteração de perfil existente/provider | Controle de isolamento limitado aos runs locais executados. Não se conclui nada sobre vazamento ou dimensões reais no daemon legado |

Entrada, consumidores e fallback foram identificados antes da implementação em
PLAN.md. Novo CLI environment_runner.py:167 usa recipe.main ou agent_loop.main;
agent_loop.py:1458 apenas extraiu o antigo corpo CLI para função chamável.
battery_pilot.py:135 usa o módulo canônico para impedir escape do transporte.
O worker da bateria usa ambiente novo por padrão. Legado direto continua fora
do contrato; falha do novo não cai no antigo. Procedimento e dependências:
references/environment-contract.md, alcançável pelo SKILL.md.

## Resultados e falhas preservadas

- **after-final.json: 37/37**, Chromium real. Nova confirmação **after-frozen.json:
  38/38**, adiciona hashes antes/depois e sources_unchanged, sem mudar produção.
  CLI recipe executou operação nativa
  e verifier público; single/batch CLI exercitaram navegação com zero ciclos,
  sem inferência; worker real em subprocesso executou recipe e audit.
- Modo visível padrão: viewport medido 1280x900. Headless é opção explícita.
- Resize errado bloqueia antes do código; restauração não apaga falha nem
  permite nova chamada. Gates negativos incluem perfil/command/cookie/runId,
  dimensões, prova vazia e erro anterior. Colisão de runId não altera recibo.
- a005-chromium.json **43/43**; a005-guards-final.json **51/51**;
  a002-regression.json **20/20**; a001-boundaries.json **10/10**;
  recipe-regression.json **31 testes, rc=0**.
- after-01-error.json: consulta CDP sem --enable-automation e cleanup Windows
  com arquivo em flush. Lançamento passou a pedir a flag; perfis de teste ficam
  em temporários fora do checkout para inspeção, sem deleção recursiva.
- after-02-error.json: teste chamou execute_batch com assinatura errada.
- after-03.json **33/34**: defeito real de integração, recipe carregada por outro
  alias escapou do bind. Audit dessa tentativa observou rc=4294967295 e pedido
  de permissão remote-debugging; não confirmou navegação/ação. Subprocessos da
  tentativa foram interrompidos. Corrigido load_executor, sem configurar Hermes.
- after-04.json **34/35**: revisor identificou SystemExit(0) normal atravessando
  contexto e reprovando ambiente. Corrigido tratamento do exit dentro do worker.
  Sem reescrever recibos; after-final comprovou worker corrigido.
- after-04 teve mudança de fontes durante a execução, portanto seus hashes de
  encerramento não atribuem com segurança toda a execução. Revisão apontou a
  lacuna; after-frozen adicionou prova automatizada de fontes inalteradas.

## Limites

Não foi executada a bateria histórica completa, que mantém dependências de
layout/ref Git/preflight anteriores; teste isolado do worker não a substitui.
Não foi usado LLM nem judge privado. Gate/judge independente preservados.
Não alterados runtime instalado, opencode-zen, zen-proxy ou providers.

Chamadas diretas antigas ao harness Hermes não foram migradas. Não há claim de
enforcement universal nesses caminhos, recording, confinamento de rede/SO ou
observação contínua entre chamadas. environment.json aprovado não é task PASS.
O perfil é persistente e permanece para inspeção, mas nunca é reutilizado pelo
mesmo runId. Não anexar dados do perfil como evidência pública.
