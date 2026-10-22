# Jev: decisao de inclusao

**Decisao:** interface opcional de scores, experimental e desligada por padrao.
Nao incluir SDK, chave, chamada remota automatica ou dependencia do servico.

## Onde pode ajudar

Depois da recuperacao estrutural, candidatos curtos podem precisar de ordenacao
semantica por pertinencia a pergunta. Jev pode fornecer essa ordenacao, mas nao
reconstrói chamadas, nao certifica completude e pode errar com contexto longo ou
multihop. Preservar candidatos adiados e permitir expansao deterministica.

Fluxo: backend local -> candidatos com evidencia -> reranking opcional -> helper
de budget -> selecionados + referencias adiadas. Marcar obrigatorios ANTES do
reranking. O helper continua operando sem Jev.

## Condicoes antes de conectar de verdade

- Autorizacao explicita para enviar os trechos ao provedor; self-host do backend
  nao torna a inferencia Jev local. Remover dados fora do escopo e segredos.
- Credencial em mecanismo mascarado/segredo do ambiente, nunca no chat, arquivo
  de candidatos, prompt publicado ou repositorio.
- Versao de modelo fixada e contrato do SDK/API verificado. API documentada:
  `POST https://api.typesafe.ai/v1/systemone`; SDK JavaScript
  `@typesafe-ai/sdk` e Python `typesafe-sdk`. Nao presumir estado de conta/quota.
- Calibracao com perguntas rotuladas e tarefas separadas para avaliacao; um
  score de pertinencia nao e automaticamente uma probabilidade calibrada.
- Timeout e orcamento de custo limitados. Na falta de chave/opt-in, erro,
  ausencia de resposta ou schema invalido, manter ranking local.

A politica publica promete nao treinar/fine-tunar modelos com Input. Isso nao
equivale a retencao zero ou a processamento offline. Consultar termos vigentes.
O cookbook de classificacao de passagens faz chamada por passagem; nao assumir
que todo corpus cabe em uma chamada. Limites de estado/pergunta e rate limits
devem ser conferidos na documentacao atual, nao congelados como constantes aqui.

## Contrato local implementado

O adapter externo, quando houver, produz somente:

```json
[
  {"id": "flow-entry", "score": 0.95},
  {"id": "regression-test", "score": 0.80}
]
```

Passar o arquivo via `--scores scores.json`. IDs devem pertencer aos candidatos,
ser unicos e scores numeros finitos entre 0 e 1. Falha de validacao de qualquer
entrada invalida o conjunto inteiro e usa o ranking base com aviso. Candidatos
nao pontuados conservam seu score base; obrigatorios nunca ficam adiados para
beneficiar outro score. O helper nao aplica threshold de descarte.

O helper nao sabe se o score veio do Jev, de outro modelo ou de um operador;
`ranking` indica override validado, nao certificacao de provedor. Registrar
separadamente modelo, versao, latencia, custo e politica de envio no experimento.

## Gate para promover de experimental

Medir recall dos trechos necessarios, taxa de expansao/refetch, qualidade final,
latencia e custo total incluindo Jev. Comparar com ranking local e com backend
sem gate, usando mesma tarefa, revisao, modelo e orcamento. Inspecionar falsos
negativos, nao apenas media de tokens. Se nao houver ganho retido, deixar off.
