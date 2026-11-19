# Item 4, contrato antes da mudança

Base: a58c426. Nenhum recibo anterior será alterado.

GOAL: runner solicita viewport CSS 1280x900 e perfil Chromium novo por runId,
confere observações e grava evidência create-only antes de permitir tarefa.

ENTRADA NORMAL: battery_pilot.main -> run_pilot -> --executor-worker ->
recipe.main -> run_recipe; recipe.harness e agent_loop.harness são os transportes.
Single/batch usam os mesmos helpers Python (js/goto_url/upload_file/maximize).
Hoje maximize não solicita dimensões CSS e o daemon é externo ao runner.

CONSUMIDORES: recipe, single, batch e worker da bateria. O novo runner local
instala transporte em ambos os módulos pelo tempo da tarefa, sem mudar decisões,
resolução de alvos ou judge. CLI novo permite as mesmas entradas sem contexto
privilegiado. Bateria usa esse ambiente por padrão no worker.

FALLBACK: invocações diretas antigas continuam disponíveis, explicitamente fora
do contrato verificado. Falha de lançamento, perfil, medição ou recibo bloqueia
o runner novo; nunca cai silenciosamente no daemon Hermes. Recording do harness
não suportado falha fechado. Não sincronizar instalação nem provider.

UNKNOWNS: confirmar em Chromium real comando user-data-dir, isolamento de
cookies/localStorage entre dois runs e medidas innerWidth/innerHeight/visualViewport;
exercitar operações existentes e pós-reload; simular resize indevido e falhas.

SUCCESS CRITERIA: recibos novos com pedido, perfil exclusivo vazio antes de
launch, comando CDP e medidas do viewport; testes Chromium positivos/negativos,
entrada CLI e worker normais; regressões proporcionais A002/A001/A005; revisão.

STEPS: (1) provisionar/medir perfil e transporte, (2) integrar worker/CLI e gate
de ambiente, (3) testar, revisar, documentar limites, congelar hashes e commit.

OUT OF SCOPE: itens 5-7, providers, judge privado, perfis existentes, conserto da
bateria histórica completa. Não concluir vazamento ou dimensão errada do legado
sem observação. Rollback: retornar ao commit base; recibos continuam preservados.
