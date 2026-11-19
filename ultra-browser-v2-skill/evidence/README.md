# Publicação v2.6, proveniência e limites

Fonte: browser-eval, commit `40c68be498817c9787d97ce68f581081ebc078f7`, sobre v2.6d `76eef077b8c9af28be0c4c18fb274a1baee4fea2`.
Os commits da fonte não são ancestrais desta biblioteca; comandos `git show` das evidências exigem aquele repositório.

- [Manifesto atual](manifest.json): bytes originais, caminhos de origem e SHA-256. Exportações completas em `v26/`, sem caches.
- [Fechamento](v26/results/coordination/ledgerwalk/REPORT-v26-reduced-closure-20261110.md): 36 fulfilled, 7 omitted, 1 drifted, 3 N.A., A025 não verificado.
- [Fila pendente, sem autorização para implementar](v26/results/coordination/fixes/FILA-v26-20261110.md).
- [Bateria histórica v2.6d](v26/results/v22-logs/battery-20261110T051525-d94157c9/): 3/3, judge 11/11 em cada piloto. Não é fechamento dos alvos.
- [Manifesto v2.3.0 preservado](manifest-v230.json): executáveis antigos relocados em `v230/`; recibos de `ed963ec/` e `51631c1/` preservados.

O SKILL.md recebeu somente nome/versão de distribuição e aviso de precedência. O original está em `v26/ultra-browser-v2/SKILL.md`. Referências `v26-*` refletem a fonte atual, com links de resultados adaptados; as demais referências e README-v230.md são históricas.
Nenhum item da fila foi implementado. Nenhuma nova bateria, inferência ou avaliação de roteamento foi executada. Runtime não sincronizado. Recibos falhos e bem-sucedidos foram preservados, sem seleção por resultado.

## Pré-requisitos e uso

Instalação, somente quando solicitada: `npx skills add labsclaw/openclaw-skills --skill ultra-browser-v2-skill`.
Exemplos dependem do Windows, browser-harness do Hermes, navegador visível e fixture/judge externos; não são um SDK portátil. O loop usa `BROWSER_HARNESS` e `OPENCODE_BIN`; outros caminhos locais continuam nos exemplos. O gravador exige FFmpeg. Essas dependências não são instaladas pelo pacote.
Não executar bateria ou inferência para conferir apenas a publicação. Configurar credenciais pelo fluxo dedicado mascarado. O agente navegador não deve usar judges ou arquivos de recibos privados como entrada de planejamento/autovalidação.
