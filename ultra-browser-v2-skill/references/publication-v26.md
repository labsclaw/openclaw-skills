# Verificação desta publicação, 19/11/2026

Escopo: commit da fonte, empacotamento do estado v2.6d e branch/PR. Sem implementação da fila, merge, release ou instalação de runtime.

Fonte: `40c68be498817c9787d97ce68f581081ebc078f7`, sobre `76eef077b8c9af28be0c4c18fb274a1baee4fea2`. A branch de publicação parte de `origin/master`, não da branch antiga v2.3.0.

## Resultado e limites

- Validador oficial AgentSkills: aprovado.
- Validação de biblioteca: 7 entradas e 42 fixtures de trigger, sem erros; aviso de tamanho do SKILL.md preservado. Fixtures não equivalem a avaliação de roteamento por modelo.
- Licenças, catálogo e testes de portabilidade do catálogo: aprovados.
- Suíte original no browser-eval: 81 testes aprovados, sem navegador/LLM ou nova bateria ao vivo. Houve ResourceWarning de arquivos abertos nos testes.
- Testes `test_recipe.py` no pacote: 31 aprovados.
- Tentativa da suíte completa no pacote: 77 testes executados, 19 erros de dependência. Requer os objetos Git `ed963ec`, fixtures e layout do browser-eval, ausentes na biblioteca. Isso é limitação observada de portabilidade, não foi corrigida alterando o executor. Não alegar suíte completa verde no pacote nem uso ao vivo validado.
- Os scripts e recibos exportados são idênticos aos objetos Git da fonte, conforme manifesto. Os testes adicionados ao pacote também são exportações, não nova implementação.

O fechamento permanece: **36 fulfilled, 7 omitted, 1 drifted, 3 N.A., A025 não verificado**. A bateria histórica 3/3 com judge 11/11 por piloto não resolve esses alvos. A fila não é autorização para implementar.

O original de SKILL.md tem versão 2.3.0 e descrições anteriores ao código v2.6d. A distribuição usa versão 2.6.0 com aviso de precedência, sem reescrever silenciosamente as evidências históricas. A fonte original está congelada no pacote. Não há certificação de generalização, adoção ou sincronização de runtime.

## Correção de empacotamento após o primeiro CI

A descrição de roteamento já auditada em master foi preservada, em vez de substituída pela descrição antiga da fonte. O SKILL.md arquivado foi renomeado para SKILL.source.md para não ser descoberto como outra skill instalável. Seus bytes e origem permanecem no manifesto. Nenhuma mudança de executor ou da fila.
