# Seleção de modelos com evidências atuais

## Escopo e critérios

Pedido do dr. Roger em 16/11/2026: melhorar a ultra-models-skill para não eleger modelos pelo nome/tamanho e usar busca web para modelos recentes. Critérios explícitos:

1. Qualidade em tarefas reais: ferramentas, instruções, português e conclusão correta.
2. Latência com contexto e fluxo representativos, não apenas uma saudação.
3. Estabilidade, cota gratuita e compatibilidade com o harness.

A entrada agora encaminha recomendações para a referência de evidências. Ela separa catálogo, avaliações externas, testes locais e medições da rota; exige fontes/versões/datas e trata lacunas como desconhecidas. A lista de novidades não representa todo o catálogo. A busca web complementa os três critérios, não substitui testes reais.

## Compatibilidade e mecanismos

- Campos numéricos legados preservados; avisos no console e `score_evidence` no JSON identificam heurísticas não medidas.
- Planos são rascunhos, não configuração aplicada. A ordenação considera aptidão antes da nota genérica; não comprova superioridade do modelo.
- OpenCode continua com catálogo pelo CLI nativo, não autenticação/API Zen. Os testes interceptam rede e CLI, sem credenciais reais.
- As instruções orientam agentes em diferentes harnesses; não são bloqueios universais impostos pelo runtime.

## Evidências e limites

- 10 casos offline dos cinco consumidores, com CLI disponível/indisponível, verificam preservação de IDs OpenCode não confirmados, ausência de chamadas à API antiga e metadados de heurística.
- Teste adicional do entrypoint real de roteamento usa um modelo com aptidão maior e Q menor; ele precisa prevalecer, e o JSON precisa marcar o plano como rascunho.
- Validação estrutural da skill e lint local: válidos. A instalação principal do Justus está elegível e visível com a nova entrada.
- A tentativa de pesquisa atual retornou HTTP 429 do provedor Gemini da ferramenta web, não do OpenCode. Não foi produzido ranking externo nem inventado benchmark para preencher a lacuna.
- Não executada uma nova avaliação semântica/model-based de roteamento desta versão. Fixtures determinísticas não equivalem a essa avaliação. O catálogo registra `not-run` e sincronização completa pendente.
- A publicação não certifica recarga no Hermes, sincronização integral de todos os arquivos instalados nem adoção em produção. Nenhuma configuração, modelo, permissão ou credencial foi alterada.

## Entrada de uso

Ler a skill instalada; para recomendar modelos, seguir a referência de seleção, pesquisar a versão exata e montar a comparação nos três eixos. Se não houver fontes atuais ou medições suficientes, devolver shortlist provisória e a verificação delimitada que falta. A antiga ordenação heurística deixa de ser fonte de autoridade para recomendações, sem retirar campos necessários aos consumidores legados.
