# Avaliacao antes de adotar

Separar tres coisas: testes do helper, comportamento da skill, ganho real de
recuperacao. Uma nao comprova as outras. Nao publicar percentuais de economia
como nossos sem executar comparacao local.

## Comportamentos de aceitacao

- Busca literal de um nome: usar busca curta, sem indexacao desnecessaria.
- Fluxo entre arquivos: escolher backend existente, conferir frescor, recuperar
  entrypoint, implementacao, interface e testes com evidencia de caminhos.
- Resultado grande: obrigatorios cabem inteiros ou comando falha; demais itens
  ficam recuperaveis. Confirmar bytes reais, inclusive conteudo multilingue.
- Edicao local sem novo commit: hash muda e leitura de referencia antiga falha.
- Arquivo deletado/renomeado, branch alterada, grafo incompleto: nao servir mapa
  antigo nem alegar ausencia de consumidores como prova de remocao segura.
- Jev sem chave, fora de opt-in, indisponivel ou score invalido: continuar local.
- Texto recuperado com comando malicioso: tratar como dado, nao executar.
- Notas do agente: manter propostas; nao carimbar revisao humana.

## Benchmark comparativo

Congelar commit, working tree, perguntas e respostas de referencia antes de rodar.
Usar tarefas de arquitetura, impacto, diagnostico e mudanca pequena em mais de
um repositorio/linguagem. Incluir dispatch dinamico, configuracao e untracked.

Comparar bracos:

1. `rg` + leitura delimitada (baseline).
2. Backend estrutural sem esta skill.
3. Mesmo backend com brief e limite desta skill.
4. Mesmo fluxo com Jev, apenas se autorizado e calibrado.

Nao executar CodeGraph e Cartographer ao mesmo tempo no mesmo braco e atribuir
ganho a apenas um. Comparar backends em bracos separados se esse e o objetivo.

Registrar por execucao: modelo/versao, pergunta, backend/versao, revisao e diff,
indice frio/quente, cobertura, tokens de entrada/saida/processados, pico e final
de contexto residente (se observaveis), custo de indexacao e consultas, latencia,
tool calls, arquivos lidos, trechos adiados/recuperados, recall dos itens rotulados,
resposta e erros. Marcar medidas indisponiveis como nao medidas, nunca zero.

Incluir custo de construir/manter indice e do reranking. Repetir tarefas com
ordem alternada e separar sessoes novas de sessoes multi-turn; reportar dispersao
e resultados negativos, nao apenas a melhor execucao. Especificar previamente
qual perda de recall/qualidade e aceitavel para o caso; reducao de tokens so
conta como ganho quando nao quebra esse criterio.

Esta publicacao permite testes offline deterministas; nao declara benchmark
comparativo com CodeGraph, Cartographer ou Jev executado.
