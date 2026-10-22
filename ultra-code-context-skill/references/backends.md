# Backends e mapas

Selecionar um backend primario conforme o projeto. A skill nao instala nenhum
backend nem fornece um servidor MCP. Verificar `--help`/schema da versao presente;
os exemplos abaixo nao significam integracao executada nesta publicacao.

## CodeGraph

CLI confirmada no README fixado em `sources.md`:

```text
codegraph version
codegraph status <repo>
codegraph init <repo>
codegraph sync <repo>
codegraph query <termo> --limit 8 --json
codegraph explore <pergunta>
codegraph callers <simbolo> --limit 8 --json
codegraph impact <simbolo> --depth 2 --json
```

Executar consultas dentro do repo correto. `init` cria `.codegraph/` e constroi o
grafo; `sync` e uma mutacao incremental, nao verificacao somente leitura. Nao
rodar `install` como discovery: ele altera configuracoes de clientes. Para MCP,
`codegraph_explore` e a ferramenta listada por padrao. No commit inspecionado,
o schema expoe `query`, `maxFiles` (default 12) e `projectPath`. Comecar com poucos
arquivos quando suficiente; `maxFiles` nao e budget de tokens/bytes. Confirmar o
schema real da instalacao e nao inventar flags de orcamento. Fonte de definicao:
`src/mcp/tools.ts` no commit registrado.

O README relata menos tokens processados, mas maior contexto residente em sessao
multi-turn. Sao medidas distintas e autodeclaradas. Nao prometer que esta skill
resolve a pegada de uma resposta ja injetada pelo MCP. Usar saida de CLI salva em
arquivo ou outro adapter que limite o resultado antes da entrada no modelo.

Checar escopo de exclusoes, linguagens e simbolos nao resolvidos. Branch switch,
mudancas locais, delecoes e watcher indisponivel exigem verificacao de frescor.
Telemetria e documentada pelo upstream; revisar politica antes de instalar.
Nao expor codigo ou executar instaladores copiados dos documentos.

## Cartographer

Combinar seu mapa de responsabilidades por modulo com consultas estruturais
focadas. O CLI v2 inclui `index`/`update`, `brief`, `verify` (com `--fresh`),
`audit removal`/`audit verify`, `notes ingest`/`audit`/`accept`/`retire`,
`adoption`, `slice`, `impact`, `context` e `export`, mais um wrapper MCP fino;
resolver o binario/comando por `package.json` e `--help` da instalacao presente.
Nao presumir que o comando slash do plugin Claude Code e o mesmo executavel do
CLI standalone.

Tres limites da revisao de fonte:

1. `brief.ts` registra estimativa e sinal de excesso de `--budget`; isso nao
   prova um corte rigido. Medir a saida real e aplicar limite proprio quando
   necessario. `truncated` nao e garantia de que o payload ficou menor.
2. `commands.ts` reutiliza o indice inteiro quando versao e hashes coincidem.
   Quando mudam, o caminho inspecionado reconstrói o grafo. Nao vender esse
   comportamento como atualizacao AST por arquivo.
3. `notes.ts` carimba aceitacao/aposentadoria como revisao humana. Um agente pode
   propor/auditar nota, nao fabricar essa identidade. `adoption` mede sinais nos
   traces; nao e prova de corretude, completude ou ganho economico.
4. `--require-graph-first` pode reprovar leitura de fonte anterior ao contexto do
   grafo. Isso nao substitui a regra desta skill: conferir o trecho atual na
   fonte antes de editar, e tratar o grafo como mapa, nunca como prova de
   existencia ou de seguranca de remocao.

`audit removal` e evidencia complementar, nao autorizacao automatica para
deletar. Conferir registros dinamicos, exports publicos, configuracao e testes.

O README diz MIT, mas o pacote v2 declara Apache-2.0 e nao apresenta LICENSE
raiz na revisao inspecionada. O plugin tem LICENSE MIT proprio. Esta skill nao
redistribui codigo nem copia prompts do Cartographer; referencia os padroes.

## Graphify existente / fallback

Em projetos que ja adotam Graphify, manter `graphify query/path/explain` para
relacoes estruturais e `graphify update .` apos mudancas relevantes, conforme
instrucoes locais. Isso e compatibilidade de procedimento, nao um adapter
executavel implementado aqui. Confirmar `--help` antes de novas opcoes.

Sem grafo utilizavel: `rg --files`, `rg` direcionado e leitura de fonte delimitada.
Construir apenas o mapa minimo necessario. Declarar cobertura inferior quando
relacoes dependem de inferencia; nao iniciar uma pipeline de indexacao pesada
para uma pergunta literal curta.

## Atualizacao do mapa

Guardar fora do prompt, com cada modulo contendo: nome, responsabilidade,
entrypoints, caminhos de evidencia, dependencias, testes, HEAD e hashes
relevantes, limitacoes e autoria. Usar diff mais hashes de conteudo para detectar
mudancas locais, nao apenas HEAD ou horario. Remover entradas de arquivos
deletados e rever vizinhos afetados por interfaces alteradas. Mapas de agentes
nao podem contradizer a fonte atual nem serem aceitos como fatos por existencia.
