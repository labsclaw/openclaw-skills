# Item 5 A006: captura integrada

Base c7cc9bf. **Fulfilled no runner Chromium local, recipe e worker integrado
exercitados**. Não certifica transporte Hermes legado ou bateria completa.

| Aceite | Mudança | Evidência executada |
|---|---|---|
| Recipe/bateria invoca captura na entrada normal | scripts/environment_runner.py:96 cria Capture; :139 captura depois das chamadas; scripts/recipe.py:416 finaliza antes de emitir o resultado; worker usa bind existente | after-02.json normal_cli e normal_worker: subprocessos reais, recipe com type/click, verifier público, 8 PNGs por run; reload_real/reload_frame com reload Chromium observado |
| Associa arquivos ao run | scripts/capture_evidence.py:59 sessão por run; :65 grava frame exclusivo e metadados; :84 manifesto; recipe/environment incluem o recibo | after-02-files-cli e after-02-files-worker: PNGs e capture.json reais, com runId, fase, UTC, bytes e SHA-256; gate confere arquivo, hash e identidade |
| Explicita falha sem sucesso artificial | scripts/recipe.py:430 finalização e RECIPE-EVIDENCE-FAIL; environment_runner.py:143/:170 preserva erros e reprova ambiente; battery_pilot.py:446 reconfere arquivos e recibo | screenshot exception, vazio, PNG inválido, colisão de frame, colisão do manifesto, frame final falho: evidência false e ambiente não verde; arquivo faltante/adulterado/run errado/path escape/false PASS rejeitados |

Entrada, consumidores, recuperação e legado definidos antes da mudança em PLAN.md.
Novo procedimento alcançável pelo SKILL.md: references/capture-evidence.md.
Não altera decisões JEV, conteúdo do verifier, gate/judge independente ou providers.

## Evidências e tentativas preservadas

- after-01.json **26/26**, fontes estáveis. PNGs originais files-cli/files-worker
  preservados. Revisor revalidou arquivos e inspecionou frame com campo A006 e SAVED.
- after-final.json **3/4**, falha de setup: copytree tentou reutilizar files-cli
  da tentativa anterior, bloqueada antes de sobrescrever. Não prova o conjunto
  ampliado. Corrigido nome de diretório por tentativa, sem alterar o recibo.
- after-02.json **31/31**, fontes estáveis por SHA antes/depois. Casos adicionais:
  capture.json preexistente não é sobrescrito; falha de escrita do manifesto
  não passa; exceção de tarefa propaga com recibo; captura boa não apaga task fail.
- environment-regression.json **38/38**, inclusive Chromium visível padrão.
- a005-chromium.json **43/43**, a005-guards.json **51/51**,
  a002-regression.json **20/20**, recipe-regression.json **31 testes, rc=0**.

Os arquivos PNG são parte da evidência, não somente caminhos prometidos. O gate
da bateria usa verify_files e comparação do recibo da recipe ao capture.json.
Recibo ausente/ilegível levanta erro e reprova run; passed:true isolado não basta.
Os arquivos de teste adulterados são cópias temporárias novas, não recibos antigos.

## Limites

Captura de estados por chamada/final, não vídeo contínuo nem toda transição.
Validação estrutural PNG/CRC/zlib e integridade de arquivo, não decoder universal.
Imagem observada não substitui verifier de campos/anexo/vínculo ou judge externo.

Legado direto fora do Environment.bind recebe capture.passed=false/unavailable;
seu resultado de tarefa não significa captura aprovada. Não foi migrado Hermes,
não foi sincronizado runtime e a bateria completa permanece não verificada pelas
dependências históricas já declaradas. O worker normal foi exercitado isoladamente,
sem LLM/judge privado. A006 não prova isolamento rede/SO nem fecha A025.

Nenhum recibo anterior alterado. Nenhum item6/7 implementado. Sem push/merge.
