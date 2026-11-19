# A008, contrato antes da mudança

Base4667a88. GOAL: mesma ação executada em steps/parsed ou cycles/plan produz
native_ops equivalentes; trace/hash e ponteiros identificam fonte; verificação
fica fora do procedimento. Sem promover plano não executado ou upload pendente.

ENTRADA NORMAL: recipe.py extract TRACE -> extract_recipe -> JSON candidato;
consumidores run_recipe (native_ops), revisão do candidato e bateria com recipe
congelada. Extrator atual depende parsed, pega só primeira row e corta no save.

CONSUMIDORES/FALLBACK: manter native_ops, intent, notes, source_trace para executor
existente. Acrescentar provenance/verification sem execução automática do verifier.
Novo normalizador único, sem fallback silencioso para extrator antigo. Legado
incompleto excluído com motivo, sem inventar id/arquivo/efeito. Não reescrever
recipe revisada ou recibos. Dados de terminal sem recibo host ficam não verificados.

UNKNOWNS: formatos reais single/execute e batch/results; provar com execuções
locais reais de ambos os loops, decisões determinísticas em vez de LLM, extração
CLI e reuso de ambos os candidatos pelo runner. Testar suffix não executado,
ambiguidade/malformação, negativos esperados, upload/nav e verificação separada.

SUCCESS: testes executados com hashes antes/depois; equivalência de native_ops;
provenance por operação com SHA/pointer correto; asserts/verifier fora das ops;
entrada CLI e replay Chromium local, regressões proporcionais e revisão.

STEPS: normalizar e integrar extrator; registrar host completion em logs onde
não existia (sem mudar execução); provas/revisão/recibos e commit. Rollback4667a88.
OUT OF SCOPE: item7, judge privado, provider, captura/runtime instalado/bateria
completa; não declarar que equivalência de traces falsificados prova produção.
