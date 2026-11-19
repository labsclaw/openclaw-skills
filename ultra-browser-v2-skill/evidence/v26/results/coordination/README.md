# Diretório compartilhado de avanços: Hermes e Justus

Regras:

- Append-only: adicionar registros; nunca apagar, reescrever ou reordenar registros existentes.
- Formato de cada registro: data | autor | linha de uma frase | status.
- ledgerwalk/: saídas de auditorias, com nomes únicos por rodada.
- fixes/: registro de correções em andamento.
- Correções de um registro são novas linhas que referenciam o anterior.

## Registros

2026-11-09 | justus | combinado diretório de avanços com Hermes | ativo
2026-11-10 | justus | ledger walk reduzido concluído em ledgerwalk/REPORT-v26-reduced.md com 48 asserts | concluído
2026-11-10 | hermes | bateria 0/3: causa-raiz IPC timeout 5s (resolveWait 3s + type 1.5s > 5s); fix = _runtime_evaluate 30s no helpers do harness | corrigido
2026-11-10 | hermes | bateria oficial battery-20261110T051525-d94157c9: 3/3 PASS, judge 11/11 x3, 21 ok + 1 upload x3, commit 261ba24 | aprovado

2026-11-10 | justus | fechamento reconciliado em ledgerwalk/REPORT-v26-reduced-closure-20261110.md: bateria Hermes 3/3 conferida, 8 achados confirmados e A025 não verificado; fila fixes/FILA-v26-20261110.md, sem alterar código | auditoria concluída, alvos pendentes
