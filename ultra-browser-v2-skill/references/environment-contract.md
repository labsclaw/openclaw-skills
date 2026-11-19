# Ambiente contratual, A029/A030/A044

Use o runner local para solicitar e conferir viewport **CSS 1280x900** e um
perfil Chromium **novo por runId**. Playwright e seu Chromium precisam estar
instalados (`python -m pip install playwright`, `python -m playwright install chromium`).
Não instala dependências nem troca para o daemon Hermes automaticamente.

## Entrada normal

```powershell
python scripts/environment_runner.py --run-id piloto-001 --output C:/recibos recipe -- C:/entradas/recipe.json --url http://127.0.0.1:8791/xt-web-form-01 --verify "persisted_json:@C:/entradas/contrato.json" --marker X-Testing
```

Use `single` ou `batch` no lugar de `recipe`, seguido dos argumentos usuais de
agent_loop (`--url`, `--goal`, `--engine`, etc.). Seleção e autenticação do modelo
continuam as existentes; o runner não configura provedores. O exemplo usa a
palavra **run** somente internamente, não a repita depois de `recipe --`.

Por padrão o Chromium é visível. `--headless` é opção explícita de teste. A
bateria (`battery_pilot.py`) cria esse ambiente automaticamente no worker,
com o runId do piloto. Um erro na fase histórica de provenance/preflight pode
impedir que a bateria chegue ao worker; o item 4 não corrige essas dependências.

## Evidência e bloqueios

`OUTPUT/runId/` é reservado com mkdir exclusivo. Se já existir, interrompe sem
reutilizar perfil ou sobrescrever recibos. Use outro runId para outra tentativa.
O subdiretório `profile/` nasce vazio. O Chromium recebe user-data-dir exclusivo;
o runner confirma a linha de comando via CDP e cookies iniciais vazios. Registra
`environment-start.json` antes da tarefa e `environment.json` ao encerrar.

O viewport é pedido por API de launch e medido por `innerWidth/innerHeight` e
`visualViewport` antes/depois de cada chamada ao host e da tarefa. O gate exige
1280x900 e escala visual 1. `maximize()` é um no-op de compatibilidade nesse
transporte, não prova de tamanho. Resize inesperado falha antes de executar a
próxima chamada; restauração posterior não apaga o erro. Não é monitor contínuo
entre chamadas, nem mede resolução física do monitor.

Resultado `ENVIRONMENT-PASS` prova somente o ambiente: `taskExitCode` e a saída
da tarefa precisam ser conferidos separadamente. A bateria mantém judge externo
e gate da tarefa separados e acrescenta o requisito de ambiente.

## Compatibilidade e limites

O transporte local implementa os helpers atuais `js`, `goto_url`, `upload_file`
e `maximize`. Helpers ausentes, inclusive recording do Hermes, falham fechado.
Sem fallback silencioso para browser-harness. O código Python de host é código
confiável do executor, não sandbox. Perfil separado não prova bloqueio de rede,
isolamento do sistema operacional ou ausência universal de contato externo.

Chamadas diretas antigas a recipe.py/agent_loop.py continuam disponíveis para
compatibilidade, **fora deste contrato**. Não presumir dimensões erradas ou
vazamento nesses caminhos sem observação. Para o contrato, usar o runner ou o
worker novo. Não foi alterada a instalação do runtime Hermes.

Perfis permanecem no diretório de saída para inspeção; podem conter dados da
tarefa. Não anexar perfis inteiros como recibos. Guarde os JSONs e seus hashes.
