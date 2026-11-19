# Captura integrada, A006

## Entrada normal

Execute a recipe pelo [runner de ambiente](environment-contract.md), com runId e
output exclusivos. Não há flag extra para habilitar captura: o runner já cria
a sessão visual, e a bateria usa o mesmo caminho no worker.

```powershell
python scripts/environment_runner.py --run-id piloto-002 --output C:/recibos recipe -- C:/entradas/recipe.json --url http://127.0.0.1:8791/xt-web-form-01 --verify "persisted_json:@C:/entradas/contrato.json" --marker X-Testing
```

Requer Playwright e Chromium, já explicitados no contrato de ambiente. Não usa
FFmpeg nem o gravador externo. Captura não é entrada do modelo, não substitui
verifier ou judge e não é transmitida para provedor pelo mecanismo implementado.

## Artefatos e associação

`OUTPUT/runId/capture/` contém PNGs numerados e `capture.json`. Na bateria:
`PILOTO/environment/runId/capture/`. O manifesto registra runId, índice, fase,
timestamp UTC, nome relativo, bytes e SHA-256. A recipe inclui a mesma estrutura
no campo `capture`; environment.json também a associa ao run.

Frames são obtidos após chamadas de host, com fases de navegação, operação
nativa, upload e reload quando reconhecidas, e no encerramento da recipe.
Falhas/exception geram tentativa de frame e registro do erro. Isso são estados
discretos, não screencast contínuo, taxa de frames garantida ou prova de toda
transição intermediária. Frames sem nome de fase específico usam after-host-call.

Arquivo é escrito com criação exclusiva e relido antes de registrar sucesso.
O backend fornece screenshot real; validação estrutural PNG, CRC e stream zlib
rejeita saída vazia/corrompida. Não é um decoder universal de imagens. A bateria
reconfere existência, identidade, integridade e equivalência dos recibos; um
`passed:true` isolado não basta.

## Falhas e compatibilidade

Falha requerida de screenshot/arquivo/manifesto produz `capture.passed=false`,
erros explícitos e `RECIPE-EVIDENCE-FAIL`, preservando `taskResultBeforeEvidence`.
O worker sai com erro; o gate da bateria recusa arquivo ausente/adulterado ou
manifesto divergente. Evidência visual boa não apaga falha anterior da tarefa.
Nada é regravado silenciosamente; nova tentativa exige runId e diretórios novos.

Chamadas diretas antigas sem Environment.bind mantêm comportamento da tarefa,
mas recebem `capture.passed=false/state=unavailable`. Resultado da tarefa não
certifica evidência nesse caminho. Para o aceite A006, usar a entrada integrada.
Não foi migrado ou certificado o transporte Hermes legado/recording. O gravador
separado continua separado, não é fallback silencioso.

Capturas podem conter dados da tarefa. Compartilhe somente artefatos autorizados,
não o diretório inteiro do perfil. Não confundir essa associação com isolamento
de rede/SO ou aprovação da bateria completa.
