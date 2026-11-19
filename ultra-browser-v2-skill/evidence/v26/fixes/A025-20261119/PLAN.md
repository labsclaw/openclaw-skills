# A025, observação e limites antes da execução

Base4adcef6. GOAL: obter observação executada de destinos durante tarefa pública
T1; só declarar fulfilled se suficiente. Caso contrário, não verificado com
tentativa, dados observados, intervalo, cobertura e impedimentos concretos.

ENTRADA NORMAL: Environment.bind -> recipe.run_recipe com entrada pública
congelada, fixture T1 local nova por runId. Observador externo ao procedimento;
não lê judge/admin/DB e não decide ações. Consumidor: recibo de rede e revisão.

MECANISMO: CDP Network no alvo e eventos request do BrowserContext, ligados antes
da navegação. Calibrar com dois origins loopback, fora do run da tarefa, sem
contato externo deliberado. Não bloquear requests nem simular ausência de tráfego.

LIMITES/UNKNOWN: CDP não observa todo host/processo/DNS, e attach ocorre após
launch. Pktmon status somente leitura retornou falha sem sessão observável;
não modificar monitor/firewall/proxy global. Registrar resultado exato, não
inferir falta de permissão ou vazamento. Recipe pública antiga pode falhar com
contratos novos; preservar a falha, não alterar baseline para produzir PASS.

SUCCESS: recibos create-only e observações reais; controles positivos do sensor;
fontes antes/depois iguais; resultado de suficiência separado de êxito da tarefa.
Fallback: não verificado, sem promover ausência no sensor a ausência universal.
STEPS: observação calibrada; revisão; consolidação dos7itens e ledger incremental.
OUT OF SCOPE: providers, judge privado, item anterior reaberto, push/merge,
enforcement novo de rede. Rollback: scripts somente de diagnóstico, recibos ficam.
