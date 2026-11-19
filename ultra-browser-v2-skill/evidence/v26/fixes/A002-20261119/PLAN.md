# A002: contrato de execução

GOAL: eliminar a espera síncrona do resolvedor sem mudar o protocolo de ações.

UNKNOWNS: comportamento de callbacks e deadline, medidos em Chromium isolado pelo teste test_resolve_wait.py, primeiro contra master bdbf073, depois contra a correção.

SUCCESS CRITERIA: callback habilita/recria alvo durante espera e clique observa o alvo atual; alvo ausente/invisível/desabilitado não é clicado; budgets de 800 e 3000 ms encerram a espera; nenhuma espera síncrona antiga permanece em resolveWait.

Entrada normal: recipe.run_recipe -> recipe.execute_batch; agent_loop.execute (single) -> execute_batch; batch -> execute_batch. Ambos serializam o mesmo BATCH_JS_TEMPLATE. Consumidores recebem os mesmos results/stopped_at/terminal e falhas esperadas. O teste usa esses adapters reais com transporte substituído por page.evaluate em Chromium, sem inferência nem judge. Não certifica o transporte browser-harness do Hermes.

Fallback compatível: ausência continua falhando com element not found; _expect_fail continua permitindo prosseguir. Não manter busy-loop como fallback. Recuperação: reverter somente o patch em scripts/agent_loop.py, sem tocar nos recibos.

STEPS: (1) teste red no baseline; (2) async timer + await no consumidor, deadline monotônico; (3) executar teste e regressões existentes; (4) novo relatório e recibos com hashes, revisão antes de A001.

OUT OF SCOPE: A001 e demais itens, providers, instalação/runtime e sincronização browser-eval. Exportações históricas em evidence/v26/ultra-browser-v2 e manifestos não são executáveis atuais e permanecem imutáveis.
