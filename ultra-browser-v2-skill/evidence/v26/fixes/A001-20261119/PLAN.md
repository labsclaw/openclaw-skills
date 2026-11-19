# Contrato A001, antes da mudança

GOAL: resolver identidade de forma cumulativa, exata e com escopo; bloquear ambiguidades; observar pós-condição explícita sem promover despacho a efeito.

Entrada normal: recipe.run_recipe -> recipe.execute_batch; single -> agent_loop.execute -> execute_batch; batch -> execute_batch. O template JS compartilhado é a implementação ativa. Recipe deve preservar label, scope, role, name e postcondition, não descartar label quando há id.

Consumidores: recipes nativas e callers single/batch. Compatibilidade: id único continua aceito; label global somente se exato e único; bid/element somente na ausência de identidade semântica, nunca como fallback após conflito. Busca parcial/primeiro match será aposentada. Se houver ambiguidade, falha estruturada sem ação nem reparo que remova o escopo. Sem postcondition declarada, retorno indica efeito não verificado, preservando o significado legado de ok como despacho, não prova do efeito. Não fingir cobertura universal dessa limitação.

Contrato novo: scope={id,role,name,tag}, com campos opcionais cumulativos e pelo menos um presente; alvo={id,role,name ou label,tag}. Role nativo derivado para button/link/textbox/checkbox/radio/combobox, ou role explícito. Nome limitado a aria-labelledby, aria-label, label associado e texto/placeholder, não implementação integral de accessible name W3C. Pós-condição declarativa: {target:{...}, property:text|value|checked|visible|exists, equals:valor, timeout_ms:0..3000}; comparar baseline anterior e observação posterior, exigindo mudança e igualdade. Ambiguidade ou formato inválido falha fechado.

UNKNOWNS: regressão de resolução e de passthrough recipe, medidas antes/depois em Chromium real isolado. O teste substitui somente transporte, sem LLM/judge; não certifica Hermes.

SUCCESS CRITERIA: homônimos em dois escopos recebem ações distintas; duplicidade local/global/scope bloqueia antes do clique, inclusive se um alvo está oculto ou há índice; id+label conflitante não cai no primeiro; efeito assíncrono correto passa, ausente/incorreto/antigo falha e interrompe batch/recipe; A002 não regride.

STEPS: registrar baseline; substituir resolvedor e preservar identidade em recipe; integrar observação explícita no executor; rodar teste Chromium e regressões; recibos novos/hash/relatório por critério. Recuperação: reverter apenas arquivos ativos desta branch, sem apagar recibos.

OUT OF SCOPE: A005 e demais itens, mudanças em providers, runtime, browser-eval e recibos históricos. Se a ausência de pós-condição em consumidores legados impedir aceite universal, declarar parcial, não fulfilled universal.
