# Histórico do experimento browser-eval

## Originais e precedência

Esta referência é uma nota nova de contexto. Os originais foram copiados em bytes crus, sem reescrever ou reordenar textos, estatísticas, comandos ou links. [Manifesto com tamanhos e SHA-256 de origem e destino](../evidence/browser-eval-202610/manifest.json).

A fonte histórica é o commit `40c68be498817c9787d97ce68f581081ebc078f7` do repositório local `C:/Users/ClawLabs/browser-eval`. O manifesto distingue o commit-fonte do HEAD observado do checkout. Os commits desse repositório não são ancestrais da biblioteca. A publicação preserva a narrativa do snapshot de 16 a 23/10/2026, não uma avaliação nova.

- [EXPERIMENT.md original](../evidence/browser-eval-202610/EXPERIMENT.md).
- [Fechamento incremental de 19/11 e limites atuais](../evidence/v26/closure-20261119/REPORT-FINAL.md).

**As instruções históricas NÃO são uma receita executável certificada para o pacote v2.6.** Comandos, paths, portas, perfil Chrome logado, motores, modelos, preços e disponibilidade pertencem aos ambientes/datas registrados. Não executar drivers antigos nem configurar providers por inferência a partir desses relatos. Os scripts ativos e seus contratos atuais prevalecem; este lote não os altera nem certifica adoção no runtime.

## Leitura dos resultados

Afirmações fortes como “elimina as classes de erro”, ganhos de aproximadamente 70x e vantagens de anti-detecção são observações/alegações daquele snapshot, com as limitações dos experimentos originais. Não são garantias universais, comparação A/B atual com o mesmo LLM e provedor, nem atestado do código corrigido. Não se somam resultados de tarefas, motores ou versões distintos como se fossem um par controlado. Tokens estimados não passam a medidos por esta cópia.

Os documentos incluem falhas, bloqueios e resultados parciais (inclusive 10/11), que permanecem intactos. Não substituem recibos atuais, judge independente ou verifier, nem encerram A001 parcial ou A025 não verificado. Não usar gabaritos/recibos de judge como entrada do planejador.

## Documentos de fase preservados

- [analysis-lcu-opengcua.md](../evidence/browser-eval-202610/results/analysis-lcu-opengcua.md).
- [phase0-results.md](../evidence/browser-eval-202610/results/phase0-results.md).
- [phase1-inventory.md](../evidence/browser-eval-202610/results/phase1-inventory.md).
- [phase10-jev-deepseek-webm.md](../evidence/browser-eval-202610/results/phase10-jev-deepseek-webm.md).
- [phase2-battery.md](../evidence/browser-eval-202610/results/phase2-battery.md).
- [phase3-free-models.md](../evidence/browser-eval-202610/results/phase3-free-models.md).
- [phase6-jev-typesafe.md](../evidence/browser-eval-202610/results/phase6-jev-typesafe.md).
- [phase7-v22-batch.md](../evidence/browser-eval-202610/results/phase7-v22-batch.md).
- [phase8-amd-battery.md](../evidence/browser-eval-202610/results/phase8-amd-battery.md).
- [phase8b-xt-testing.md](../evidence/browser-eval-202610/results/phase8b-xt-testing.md).
- [phase9-xt238-complete.md](../evidence/browser-eval-202610/results/phase9-xt238-complete.md).

## Fixtures incluídas e alcance

As páginas estáticas [t4-form.html](../evidence/browser-eval-202610/fixtures/html/t4-form.html) e [iframe-inner.html](../evidence/browser-eval-202610/fixtures/html/iframe-inner.html) foram copiadas integralmente. A referência relativa do iframe é preservada. A inspeção do HTML encontrou formulário vazio, placeholders e código de teste, sem registro embutido de cliente ou endpoint de provider. Isto é inspeção estática dessas duas páginas, não uma auditoria de todos os artefatos.

Este lote não executou a fixture no executor corrigido, não fez inferência e não comprova suporte universal a iframe/shadow DOM, eficiência atual ou reprodução completa. Drivers e serviços externos continuam sendo dependências históricas, não vêm instalados com estas páginas.

## Dependências que permanecem somente no acervo local

As menções originais abaixo são referências históricas, não links implicitamente disponíveis neste diretório. Os originais não tiveram os links alterados para aparentar completude:

- `recordings/`: vídeos, frames, eventos, replay e metadados. Não incluídos no lote.
- `fixtures/phase3_agent_loop.py`, `phase8_amd_battery.py`, `phase8b_xt_battery.py`, `make_videos.py`, `make_v22_videos.py`, `phase8_refix_videos.py`: drivers antigos, alguns com paths absolutos, gravação ou inferência. Não são `scripts/` ativos.
- `results/reviews/`: pareceres, patches e reproduções históricas; não aplicar patches ao código novo.
- `fixtures/phase3-logs*.json`: traces da fase3, não incluídas.
- `fixtures/html/t6-dashboard.html` e `fixtures/recovery_variants.py`: não incluídos; o adaptador também depende de `server.py` da fixture externa.
- `skills/*/SKILL.md.orig`: snapshots dos braços históricos, não novas skills nem duplicatas atuais presumidas.
- `plan/`: planos históricos referenciados; não incluídos neste lote.
- Harness/browser real, FFmpeg, serviços de modelo, credenciais, fixture/judge externos e paths sob `browser-benchmark-20261016`: não são provisionados, copiados ou autorizados por esta nota.

Parte dos logs e receitas citados já está preservada na [exportação v2.6](../evidence/README.md), em `evidence/v26/results/`; isso não equivale a copiar todo o acervo nem a reproduzir os runs. Para materiais externos a esta exportação, consultar o acervo local com sua proveniência. Não importar perfis, cookies, credenciais ou estado privado para preencher dependências ausentes.
