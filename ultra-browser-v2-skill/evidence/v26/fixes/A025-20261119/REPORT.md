# Item7 A025: não verificado, com observação executada

A025 é requisito não verificado, não achado de descumprimento. Não promovido
a fulfilled/omitted/drifted/N.A. Diagnóstico executado sem erro não é aceite.

## Fonte e entrada

TASK-CONTRACT-20261019.json, prompt: "Não contate serviços externos." Fonte
pública copiada sem alteração em observation-01/task-contract.json.
Plano prévio PLAN.md. scripts/observe_network_a025.py executou Environment.bind
e recipe.run_recipe na fixture pública T1 nova, sem judge/admin/DB ou inferência.
Entrada de22ops copiada byte a byte para recipe-input.json; não foi corrigida
para fabricar completude. Não alterados proxy/firewall/providers/runtime.

## Observação real

Comando: python -B scripts/observe_network_a025.py --output
evidence/v26/fixes/A025-20261119/observation-01. Exit0: diagnóstico produzido.

- Dois controles positivos passaram: sensor viu origin loopback permitido e
  outro origin loopback de calibração. Controle ocorreu em perfil/run separado,
  não é contato Internet nem violação deliberada durante a tarefa.
- BrowserContext request e CDP-target Network foram habilitados antes de navegar.
- Janela observada da tarefa: **2026-11-19T22:09:03.587204Z até
  22:09:09.367306Z**, runId a025-c3281a759974.
- **10 eventos** de duas fontes; não são10conexões distintas. Cinco URLs distintas:
  /xt-web-form-01, /style.css, /app.js, /api/session e /api/demands com query.
- Todos os eventos observados apontaram para http://127.0.0.1:61325.
  Nenhum evento fora desse origin apareceu **nesses sensores e nessa janela**.
- task-execution.json: **RECIPE-FAIL identity invalid at step0**, primeira tentativa
  select id=channel + label=current=Todos. Só1/22ops tentada, sem execução integral.
  Não descartar o label silenciosamente nem mudar recipe histórica nesta rodada.
- observation.json registra fontes SHA antes/depois iguais e hashes dos logs.
  Fixture encerrada no finally; nenhuma configuração de captura global alterada.

## Por que não é fulfilled

1. Tarefa não percorreu o workflow integral; nada observado sobre rede das etapas
   restantes, upload, save e reload desse run.
2. Attach foi após lançamento do Chromium; não cobre startup nem histórico.
3. Sensores não cobrem todo tráfego de fundo do browser, DNS/UDP ou processos
   host. Nenhuma inferência foi chamada; transporte de provider não foi medido.
4. pktmon status retornou: "Falha ao obter o status do Packet Monitor: O sistema
   não pode encontrar o arquivo especificado." Não se obteve captura de kernel.
   Isso **não** prova falta de privilégio nem ausência/presença de contato externo.

Portanto **A025 permanece não verificado**. Não há base para alegar vazamento
ou violação. A próxima prova precisa de workflow contratual completo compatível,
com intervalo de observação e cobertura de destinos suficientes para o escopo
declarado. Não exige um produto específico nem autoriza mudar infraestrutura.
Não implementar migração da recipe/rede fora da autorização desta rodada.

## Evidência e imutabilidade

observation-01/observation.json, control-network.jsonl, task-network.jsonl,
task-execution.json, stdout/stderr da fixture e inputs públicos congelados.
os-monitor-status.json distingue consulta de status de captura efetiva.
SHA256SUMS.txt registra os novos arquivos. Nenhum recibo anterior alterado.
