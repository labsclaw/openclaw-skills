# Contrato do pacote local

O helper nao interpreta a saida textual de um backend como AST nem extrai
automaticamente IDs de qualquer ferramenta. O agente/adapter transforma os
resultados em intervalos de fonte atuais. Rodar em um repo explicito.

Entrada UTF-8:

```json
{
  "schemaVersion": 1,
  "task": "Entender como a validacao chega ao handler",
  "candidates": [
    {"id": "flow-entry", "path": "src/handler.ts", "startLine": 1, "endLine": 20, "required": true, "score": 1},
    {"id": "regression-test", "path": "tests/handler.test.ts", "startLine": 5, "endLine": 25, "required": true, "score": 0.9},
    {"id": "neighbor", "path": "src/utils.ts", "startLine": 1, "endLine": 15, "required": false, "score": 0.4}
  ]
}
```

Os caminhos e intervalos acima sao exemplos, nao arquivos fornecidos. Intervalos
sao inclusivos, com linhas comecando em 1. `score` e opcional; sem ele usa 0.
`required` e booleano. Um caller/interface/teste indispensavel deve ser incluido
explicitamente; o helper nao descobre sua relevancia ou garante recall.

## Saidas

`packet.json` contem pergunta, aviso de origem nao confiavel, ranking, avisos,
`selected` com conteudo completo e `deferred` com descritores recuperaveis.
Cada descritor identifica caminho relativo, intervalo e SHA-256 do arquivo.
O manifest irmao `packet.manifest.json` guarda todos os descritores, nao copia o
codigo. Ele fica no disco e nao deve ser carregado inteiro no prompt por padrao.

O budget mede o JSON serializado inteiro em bytes UTF-8, incluindo metadata,
referencias, avisos, escapes e newline final. Cada item e selecionado inteiro ou
adiado inteiro. Se os obrigatorios ou as referencias ultrapassam o limite, o
comando falha sem escrever o novo pacote. Estreitar a consulta ou aumentar o
orcamento deliberadamente; nao mascarar o erro truncando evidencias.

Entrada JSON, manifest e arquivos de fonte tem limite individual de 2 MiB. Se o
manifest completo ultrapassar esse tamanho, `pack` falha antes das escritas,
mesmo com budget de pacote maior. Isso garante que `read` possa reabrir o manifest.
Diretorios de saida devem existir. As duas saidas sao preparadas antes da
publicacao, mas os dois renames nao constituem transacao de filesystem: em falha
de I/O, nao consumir o par como completo; inspecionar e repetir o pack idempotente.

O helper verifica caminhos dentro do repo inclusive symlinks, IDs unicos,
intervalos validos, arquivos textuais e limites de tamanho. Nao e mecanismo de
autorizacao de leitura nem scanner de segredos. Selecionar apenas fontes
autorizadas, nao incluir credenciais. Seus arquivos locais podem conter codigo
sensivel: manter fora de Git quando nao sao entregaveis autorizados.

## Recuperar e invalidar

`read --repo ... --manifest ... --id ... --budget-bytes ...` aceita o ID original
ou referencia gerada e retorna um trecho apos conferir o hash do arquivo atual.
Se o arquivo mudou, desapareceu ou foi renomeado, recuperar a fonte novamente e
recriar o pacote; nao servir snapshot antigo como atual. Uma alteracao fora do
intervalo tambem invalida a referencia (checagem conservadora).

Sem timestamps no conteudo, repetir com mesma fonte, entrada, scores e limite
produz o mesmo resultado. Dedupe semantico entre IDs distintos continua sendo
responsabilidade do adapter; intervalos identicos nao sao prova de identidades
de simbolos iguais. Escolher IDs estaveis e nao incluir o mesmo trecho varias vezes.

O helper nao injeta conteudo na sessao, nao compacta historico, nao invoca um LLM,
nao faz chamadas HTTP e nao garante budget do prompt total. O modelo e quem
precisa consultar referencias quando a tarefa exige mais evidencia.
