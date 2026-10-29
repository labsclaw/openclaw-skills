# Proveniência e limites de distribuição

Este pacote distribui a revisão documental v2.3.0 aprovada por Hermes e Justus.
A fonte é o repositório local `browser-eval`, revisão `ef55939`. Seus commits
originais não são ancestrais do Git desta biblioteca. O manifesto contém os
identificadores completos, os caminhos originais e SHA-256 dos bytes exportados.
Os comandos `git show` nas referências exigem aquele repositório original.

## Evidência congelada

- [Manifesto](manifest.json): inventário de scripts, template, recipe e recibos.
- [Recipe corrigida](ed963ec/results/recipes/xt24ds7-recipe.json).
- [Bateria corrigida e regressão](ed963ec/results/v22-logs/).
- [Baseline](51631c1/results/v22-logs/): mesmos nomes, outra revisão; não sobrescrever.

Os arquivos listados no manifesto são exportações byte a byte dos objetos Git.
Os quatro documentos de referência só receberam links portáveis e esta nota de
proveniência. O SKILL.md recebeu o nome de distribuição `ultra-browser-v2-skill`
e notas sobre empacotamento. Scripts e recipe não foram modificados. Cache Python
e referências antigas não revalidadas não são distribuídos. Mantém-se a licença
MIT já declarada na fonte, com texto local e escopo explícito na biblioteca.

Os logs e judges são material de auditoria externa histórica. Não disponibilizar
o judge como entrada de planejamento ou de autovalidação ao agente navegador.
Nenhuma nova execução, bateria, chamada LLM ou avaliação de roteamento foi feita
para esta publicação. O catálogo registra roteamento não executado e runtime não
sincronizado. As capacidades futuras v2.6 continuam fora do executor auditado.

## Instalação e pré-requisitos

Instalação pela biblioteca, quando solicitada:

```text
npx skills add labsclaw/openclaw-skills --skill ultra-browser-v2-skill
```

Os scripts são exemplos do ambiente Windows original, não um SDK portátil.
Exigem o browser-harness do Hermes e navegador visível; o loop aceita
`BROWSER_HARNESS` e `OPENCODE_BIN`. Outros exemplos ainda contêm caminhos locais
fixos; `battery_pilot.py` requer fixture e judge externos não incluídos. Não
executá-lo inalterado, pois reutiliza nomes de recibo. O gravador separado exige
FFmpeg. Essas dependências não são instaladas por este pacote. Não executar uma
bateria para verificar apenas documentação. Configurar autenticação somente pelo
fluxo dedicado e mascarado do ambiente, nunca por mensagem ou arquivo publicado.
