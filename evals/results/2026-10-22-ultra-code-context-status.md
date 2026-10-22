# Ultra Code Context: escopo de validacao

Esta candidata e experimental e existe apenas no repositorio. Nao ha sincronizacao
de runtime, release, instalacao de backend ou integracao remota Jev nesta PR.

## Roteamento

Fixtures positivas e negativas adicionadas em `evals/triggers.json`. O eval
automatizado de roteamento por modelo nao foi executado para esta candidata.
Manter `routingEval.status: not-run`, nao reutilizar resultados dos pilotos de
2026-10-05 e nao chamar testes deterministas de acuracia de roteamento.

## Verificacao executavel

```text
node --test ultra-code-context-skill/scripts/context-pack.test.mjs
python <skill-creator>/scripts/quick_validate.py ultra-code-context-skill
node scripts/validate-library.mjs
node scripts/build-catalog.mjs --check
node scripts/validate-licenses.mjs
```

Os logs/checks da PR registram execucoes reais. Testes do helper nao demonstram
ganho de recall, tokens ou custo com backends reais. Os casos de benchmark e
os limites de funcionamento estao na referencia `evaluation.md` da candidata.

O validator oficial AgentSkills, revisao
`69ef37e9424c0a7ea9dd2293b559e43ec8176379`, validou a nova skill sem erros em
ambiente temporario isolado. A revisao independente tambem exercitou um fluxo
de autenticacao em tres arquivos: pacote 1709/3000 bytes, tres evidencias
obrigatorias e uma adiada; refetch funcionou e edicao fora do intervalo invalidou
a referencia. Encontrou manifest acima de 2 MiB que o leitor recusava; o helper
agora rejeita essa publicacao e possui teste de regressao com intervalos distintos.

## Colaboracao

Solicitada no grupo Founders e CEOs entre Justus (@LabsClawBot) e Robin
(@RobinBRIAbot). A PR e o ponto de revisao conjunta. Uma revisao independente
de subagente nao equivale a participacao de Robin; nao marcar essa etapa como
concluida sem comentario ou revisao identificavel dele no GitHub.
