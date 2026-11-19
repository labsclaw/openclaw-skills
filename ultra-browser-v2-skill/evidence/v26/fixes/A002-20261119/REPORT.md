# A002, entrega para revisão em 19/11/2026

Veredito: **fulfilled no mecanismo compartilhado**, com prova em Chromium real. Integração com o transporte browser-harness do Hermes e instalação no runtime: **não verificadas**. Não é fechamento da fila v2.6.

## Entrada, consumidores e legado

Base: master `bdbf073354dab6c36d4597de32b3fb22e3085c2a`, PR #38 já integrado. Contrato anterior à mudança em [PLAN.md](PLAN.md).

Recipe usa `recipe.execute_batch`; single usa `agent_loop.execute -> execute_batch`; batch usa `agent_loop.execute_batch`. Ambos serializam o template compartilhado de agent_loop.py. Não foi criada entrada alternativa de produção. O teste chama esses adapters, substituindo apenas o transporte por Playwright page.evaluate em Chromium isolado. Nenhum provider, LLM ou judge foi chamado.

## Mudança e aceite

- `scripts/agent_loop.py:439`: resolveWait agora é async, usa deadline monotônico (performance.now), timer limitado ao tempo restante e recoleção do DOM após ceder o event loop. Removeu-se o while síncrono, sem fallback bloqueante.
- `scripts/agent_loop.py:493`: consumidor aguarda o resolvedor; preserva erros, budgets 800/3000 ms e continuação por _expect_fail.
- `scripts/test_resolve_wait.py:24`: teste reproduzível dos adapters e callbacks reais. Não é mock de DOM ou de timer.
- `SKILL.md:15` e `evidence/README.md:3`: adendo com precedência para o patch, preservando a descrição da publicação histórica e seus manifestos.

| Critério | Evidência executada | Estado |
|---|---|---|
| Libera callbacks/event loop | baseline 5/20; after 20/20. Alvos habilitados/substituídos por setTimeout são clicados nos três adapters, com heartbeat durante a espera | fulfilled |
| Timeout limitado | Ausente/desabilitado/invisível: 3000 a 3047 ms observados. Falha esperada: 813 ms nos dois adapters batch e recipe, seguida de assert executado | fulfilled |
| Caminho bloqueante removido | Inspeção dos scripts ativos e recibo static-checks.json; resolveWait async com await no único consumidor | fulfilled |
| Protocolo compatível | Clique imediato; indisponíveis não clicados; expected failure continua; 31 testes existentes de recipe passam | fulfilled |

Tempos incluem transporte de teste e agendamento. Deadline limita a espera lógica, não garante tempo real rígido se o navegador/OS suspender execução. Callbacks atrasados por código externo também não são controlados pelo resolvedor.

## Execuções e recibos novos

No diretório ultra-browser-v2-skill:

```powershell
python -B scripts/test_resolve_wait.py --receipt evidence/v26/fixes/A002-20261119/baseline.json
python -B scripts/test_resolve_wait.py --receipt evidence/v26/fixes/A002-20261119/after.json
python -B -m unittest discover -s scripts -p 'test_recipe.py' -v
```

O primeiro comando foi executado antes da correção, no código bdbf073, com exit 1 (5/20); o segundo após a correção, com exit 0 (20/20). Não reexecutar os mesmos nomes: os recibos usam criação exclusiva. Os hashes dos scripts avaliados constam em cada JSON.

- [baseline.json](baseline.json): regressão comprovada antes da correção.
- [after.json](after.json): 20 casos aprovados após correção.
- [recipe-regression.json](recipe-regression.json): saída integral de 31 testes, exit 0.
- [full-suite-summary.json](full-suite-summary.json): resumo explícito da suíte geral, 77 testes e 19 erros, exit 1. Dependências históricas não presentes no layout publicado impedem uma alegação de suíte completa verde. Não foram corrigidas fora de escopo.
- [static-checks.json](static-checks.json): ausência do loop antigo, integridade dos arquivos históricos, lint e diff.
- [SHA256SUMS.txt](SHA256SUMS.txt): caminhos e hashes SHA-256 dos novos arquivos de evidência, incluindo este relatório, plano e teste. O próprio manifesto não se inclui.

Também executados: agents-lint (18 arquivos, 136 referências, zero achados), git diff --check e graphify update . no worktree. Graphify é índice auxiliar, não prova de funcionamento.

## Limites e próxima condição

Recibos, auditorias e cópias de código históricas permanecem byte a byte conforme Git. As cópias antigas sob evidence não são fallback ativo. Browser-eval contém alterações preexistentes e não foi modificado. Não houve mudança em opencode-zen, zen-proxy ou providers do Hermes.

A001 e demais itens não iniciados. Aguardar revisão deste A002 antes do próximo item, conforme pedido. Implementação local nesta branch, sem alegar instalação, push, merge ou uso no Hermes.
