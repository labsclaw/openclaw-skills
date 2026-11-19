# A008, extração normalizada

## Entrada normal e consumidores

`python scripts/recipe.py extract TRACE.json > CANDIDATO-NOVO.json` chama
extract_recipe e o normalizador único trace_recipe.extract. Não sobrescrever
recipe revisada, trace, auditoria ou recibos. `run_recipe` continua consumindo
native_ops; os demais campos são dados de revisão, não instruções executadas.

Suporta steps/parsed com exec em objeto/string JSON e cycles/plan com rows
indexadas. Uma row corresponde a uma ação do plano, não só ao primeiro item.
Fonte precisa ser um objeto JSON único, opcionalmente com linhas de stdout
antes da linha inicial `{`. JSON duplicado/ambíguo/malformado é rejeitado.

## Três saídas distintas

- `native_ops`: sequência de operações com evidência de execução. Preserva
  identidade cumulativa, escopo, role, tag, valor e postcondition declarada.
  Descarta índices/bids congelados. Id observado só serve de fallback se não
  havia identidade declarada; não acrescenta restrição a um label/tag válido.
  Wait/nav/reload não carregam identidade incidental de um elemento do snapshot.
- `provenance`: caminho absoluto e SHA-256 dos bytes da fonte, formato, modelo e
  URL registrados. Cada operação aponta action_source no documento original;
  execution_source aponta o campo exec bruto. execution_encoding informa se é
  string JSON ou objeto; execution_pointer aponta a row **após decodificar**.
  excluded registra passos sem evidência, falhas e suffix do plano não executado.
- `verification`: asserts/expect_blocked observados, especificação/verdict do
  verifier e resultado original registrados separadamente. Não são native_ops.
  `recorded-not-revalidated` não é PASS novo nem validação da recipe extraída.

O extrator não corta no primeiro save, não inventa upload fixture-evidence.txt
e não fabrica etapa ausente. Terminais exigem host.completed registrado e rc=0
quando há transporte; upload também exige confirmação upload-ok. Logs novos dos
dois loops registram esse recibo. Legado sem ele fica excluído/não verificado,
não é inferido como sucesso. Negative esperado só é preservado com declaração
e recibo correspondente; recipe aceita blocked/expected ou ausência esperada,
sem confundir falha inesperada com conclusão.

O parser de respostas de ambos os loops agora decodifica JSON aninhado, para
scope/predicados não serem perdidos por regex curta. Isso não valida a proposta
do modelo nem muda providers. Identidade ainda é conferida pelo executor.

## Reuso e limites

Candidate com excluded exige revisão antes de reuso; pode estar incompleto.
Não confundir ações equivalentes com resultado da tarefa verificado. Escolher
inputs e verifier autorizado separadamente ao executar pelo runner de ambiente.
Postcondition local continua atributo da ação; verifier final é separado.

Não foi executada inferência, transporte Hermes ou bateria histórica completa
na prova A008. Testes reais substituíram somente decisões LLM por respostas fixas
e exercitaram loops, executor, arquivos, extração CLI e replay em Chromium local.
Casos sintéticos complementares estão rotulados, não são prova de uso externo.
