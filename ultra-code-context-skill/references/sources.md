# Proveniencia e decisoes

Inspecao: 2026-10-21 (America/Sao_Paulo; consultas UTC em 2026-10-22).
Conteudo e helper originais LabsClaw, Apache-2.0. Nenhum codigo, prompt ou bundle
upstream foi incorporado. Os links documentam ideias e interfaces externas.

## CodeGraph

Revisao `0de94978fc47c549ab1790b6234d5bdc7dda4799`:

- [README](https://github.com/colbymchenry/codegraph/blob/0de94978fc47c549ab1790b6234d5bdc7dda4799/README.md): CLI, MCP, custos processados versus contexto residente.
- [Tools](https://github.com/colbymchenry/codegraph/blob/0de94978fc47c549ab1790b6234d5bdc7dda4799/src/mcp/tools.ts): conferir schema da versao instalada.
- [Telemetria](https://github.com/colbymchenry/codegraph/blob/0de94978fc47c549ab1790b6234d5bdc7dda4799/TELEMETRY.md).

Adotado: consultar grafo preconstruido para estrutura e impacto, usando fonte
verificavel. Nao adotado: payload ilimitado e dependencia de instalacao global.
Numeros de benchmark upstream nao sao resultados desta skill.

## Cartographer

Revisao `a62d16981b6aa1f5f6ef56701c49b81a16a8e30a`:

- [README](https://github.com/kingbootoshi/cartographer/blob/a62d16981b6aa1f5f6ef56701c49b81a16a8e30a/README.md).
- [Commands](https://github.com/kingbootoshi/cartographer/blob/a62d16981b6aa1f5f6ef56701c49b81a16a8e30a/src/code-graph/commands.ts).
- [Brief](https://github.com/kingbootoshi/cartographer/blob/a62d16981b6aa1f5f6ef56701c49b81a16a8e30a/src/code-graph/brief.ts).
- [Notes](https://github.com/kingbootoshi/cartographer/blob/a62d16981b6aa1f5f6ef56701c49b81a16a8e30a/src/code-graph/notes.ts).
- [Package](https://github.com/kingbootoshi/cartographer/blob/a62d16981b6aa1f5f6ef56701c49b81a16a8e30a/package.json) e [licenca do plugin](https://github.com/kingbootoshi/cartographer/blob/a62d16981b6aa1f5f6ef56701c49b81a16a8e30a/plugins/cartographer/LICENSE).

Adotado: mapa por modulo, frescor por hashes, briefs, notas com proveniencia e
auditoria de remocao como apoio. Implementar limite rigido proprio. Nao adotado:
prometer que `--budget` e hard cap; prometer atualizacao granular do grafo quando
o codigo reconstrói; usar aceitacao de nota que finja autoria/revisao humana.
Ha discrepancia MIT no README versus Apache-2.0 no pacote v2 e ausencia de LICENSE
raiz; nao redistribuir codigo v2 com suposicao de licenca resolvida.

## Jev / TypeSafe

- [API](https://docs.typesafe.ai/api/system-one.md), [modelos](https://docs.typesafe.ai/models.md).
- [SDK JavaScript](https://docs.typesafe.ai/sdk/javascript.md), fonte [b844cd1](https://github.com/typesafe-ai/typesafe-sdk-js/tree/b844cd1aca12855a5d24a2df52a1401c86e7d37a).
- [SDK Python](https://docs.typesafe.ai/sdk/python.md), fonte [f36e685](https://github.com/typesafe-ai/typesafe-sdk-python/tree/f36e68549ceca3191e5791e5f99ea1baa1a258b5).
- [Classificacao RAG](https://docs.typesafe.ai/cookbooks/classifying_rag_passages.md).
- [Semantic find](https://docs.typesafe.ai/cookbooks/semantic_find.md).
- [Limites Jev](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md), [privacidade](https://typesafe.ai/legal/privacy-policy).

Adotado somente contrato local opcional de scores; sem cliente remoto incluido.
Nao adotado: gate obrigatorio, descarte por confianca, usar ranking como teste de
existencia, enviar codigo sem autorizacao ou confundir nao treinar com ZDR.
Docs web sao mutaveis; conferir versao, limites, termos e SDK antes de integrar.
