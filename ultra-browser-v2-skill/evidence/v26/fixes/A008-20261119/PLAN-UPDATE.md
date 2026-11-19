# Ajuste após primeira execução e revisão

after-01 26/32 revelou parser single incapaz de scope aninhado e id sem função
acrescentado pelo single a wait/nav. Não enfraquecer a prova: usar JSONDecoder
para objeto/plano aninhados e omitir identidade em terminais sem alvo.

Revisor identificou que negativo esperado extraído em _expect_fail não era
consumido pela recipe sem ok:true. Acrescentar ramo explícito somente quando
op._expect_fail, row.blocked e row.expected forem true; preservar observação.
Provar replay negativo em Chromium. Não tratar bloqueio comum como sucesso.

Não acrescentar id de execução a identidade já declarada, pois restrição
cumulativa nova pode alterar semântica. Id observado só é fallback quando não
há identidade declarada. Recibos anteriores permanecem imutáveis.
