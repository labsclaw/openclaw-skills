# Fechamento do ledger walk reduzido v2.6

Estado: auditoria e reconciliação concluídas; implementação dos alvos pendentes NÃO concluída.
Data: 2026-11-10. Autor: Justus. HEAD: 76eef077b8c9af28be0c4c18fb274a1baee4fea2.

Este fechamento prevalece sobre REPORT-v26-reduced.md para o estado atual e corrige A025. O original foi preservado, assim como recibos antigos. Código somente leitura; nenhuma nova execução de navegador/modelo.

## Autoridade e cobertura

Autoridade exclusiva: tabela de oito linhas Implementado versus alvo v2.6 de SKILL.md e TASK-CONTRACT-20261019.json integral. As 48 entradas foram reconciliadas com 22 consultas grep atuais. Demais arquivos são evidência, não novas fontes normativas. Em ed963ec é baseline histórico; alvo não equivale a defer. As duas fontes não revogam nem adiam os oito alvos. Delta 1a34345..HEAD: digitação clear-first, limites de delay, diagnóstico de navegação e documentação; não substitui mecanismos pendentes. As justificativas individuais abaixo são mantidas onde continuam sustentadas pelos matches atuais.

## Resultado funcional registrado pelo Hermes

Bateria: results/v22-logs/battery-20261110T051525-d94157c9; executor 261ba245337e500e3263889fc1e4cff2bcd3c8df. Conferidos summary, três receipt, três judge, três logs recipe.json, entrada congelada e hashes dos arquivos do executor. Importante: recipe.json por piloto é LOG DE EXECUÇÃO, não cópia da recipe de entrada; o hash contratual é comparado a inputs/xt24ds7-recipe.json. Não se confunde nome do artefato com seu conteúdo.

- battery-20261110T051525-d94157c9-p1: 11/11 checks; 21 operações comuns e 1 upload; uma mutação/submit; gate, judge, executor e hashes consistentes.
- battery-20261110T051525-d94157c9-p2: 11/11 checks; 21 operações comuns e 1 upload; uma mutação/submit; gate, judge, executor e hashes consistentes.
- battery-20261110T051525-d94157c9-p3: 11/11 checks; 21 operações comuns e 1 upload; uma mutação/submit; gate, judge, executor e hashes consistentes.

Esta conferência usa artefatos existentes, não é nova bateria nem aceite irrestrito. Gate 11/11 não cobre automaticamente perfil, viewport, tráfego externo ou todos os alvos estruturais. Implementação integrada e uso na fixture estão evidenciados para o caso testado; generalização e adoção fora dele não foram verificadas.

## Fontes e integridade

- C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json | SHA-256 0ff589c560efaa10fe412c8c065fac0ce7cc2ffc0c19bdb3743c600140390d09
- C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js | SHA-256 121225c1e5c52b8c2e632b1f6940dac41700330f02ead051188375eda0d17906
- C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\index.html | SHA-256 fd44092f9827ccbc29d58cdfeb631f6aa6012c361190b1ac2e506dec5a9e74a8
- C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py | SHA-256 73a54e9a8c8a2f69bff79581231ebb59625266c39d6c65b10f5f4a625eeaf6a9
- C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\harness\judge.py | SHA-256 7893f9b3ee5176f9d242e9114acd85768964f7ce0576d28d80cd2ed80e51ec7f
- C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json | SHA-256 d97addfde6e6a88c4361eccde95566398e5fd547b5b7f0e6d37ac12e8a5847cb
- C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md | SHA-256 290eef93b61d8296eb50e8d40f87d8ef0fa934379537c7100803c8e58d12ee3e
- C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py | SHA-256 1906a3604c7b98b37912fce70a72372bcdeccc808046cc1e17270f0a27443f7f
- C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py | SHA-256 252ebe1889a8974c0b19dcd24638224e3cfc181cfbb3312f8b5c015702508195
- C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py | SHA-256 66300d24cf74db4b480926487b98fd916fec10e20183d6d328ff7349d52ee5ba
- C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\verifier.js | SHA-256 20d8bdd8453511cd17060c84c82db27cb0a84f238ef039e496b9d2b4e4366894

Todos os arquivos listados conservaram o hash entre início e fim.

## Asserts e julgamento


### A001. Resolver identidade semântica com escopo e pós-condições explícitas.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:125. Julgamento: **omitted**.
Há re-resolve e efeitos de email/anexo/revisão, mas o resolvedor nativo continua global por id/primeiro texto parcial, sem contrato de escopo/role. A unicidade no reparador não implementa escopo no caminho nativo. O alvo completo não foi entregue.
Evidência grep: E-RESOLVE, E-SCOPE, E-EFFECT.

### A002. Esperar sem bloquear a página e recuperar por efeito observado.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:126. Julgamento: **drifted**.
Reparo por efeito observado e polling no host existem, mas resolveWait mantém busy-loop JS de 120 ms por ciclo; o caminho antigo não foi removido. A espera não bloqueante não é universal no executor compartilhado.
Evidência grep: E-EFFECT, E-RESOLVE.

### A003. Retomar a recipe localmente com LLM+JEV.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:127. Julgamento: **fulfilled**.
Fallback agora é opt-in, preserva checkpoint/baseline e separa resultado assistido; não usa run() como retomada. A frase hoje sem fallback ativo descreve ed963ec, não HEAD: não é drift documental independente.
Evidência grep: E-REPAIR, E-EFFECT.

### A004. Aplicar gate inicial por retorno, identidade e prontidão.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:128. Julgamento: **fulfilled**.
Retorno inicial é conferido; URL e marker são exigidos na bateria; fixture deve emitir ready com runId/origin corretos. O descarte antigo foi substituído no caminho auditado, embora permaneça sleep inicial.
Evidência grep: E-NAV.

### A005. Comparar o registro completo após reload e preservar falhas anteriores.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:129. Julgamento: **omitted**.
Falha anterior já impede verifier posterior. Porém persisted ainda procura substring em body; comparação integral existe só no judge externo, não no verifier do executor. Não confundir essa separação com ausência de judge correto.
Evidência grep: E-VERIFY, E-FULL_VERIFY, E-EFFECT.

### A006. Integrar captura na recipe e explicitar falhas de evidência.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:130. Julgamento: **omitted**.
Nenhuma chamada de captura nem registro de falha de captura no fluxo recipe/battery. --record permanece só no loop; existência de gravador separado não é integração.
Evidência grep: E-CAPTURE_TARGET, E-CAPTURE_OLD.

### A007. Criar destinos imutáveis e condicionar aceite ao judge.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:131. Julgamento: **fulfilled**.
Arquivos create-only e diretórios exclusivos; exit depende de três gates aprovados, não de substring DONE. legacyWouldPass permanece apenas diagnóstico e não decide o aceite.
Evidência grep: E-GATE.

### A008. Normalizar single/batch, registrar proveniência e separar verificação.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:132. Julgamento: **omitted**.
Extrator escolhe steps/cycles, mas lê apenas parsed: não normaliza plan. Mantém source_trace e corte no save, sem proveniência estruturada ou verification separada. O simples fallback da lista cycles não atende normalização de suas ações.
Evidência grep: E-EXTRACT, E-EXTRACT_TARGET.

### A009. id = "XT-WEB-FORM-01"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:2. Julgamento: **N.A.**.
Identidade/versão do contrato-fonte, não versão exigida do executor; preservadas sem atribuir semântica de migração inexistente.
Evidência grep: E-SOURCE_TASK, E-FIXTURE.

### A010. version = "T1-v1"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:3. Julgamento: **N.A.**.
Identidade/versão do contrato-fonte, não versão exigida do executor; preservadas sem atribuir semântica de migração inexistente.
Evidência grep: E-SOURCE_TASK, E-FIXTURE.

### A011. seed = 20261019
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:4. Julgamento: **fulfilled**.
Servidor fixa seed e judge compara com o contrato.
Evidência grep: E-FIXTURE, E-VERIFY.

### A012. Filtrar por WEB e Em análise.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Recipe seleciona os filtros; servidor registra channel/status e judge exige ambos.
Evidência grep: E-TASK, E-UI.

### A013. Localizar DEMO-024 na segunda página.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Recipe avança página e abre demanda; judge exige seleção na página 2.
Evidência grep: E-TASK, E-VERIFY.

### A014. Cadastrar plano do tipo Integração.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Valor ASCII da recipe é normalizado pelo seletor para opção acentuada; judge compara o valor final exato.
Evidência grep: E-TASK, E-UI, E-VERIFY.

### A015. Usar prioridade Alta.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Valor da recipe e comparação no judge.
Evidência grep: E-TASK, E-VERIFY.

### A016. Usar responsável Equipe Alfa.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Valor da recipe e comparação no judge.
Evidência grep: E-TASK, E-VERIFY.

### A017. Tentar continuar com email inválido e observar validação.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Entrada inválida precede Continuar; pós-condição exige mensagem nova de validação e judge exige email_invalid_blocked.
Evidência grep: E-TASK, E-EFFECT, E-FIXTURE.

### A018. Corrigir email para qa@example.test.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Segundo type no email contém valor exigido; fields do judge confere igualdade.
Evidência grep: E-TASK, E-VERIFY.

### A019. Ativar Requer ambiente.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Checkbox requires é acionado e judge exige requiresEnvironment estritamente true.
Evidência grep: E-TASK, E-UI, E-VERIFY.

### A020. Selecionar Homologação sintética no campo condicional.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
UI condiciona visibilidade ao checkbox; opção é normalizada pelo executor e conferida pelo judge.
Evidência grep: E-TASK, E-UI, E-VERIFY.

### A021. Anexar fixture-evidence.txt.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Upload nativo e confirmação de anexo; judge compara nome, tamanho e SHA-256.
Evidência grep: E-TASK, E-FIXTURE, E-VERIFY.

### A022. Abrir revisão, voltar e corrigir título para Plano WEB DEMO-024 revisado.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Sequência review/back/type title2 existe; título de cada modal é comparado por igualdade.
Evidência grep: E-TASK, E-EFFECT, E-VERIFY.

### A023. Confirmar revisão e salvar uma única vez.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Últimos dois passos são review/save; judge exige single_submit e single_mutation, não só registro único.
Evidência grep: E-TASK, E-VERIFY, E-GATE.

### A024. Recarregar e demonstrar persistência de valores, anexo e vínculo.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **fulfilled**.
Persisted dispara reload; app mostra registro e anexo; judge combina fields/upload/persisted_read. Isto atende o benchmark combinado, não transforma o verifier textual em comparação completa.
Evidência grep: E-VERIFY, E-UI, E-FIXTURE.

### A025. Não contatar serviços externos na tarefa.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **não verificado**.
Retifica omitted do relatório anterior. A fonte proíbe contato externo, mas não exige mecanismo específico de bloqueio/network ledger. Não encontrar esses mecanismos não prova descumprimento. O judge declara que tráfego externo não é inferível do DB. Sem observação de rede suficiente não há base para fulfilled, omitted ou drifted; não se usa defer/N.A. para fechar contagem.
Evidência grep: E-NETWORK_TARGET, E-UI, E-ENV_OLD; judge.json dos três pilotos, campo network_origin_assertion.

### A026. promptSha256 = "5f101ff2134ba0f8056dffcef3e6b1fd91fc1ea17deb1acbfb4a58b6c1b721d4"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:6. Julgamento: **fulfilled**.
SHA-256 recalculado em memória sobre o prompt UTF-8, resultado 5f101ff2134ba0f8056dffcef3e6b1fd91fc1ea17deb1acbfb4a58b6c1b721d4.
Evidência grep: E-SOURCE_TASK.

### A027. locale = "pt-BR"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:7. Julgamento: **fulfilled**.
HTML declara lang pt-BR e interface é em português; não alega configuração global do navegador.
Evidência grep: E-UI.

### A028. timezone = "America/Sao_Paulo"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:8. Julgamento: **fulfilled**.
Relógio público usa explicitamente America/Sao_Paulo; não alega timezone global do processo/browser.
Evidência grep: E-UI.

### A029. viewport.width = 1280
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:10. Julgamento: **omitted**.
Não há configuração ou checagem das dimensões contratuais nos runners; maximize() usa o tamanho disponível. Não se afirma dimensão real errada sem observação: a omissão é enforcement/recibo da dimensão declarada.
Evidência grep: E-ENV_TARGET, E-ENV_OLD.

### A030. viewport.height = 900
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:11. Julgamento: **omitted**.
Não há configuração ou checagem das dimensões contratuais nos runners; maximize() usa o tamanho disponível. Não se afirma dimensão real errada sem observação: a omissão é enforcement/recibo da dimensão declarada.
Evidência grep: E-ENV_TARGET, E-ENV_OLD.

### A031. fixtureAppStatus = "NOT_IMPLEMENTED"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:13. Julgamento: **N.A.**.
Marcador de planejamento do contrato T1-v1: a presença da fixture implementada supera esse status histórico. Não exige que a aplicação volte a ser não implementada.
Evidência grep: E-SOURCE_TASK, E-FIXTURE, E-UI.

### A032. upload.path = "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixtures\\fixture-evidence.txt"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:15. Julgamento: **fulfilled**.
Arquivo lido pelo caminho declarado; nome=fixture-evidence.txt, bytes=32, SHA-256=22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1. Judge confere integridade independente. Caminho é normalizado apenas para leitura Windows.
Evidência grep: E-TASK, E-VERIFY.

### A033. upload.filename = "fixture-evidence.txt"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:16. Julgamento: **fulfilled**.
Arquivo lido pelo caminho declarado; nome=fixture-evidence.txt, bytes=32, SHA-256=22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1. Judge confere integridade independente. Caminho é normalizado apenas para leitura Windows.
Evidência grep: E-TASK, E-VERIFY.

### A034. upload.bytes = 32
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:17. Julgamento: **fulfilled**.
Arquivo lido pelo caminho declarado; nome=fixture-evidence.txt, bytes=32, SHA-256=22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1. Judge confere integridade independente. Caminho é normalizado apenas para leitura Windows.
Evidência grep: E-TASK, E-VERIFY.

### A035. upload.sha256 = "22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:18. Julgamento: **fulfilled**.
Arquivo lido pelo caminho declarado; nome=fixture-evidence.txt, bytes=32, SHA-256=22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1. Judge confere integridade independente. Caminho é normalizado apenas para leitura Windows.
Evidência grep: E-TASK, E-VERIFY.

### A036. expected.demand = "DEMO-024"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:21. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A037. expected.type = "Integração"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:22. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A038. expected.priority = "Alta"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:23. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A039. expected.responsible = "Equipe Alfa"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:24. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A040. expected.email = "qa@example.test"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:25. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A041. expected.environment = "Homologação sintética"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:26. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A042. expected.title = "Plano WEB DEMO-024 revisado"
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:27. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A043. expected.records = 1
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:28. Julgamento: **fulfilled**.
Recipe/UI fornecem o valor e judge itera expected por igualdade; records é tratado pelo check single_record. Nenhuma média compensa valor divergente.
Evidência grep: E-TASK, E-VERIFY, E-UI.

### A044. Usar perfil de navegador novo por runId.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:30. Julgamento: **omitted**.
RunId novo reinicia DB/uploads, mas runner reutiliza o harness configurado sem provisionar perfil novo ou registrar a identidade do perfil. Não se infere que o harness nunca possa isolar externamente: falta o mecanismo/prova no fluxo auditado.
Evidência grep: E-ENV_TARGET, E-ENV_OLD.

### A045. Isolar DB e uploads por runId.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:30. Julgamento: **fulfilled**.
Servidor cria estado/upload em pasta do run e recusa estado preexistente; bateria usa UUID e criação exclusiva.
Evidência grep: E-FIXTURE, E-GATE.

### A046. Manter endpoint admin inacessível ao executor.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:30. Julgamento: **fulfilled**.
Servidor não expõe admin/reset/judge HTTP; julgamento ocorre em processo offline separado.
Evidência grep: E-FIXTURE.

### A047. Usar judge independente server-side.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:31. Julgamento: **fulfilled**.
Judge lê ground truth por run em processo separado depois do executor; executor não o importa.
Evidência grep: E-SAME_TASK, E-VERIFY.

### A048. Usar a mesma tarefa em todas as condições.
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:31. Julgamento: **fulfilled**.
Judge lê um contrato único e bateria congela a mesma recipe; não há branch de regra por modelo/condição no judge.
Evidência grep: E-SAME_TASK.


## ACHADOS


Somente gaps sobreviventes; não invalidam retroativamente os recibos 11/11 nem comprovam falha em todos os usos.

- A001 | omitted | Resolvedor nativo sem identidade semântica com escopo. Evidência: E-RESOLVE, E-SCOPE.
- A002 | drifted | Espera de acionabilidade ainda bloqueia callbacks com busy-loop JS. Evidência: E-EFFECT, E-RESOLVE.
- A005 | omitted | Verifier do executor não compara o registro completo após reload. Evidência: E-VERIFY, E-FULL_VERIFY.
- A006 | omitted | Captura e falhas de evidência não integradas à recipe/bateria. Evidência: E-CAPTURE_TARGET, E-CAPTURE_OLD.
- A008 | omitted | Extrator não normaliza cycles/plan nem separa proveniência/verificação. Evidência: E-EXTRACT, E-EXTRACT_TARGET.
- A029 | omitted | viewport.width = 1280 Não há configuração ou checagem das dimensões contratuais nos runners; maximize() usa o tamanho disponível. Não se afirma dimensão real errada sem observação: a omissão é enforcement/recibo da dimensão declarada. Evidência: E-ENV_TARGET, E-ENV_OLD.
- A030 | omitted | viewport.height = 900 Não há configuração ou checagem das dimensões contratuais nos runners; maximize() usa o tamanho disponível. Não se afirma dimensão real errada sem observação: a omissão é enforcement/recibo da dimensão declarada. Evidência: E-ENV_TARGET, E-ENV_OLD.
- A044 | omitted | Usar perfil de navegador novo por runId. RunId novo reinicia DB/uploads, mas runner reutiliza o harness configurado sem provisionar perfil novo ou registrar a identidade do perfil. Não se infere que o harness nunca possa isolar externamente: falta o mecanismo/prova no fluxo auditado. Evidência: E-ENV_TARGET, E-ENV_OLD.


A029/A030/A044 são omissões de configuração/enforcement no runner auditado; não demonstram dimensão real incorreta ou vazamento entre perfis. A025 sai dos achados confirmados e permanece não verificado. Fechar sua prova exige observação de rede suficiente; a fonte não obriga uma implementação específica.

## Evidências grep reproduzíveis atuais

rc=1: nenhum match no escopo explícito; rc=2 não aceito. Evidências positivas contêm caminho:linha; ausência deve ser lida junto com caminho legado positivo e justificativa de cada assert.

### E-RESOLVE
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "const resolve|cands0.find|cands.find|includes\\(want|actionable|a.element", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:348:    if (!opt) opt = Array.from(el.options).find(o => o.text.toLowerCase().includes(want));
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:382:  // v2.3.1 (pesquisa web): bid persistente — injeta data-ub2-idx em cada elemento
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:401:  const actionable = (el) => el && !el.disabled && (el.offsetParent !== null || el.getClientRects().length > 0);
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:403:  // re-resolve + espera actionable ate budget — mata stalls de re-render async)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:404:  const resolve = (a, els) => {
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:410:      const m0 = cands0.find(e =>
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:411:        norm(e.innerText).includes(want0) ||
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:412:        norm(e.getAttribute && (e.getAttribute('aria-label') || '')).includes(want0));
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:416:    if (a.bid || a.element) {
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:417:      const sel = '[data-ub2-idx="' + (a.bid || a.element) + '"]';
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:426:      const m = cands.find(e =>
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:427:        norm(e.innerText).includes(want) ||
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:428:        norm(e.getAttribute && (e.getAttribute('aria-label') || '')).includes(want) ||
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:429:        norm(e.value).includes(want) ||
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:430:        norm(e.placeholder).includes(want) ||
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:431:        (e.tagName === 'A' && norm(e.href).includes(want)));
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:434:      if (idm) { const b = cands.find(e => e.id === idm[1]); if (b) return b; }
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:436:    // v2.5.4: fallback por POSICAO so com a.element explicito — sem ele, nao achou = null
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:437:    return (a.element !== undefined && a.element !== null && els[a.element - 1]) || null;
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:439:  const resolveWait = (a, els, budgetMs) => {
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:444:      if (el && actionable(el)) return el;
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:449:    return (el && actionable(el)) ? el : null; // v2.4.4: nao devolver nao-actionable (modal fechado etc)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:494:      results.push({i, error: 'element not found (waited)', element: a.element, label: a.label, bid: a.bid});
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:531:      if (!opt) opt = Array.from(el.options).find(o => deacc(o.text).includes(want));
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1209:                                   f"this element is NOT actionable now; re-open the needed panel/step first "
```

### E-SCOPE
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "\\bscope\\b|within\\(|get_by_role|querySelector.*dialog|closest\\(", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=1
```text
(nenhum match)
```

### E-EFFECT
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "def await_effect|_t.sleep|while \\(Date.now|const until|def recover_checkpoint|observed.get|baseline=prev|fallback_jev|ASSISTED|verify_spec and|SKIPPED", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:211:def await_effect(cond_js, timeout_s=8.0, interval=0.2):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:226:            f"    _t.sleep({float(interval)})\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:282:def recover_checkpoint(log, ops, i, prev, trigger, reason, attempted, budget,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:311:                if observed.get("rc") != 0 or observed.get("error"):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:313:                if observed.get("ok") is True:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:334:                ponto_de_retomada=dict(step=i, baseline=prev, attempted=attempted),
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:383:                if observed.get("rc") != 0 or observed.get("error"):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:385:                if observed.get("ok") is True:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:412:def run_recipe(recipe_path: str, url: str, verify_spec: str = "", fallback_jev: bool = False,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:424:    nav = harness(f'goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:502:            return fallback_jev and recover_checkpoint(
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:517:                "    _t.sleep(0.3)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:520:                "    _t.sleep(2)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:530:            _t.sleep(1.0)  # v2.5.10: upload handler e async (POST + attachment render)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:551:            nav2 = harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:563:            _t.sleep(min(5, float(res.get("value") or 1)))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:608:                _t.sleep(2.5 if op.get("id") in ("review", "next") or
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:613:        if fallback_jev:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:631:    if verify_spec and log["result"] == "RECIPE-DONE":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:637:            log["result"] = ("RECIPE-DONE-VERIFIED-ASSISTED" if log["repairs"]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:640:        log["verifier"] = "SKIPPED (falha anterior — PASS nao poderia apagar)"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:665:                         fallback_jev="--fallback-jev" in sys.argv, repair_model=repair_model)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:446:      const until = Date.now() + 120;
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:447:      while (Date.now() < until) {}
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:890:    harness(f'{pre}goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:993:                harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1007:                    "    _t.sleep(1)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1048:    harness(f'{pre}goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1231:                    "    _t.sleep(1)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1242:                harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
```

### E-REPAIR
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "def repair_single|REPAIR_MODELS|REPAIR_PROVIDER|matches|len\\(matches\\)|decision = measured|fallback_jev|recover_checkpoint|--fallback-jev", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:21:  python recipe.py run <recipe.json> --url http://... [--fallback-jev]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:282:def recover_checkpoint(log, ops, i, prev, trigger, reason, attempted, budget,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:298:                   provedor=AL.REPAIR_PROVIDER, calls=[], attempt=attempt + 1)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:412:def run_recipe(recipe_path: str, url: str, verify_spec: str = "", fallback_jev: bool = False,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:502:            return fallback_jev and recover_checkpoint(
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:613:        if fallback_jev:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:665:                         fallback_jev="--fallback-jev" in sys.argv, repair_model=repair_model)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:239:REPAIR_PROVIDER = "ana-radeon"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:240:REPAIR_MODELS = frozenset(("MiMo-V2.6-Flash", "DeepSeek-V4.1-Flash"))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:243:def repair_single(contract, model="MiMo-V2.6-Flash", provider=REPAIR_PROVIDER,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:250:    if provider != REPAIR_PROVIDER or model not in REPAIR_MODELS:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:291:    matches = [e for e in els if (e.get("id") == target_id if target_id
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:293:    if len(matches) != 1:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:295:    target = matches[0]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:304:    decision = measured("jev", "jev-latest", "typesafe", jev_request)
```

### E-NAV
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "nav =|nav.get|got_url|want =|markerOk|marker not in|wait_ready|ready.get|initial_navigation", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:304:                    or (marker and marker not in (str(state.get("title", "")) + "\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:361:                    or (marker and marker not in str(fresh.get("title", "")) + "\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:392:                        or (marker and marker not in str(after.get("title", "")) +
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:424:    nav = harness(f'goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:425:    log["navigation"] = {"rc": nav.get("rc"), "url": url, "marker": marker or None}
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:426:    if nav.get("rc") != 0:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:429:        log["navigation"]["out"] = str(nav.get("out") or "")[:500]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:430:        log["navigation"]["err"] = str(nav.get("err") or "")[:500]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:431:        log["result"] = f"RECIPE-FAIL initial navigation rc={nav.get('rc')}"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:438:    want = (url or "").rstrip("/")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:439:    got_url = str(state0.get("url") or "").rstrip("/")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:440:    if got_url != want:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:441:        log["result"] = f"RECIPE-FAIL identity: url {got_url!r} != {want!r}"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:444:    if marker and marker not in hay:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:447:    log["identity"] = {"url": got_url, "title": state0.get("title"),
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:448:                       "markerOk": (True if marker else None)}
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:194:          and identity.get("markerOk") is True
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:238:                             phase="initial_navigation" if calls == 1 and code.startswith("goto_url(")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:250:                if entry["phase"] == "initial_navigation" and result.get("rc") != 0:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:284:    require(bool(audit) and audit[0].get("phase") == "initial_navigation" and
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:290:            identity.get("markerOk") is True, "identidade inicial ausente ou invalida")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:344:def wait_ready(process, log, run_id, port, timeout=15):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:352:            if ready.get("ready") is True and ready.get("runId") == run_id and \
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:353:                    ready.get("origin") == f"http://127.0.0.1:{port}":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:377:            receipt["fixture"] = wait_ready(fixture, directory / "fixture.stdout.txt", run_id, port)
```

### E-VERIFY
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "def verify|kind ==|location.reload|r0 = harness|r1 = harness|return \"PASS\"|VERIFY =|checks=dict|fields=all|single_record|persisted_read", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\harness\\judge.py"]
rc=0
```text
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\harness\judge.py:9:    seq=['email_invalid_blocked','email_valid','review_open','review_back','title_changed','review_open','saved','document_reload','persisted_read']
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\harness\judge.py:16:    checks=dict(runId=r.get('runId')==run,seed=s['seed']==c['seed'],filtered_second_page=selection,fields=all(r.get(k)==v for k,v in c['expected'].items() if k!='records'),requires_environment=r.get('requiresEnvironment') is True,ordered_workflow=pos==len(seq),upload=upload_ok,single_record=len(records)==1,single_mutation=s['mutations']==1,single_submit=s['submitAttempts']==1,persisted_read=s['reloads']>=1)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:33:VERIFY = "persisted:Plano WEB DEMO-024"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:37:                    "single_record", "single_mutation", "single_submit", "persisted_read"))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:657:def verify(spec: str):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:663:    if kind == "text_contains":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:666:    elif kind == "url_contains":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:668:    elif kind == "title_contains":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:670:    elif kind == "field_value":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:675:    elif kind == "persisted":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:678:        expr = (f"(() => (location.reload(), 'RELOADING'))()")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:679:        r0 = harness(f"print(js({json.dumps(expr)}))")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:681:        r1 = harness(f"print(js({json.dumps(f'(() => (document.body ? document.body.innerText : \'\').includes({json.dumps(arg)}) ? \'PASS: persisted\' : \'FAIL: not after reload\')()')}))")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:683:        return "PASS" if "PASS" in out else f"FAIL ({out[:80]})"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:688:    return "PASS" if "PASS" in out else f"FAIL ({out[:80]})"
```

### E-FULL_VERIFY
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "expected|attachment|demand|records|requiresEnvironment|sha256", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\verifier.js"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\verifier.js:19:      // field_value|selector|expected
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\verifier.js:23:      return (v === arg[1] || v.includes(arg[1])) ? 'PASS: field=' + v : 'FAIL: field=' + v + ' expected=' + arg[1];
```

### E-CAPTURE_TARGET
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "capture.dir|screenshot|start_recording|stop_recording|capture_error|recording_error", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=1
```text
(nenhum match)
```

### E-CAPTURE_OLD
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "start_recording|stop_recording|record", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:10:                     [--verify "text_contains:OK:"] [--record]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:884:def run_batch(url, goal, model, max_cycles, verify_spec, record, engine="typesafe",
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:889:    pre = f'start_recording(name="{rec_name}", title="{goal[:40]}")\n' if record else ""
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1039:    if record:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1040:        harness("stop_recording()", timeout=60)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1044:def run(url, goal, model, max_steps, verify_spec, record, engine="opencode", text_helper=None):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1047:    pre = f'start_recording(name="{rec_name}", title="{goal[:40]}")\n' if record else ""
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1257:    if record:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1258:        harness("stop_recording()", timeout=60)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1277:    ap.add_argument("--record", action="store_true")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1359:                           args.record, n_heads=args.n_heads, **common)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1362:                     args.record, **common)
```

### E-GATE
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "open\\(\"x\"|exist_ok=False|require\\(|CHECKS =|ordinary ==|len\\(receipts\\)|legacyWouldPass|summary\\[\"passed\"\\]|success =", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:35:CHECKS = frozenset(("runId", "seed", "filtered_second_page", "fields",
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:50:    with Path(path).open("x", encoding="utf-8", newline="\n") as stream:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:211:    check_js = """const fs=require('fs'),vm=require('vm');
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:232:    with Path(audit_path).open("x", encoding="utf-8", buffering=1) as audit:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:272:    def require(condition, reason):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:275:    require(type(recipe_rc) is int and recipe_rc == 0, "recipe process rc != 0")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:276:    require(type(judge_rc) is int and judge_rc == 0, "judge process rc != 0")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:277:    require(judge.get("runId") == run_id, "judge runId divergente")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:278:    require(judge.get("pass_") is True, "judge pass_ != true")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:280:    require(isinstance(checks, dict) and set(checks) == CHECKS and
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:282:    require(execution.get("result") == "RECIPE-DONE-VERIFIED", "resultado não verificado")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:283:    require(execution.get("verifier") == "PASS", "verifier != PASS")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:284:    require(bool(audit) and audit[0].get("phase") == "initial_navigation" and
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:289:    require(isinstance(identity, dict) and identity.get("url") == execution.get("url") and
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:291:    require(bool(audit) and all(type(a.get("rc")) is int and a["rc"] == 0 and
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:294:    require(isinstance(steps, list) and len(steps) == len(ops) == 22,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:299:            require(False, f"passo {index} inválido")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:302:        require(type(step.get("i")) is int and step["i"] == index and index < len(ops) and
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:307:            require(False, f"resultado estruturado ausente no passo {index}")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:310:        require(type(row.get("i")) is int and row["i"] == 0 and isinstance(op, dict) and
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:319:            require(confirmed, f"upload terminal não confirmado no passo {index}")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:325:            require(good, f"passo {index} sem ok:true")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:327:    require(ordinary == 21 and uploads == 1, "exigidos 21 ok:true + 1 upload confirmado")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:334:    path.mkdir(parents=False, exist_ok=False)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:371:        with (directory / "fixture.stdout.txt").open("x", encoding="utf-8") as out, \
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:372:                (directory / "fixture.stderr.txt").open("x", encoding="utf-8") as err:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:391:                receipt["legacyWouldPass"] = "DONE" in str(execution.get("result"))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:429:    return len(receipts) == 3 and len({r["runId"] for r in receipts}) == 3 and \
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:471:                if not receipt["gate"]["passed"] and receipt.get("legacyWouldPass"):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:474:            summary["passed"] = battery_passed(summary["pilots"])
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:484:    success = (summary.get("preflightPassed") is True if args.preflight_only else summary["passed"] is True)
```

### E-EXTRACT
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "def extract_recipe|steps =|s.get\\(\"parsed\"|source_trace|native_ops|exj.get|r0.get|cut after save|break", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:43:def extract_recipe(trace_path: str, goal: str = ""):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:48:    steps = d.get("steps", []) or d.get("cycles", [])
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:52:        "source_trace": trace_path,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:53:        "native_ops": [],
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:57:        p = s.get("parsed") or {}
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:68:        if isinstance(exj, dict) and exj.get("results"):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:70:            if not (r0.get("ok") or r0.get("action") == "upload"):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:78:            "id": p.get("id") or exj.get("id") or "",
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:84:            op["value"] = exj.get("file") or op["value"] or "fixture-evidence.txt"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:85:        recipe["native_ops"].append(op)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:88:        if (act == "click" and (exj.get("id") == "save" or
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:89:                                "salvar" in str((exj.get("text") or "")).lower())
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:91:            recipe["notes"].append(f"cut after save at op {len(recipe['native_ops'])} "
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:94:            break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:225:            "        break\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:418:    ops = recipe["native_ops"]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:465:            break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:491:                break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:499:            break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:528:                break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:546:                break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:558:                break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:566:        if r0.get("ok"):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:589:                    break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:606:                    break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:620:            break
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:624:            log["result"] = f"RECIPE-FAIL at step {i}: {r0.get('error') or res.get('reason')}"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:625:            break
```

### E-EXTRACT_TARGET
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "s.get\\(\"plan\"|\\[\"plan\"\\]|traceSha|trace_sha|\"provenance\"|\"verification\"|\"validation\"", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py"]
rc=1
```text
(nenhum match)
```

### E-TASK
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "\"(id|value|label|op)\"|intent", "C:\\Users\\ClawLabs\\browser-eval\\results\\recipes\\xt24ds7-recipe.json"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:3: "intent": "Criar plano DEMO-024 (WEB, Em analise), email invalido bloqueado e corrigido, condicional Homologacao sintetica, anexo fixture-evidence.txt, revisar, voltar, editar titulo para 'Plano WEB DEMO-024 revisado', reabrir revisao e salvar",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:7:   "op": "select",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:8:   "id": "channel",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:9:   "label": "current=Todos",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:10:   "value": "WEB"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:13:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:14:   "id": "status",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:15:   "label": "current=Todos",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:16:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:19:   "op": "select",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:20:   "id": "status",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:21:   "label": "current=Todos",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:22:   "value": "Em analise"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:25:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:26:   "id": "filter",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:27:   "label": "Filtrar demandas",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:28:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:31:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:32:   "id": "next",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:33:   "label": "Próxima página",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:34:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:37:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:38:   "id": "",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:39:   "label": "Criar plano DEMO-024",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:40:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:43:   "op": "type",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:44:   "id": "title1",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:45:   "label": "value=(empty)",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:46:   "value": "Plano WEB DEMO-024"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:49:   "op": "type",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:50:   "id": "email",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:51:   "label": "value=(empty)",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:52:   "value": "invalid-email@fixture"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:55:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:56:   "id": "",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:57:   "label": "Continuar",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:58:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:61:   "op": "type",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:62:   "id": "email",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:63:   "label": "value=\"invalid-email@fixture\"",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:64:   "value": "qa@example.test"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:67:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:68:   "id": "",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:69:   "label": "Continuar",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:70:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:73:   "op": "select",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:74:   "id": "type",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:75:   "label": "current=Selecione",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:76:   "value": "Integracao"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:79:   "op": "select",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:80:   "id": "priority",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:81:   "label": "current=Normal",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:82:   "value": "Alta"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:85:   "op": "type",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:86:   "id": "responsible",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:87:   "label": "value=(empty)",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:88:   "value": "Equipe Alfa"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:91:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:92:   "id": "requires",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:93:   "label": "checked=false",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:94:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:97:   "op": "select",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:98:   "id": "environment",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:99:   "label": "current=Selecione",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:100:   "value": "Homologacao sintetica"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:103:   "op": "upload",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:104:   "id": "upload",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:105:   "label": "value=(empty)",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:106:   "value": "fixture-evidence.txt"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:109:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:110:   "id": "review",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:111:   "label": "Revisar plano",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:112:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:115:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:116:   "id": "back",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:117:   "label": "Voltar",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:118:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:121:   "op": "type",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:122:   "id": "title2",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:123:   "label": "value=\"Plano WEB DEMO-024\"",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:124:   "value": "Plano WEB DEMO-024 revisado"
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:127:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:128:   "id": "review",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:129:   "label": "Revisar plano",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:130:   "value": ""
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:133:   "op": "click",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:134:   "id": "save",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:135:   "label": "Confirmar revisão e salvar",
C:\Users\ClawLabs\browser-eval\results\recipes\xt24ds7-recipe.json:136:   "value": ""
```

### E-FIXTURE
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "XT-WEB|seed=|runId=|No admin|runId exists|state_path|upload.bin|upload=None|records=|submitAttempts|email_invalid_blocked|review_open|title_changed|document_reload|persisted_read|p==|return self.send\\(404", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixture\\server.py"]
rc=0
```text
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:1:"""Synthetic T1 server. No admin/reset/judge HTTP endpoints; use separate offline tools."""
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:9:    return dict(runId=run,seed=20261019,mode=mode,model=model,skill=skill,events=[],records=[],draft={},stage='table',upload=None,mutations=0,submitAttempts=0,reloads=0,selection=None)
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:16:    state_path=folder/'state.json'
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:17:    if state_path.exists(): raise ValueError('runId exists; use a NEW run or offline reset')
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:25:    print(json.dumps(dict(ready=True,origin=server.origin,runId=run,pid=os.getpid())),flush=True)
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:51:            if assets[p]=='index.html' and s['records']:self.event('document_reload')
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:53:        if p=='/favicon.ico':return self.send(204,b'','image/png')
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:54:        if p=='/api/session':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:55:            if s['records']:s['reloads']+=1;self.event('persisted_read')
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:57:        if p=='/api/demands':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:64:        if p=='/api/attachment' and s['records'] and s['upload']:
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:65:            return self.send(200,(self.server.folder/'upload.bin').read_bytes(),'text/plain; charset=utf-8')
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:75:            if p=='/api/upload':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:80:                (self.server.folder/'upload.bin').write_bytes(raw);self.event('upload',**s['upload']);return self.send(200,s['upload'])
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:82:            if p=='/api/start':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:86:            if p=='/api/identity':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:89:                    self.event('email_invalid_blocked');return self.send(422,{'error':'Informe um e-mail válido para continuar.'})
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:92:            if p=='/api/review':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:99:                if s['draft'].get('title')!=title:self.event('title_changed',old=s['draft'].get('title'),new=title)
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:101:                s['stage']='review';self.event('review_open');return self.send(200,{'ok':True,'draft':s['draft']})
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:102:            if p=='/api/back':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:105:            if p=='/api/save':
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:106:                s['submitAttempts']+=1
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:110:                record=dict(s['draft'],id='PLAN-001',runId=s['runId'],attachment=s['upload'])
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\server.py:112:            return self.send(404,{'error':'Not found'})
```

### E-UI
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "lang=|pt-BR|America/Sao_Paulo|fetch|api\\(|onchange|onsubmit|modal|saved|Homologação|Integração|DEMO", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixture\\app.js", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixture\\index.html"]
rc=0
```text
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\index.html:1:<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>X-Testing — laboratório T1</title><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script>
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\index.html:7:<form id="details" hidden><div class="grid"><label>Título do plano<input id="title2" required></label><label>Tipo<select id="type" aria-label="Tipo"><option value="">Selecione</option><option>Integração</option><option>Funcional</option></select></label><label>Prioridade<select id="priority" aria-label="Prioridade"><option>Normal</option><option>Alta</option></select></label><label>Responsável<input id="responsible" list="teams" required autocomplete="off"><datalist id="teams"><option value="Equipe Alfa"><option value="Equipe Beta"></datalist></label></div><label class="check"><input type="checkbox" id="requires">Requer ambiente</label><label id="environmentLabel" hidden>Ambiente<select id="environment" aria-label="Ambiente"><option value="">Selecione</option><option>Homologação sintética</option><option>Desenvolvimento sintético</option></select></label><label>Anexo TXT<input id="upload" type="file" accept=".txt"></label><p id="attachment"></p><button id="review">Revisar plano</button></form></section>
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\index.html:8:<p id="error" role="alert" aria-live="assertive"></p><section><h2>Planos salvos</h2><div id="saved">Nenhum plano salvo.</div></section>
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\index.html:9:<dialog id="modal" aria-labelledby="reviewTitle"><h2 id="reviewTitle">Revisão do plano</h2><dl id="summary"></dl><div class="filters"><button id="back">Voltar e corrigir</button><button id="save">Confirmar revisão e salvar</button></div></dialog>
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:2:async function api(path,data){const r=await fetch('/api/'+path,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const b=await r.json();if(!r.ok)throw Error(b.error);return b}
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:6:async function table(){try{const r=await api('demands?'+new URLSearchParams({channel:$('channel').value,status:$('status').value,page}));pages=r.pages;$('rows').replaceChildren();for(const row of r.rows){const tr=document.createElement('tr');for(const k of ['id','channel','status','title']){const td=document.createElement('td');td.textContent=row[k];tr.append(td)}const td=document.createElement('td'),button=document.createElement('button');button.textContent='Criar plano '+row.id;button.onclick=()=>start(row.id);td.append(button);tr.append(td);$('rows').append(tr)}$('pagination').textContent='Página '+page+' de '+pages+' · '+r.total+' demandas';$('prev').disabled=page===1;$('next').disabled=page>=pages}catch(e){fail(e)}}
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:7:async function start(id){try{await api('start',{demand:id});demand=id;$('editor').hidden=false;$('linked').textContent='Vínculo: '+id;$('stepname').textContent='Etapa 1 / Identificação';$('editor').scrollIntoView();$('title1').focus()}catch(e){fail(e)}}
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:9:$('identity').onsubmit=async e=>{e.preventDefault();clear();try{await api('identity',{title:$('title1').value,email:$('email').value});$('identity').hidden=true;$('details').hidden=false;$('title2').value=$('title1').value;$('stepname').textContent='Etapa 2 / Configuração';$('editor').scrollIntoView()}catch(e){fail(e)}};
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:10:$('requires').onchange=()=>{$('environmentLabel').hidden=!$('requires').checked};
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:11:$('upload').onchange=async()=>{clear();try{const file=$('upload').files[0];if(!file)return;const r=await fetch('/api/upload',{method:'POST',headers:{'X-Filename':file.name},body:file});const b=await r.json();if(!r.ok)throw Error(b.error);$('attachment').textContent='Anexado: '+b.filename+' · '+b.bytes+' bytes'}catch(e){fail(e)}};
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:12:$('details').onsubmit=async e=>{e.preventDefault();clear();try{const r=await api('review',{title:$('title2').value,type:$('type').value,priority:$('priority').value,responsible:$('responsible').value,requiresEnvironment:$('requires').checked,environment:$('environment').value});$('summary').replaceChildren(dl(r.draft));$('modal').showModal()}catch(e){fail(e)}};
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:13:$('back').onclick=async()=>{try{await api('back',{});$('modal').close();$('title2').focus()}catch(e){fail(e)}};
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:14:$('modal').addEventListener('cancel',e=>{e.preventDefault();$('back').click()});
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:15:$('save').onclick=async()=>{clear();$('save').disabled=true;try{await api('save',{});$('modal').close();$('editor').hidden=true;await session()}catch(e){$('save').disabled=false;fail(e)}};
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:16:async function session(){const s=await api('session');$('run').textContent='runId='+s.runId+' | modelo='+s.model+' | skill='+s.skill+' | modo='+s.mode;document.title='X-Testing '+s.runId;
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:18:if(s.records.length){$('saved').replaceChildren(dl(s.records[0]));const a=document.createElement('a');a.href='/api/attachment';a.textContent='Abrir anexo persistido';a.download=s.records[0].attachment.filename;$('saved').append(a)}}
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\fixture\app.js:19:setInterval(()=>{$('clock').textContent=new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'})},250);
```

### E-ENV_TARGET
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "new_context|new.profile|fresh.profile|incognito|clear.cookies|set_viewport|viewport_size|1280|900|set_window|window_size", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=1
```text
(nenhum match)
```

### E-ENV_OLD
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "HARNESS =|subprocess.run|goto_url|maximize|--run|uuid.uuid4", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:70:        proc = subprocess.run([str(a) for a in args], input=input_text, capture_output=True,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:109:    blob = subprocess.run(["git", "-C", str(ROOT), "show",
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:174:            exec(compiled, dict(js=fake_js, goto_url=lambda *_: None,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:176:                                maximize=lambda: None))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:238:                             phase="initial_navigation" if calls == 1 and code.startswith("goto_url(")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:373:            fixture = subprocess.Popen([sys.executable, "-u", str(FIXTURE), "--run", run_id,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:385:            judge_process = command([sys.executable, HARNESS_JUDGE, "--run", run_id], timeout=120)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:446:    batch_id = "battery-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:30:HARNESS = (r"C:\Users\ClawLabs\AppData\Local\hermes\installs"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:36:    p = subprocess.run([HARNESS], input=code, capture_output=True, text=True,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:424:    nav = harness(f'goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:551:            nav2 = harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
```

### E-NETWORK_TARGET
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "network.ledger|network_origin|request_intercept|route\\(|allowlist|allowed_origins|blocked_origins", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\harness\\judge.py"]
rc=0
```text
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\harness\judge.py:17:    return dict(runId=run,pass_=all(checks.values()),checks=checks,events=names,mutationCount=s['mutations'],submitAttempts=s['submitAttempts'],network_origin_assertion='External traffic must be checked in executor network ledger; not inferable from DB',readOnly=True)
```

### E-SAME_TASK
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "TASK-CONTRACT|def judge|HARNESS_JUDGE|RECIPE =|RECIPE_SHA256|freeze_recipe|strict_json|judge_process", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\harness\\judge.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=0
```text
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\harness\judge.py:5:def judge(run):
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\harness\judge.py:7:    c=json.loads((ROOT.parent/'TASK-CONTRACT-20261019.json').read_text(encoding='utf-8'))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:29:HARNESS_JUDGE = BENCHMARK / "harness/judge.py"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:30:RECIPE = ROOT / "results/recipes/xt24ds7-recipe.json"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:32:RECIPE_SHA256 = "5defc9c2bf86ec8357cc16c063d03bb18ce6554bfd7848ca18e1f409d971fd71"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:54:def strict_json(text):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:107:def freeze_recipe(directory):
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:112:    if hashlib.sha256(blob).hexdigest() != RECIPE_SHA256:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:205:    if sha256(recipe_path) != RECIPE_SHA256:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:351:            ready = strict_json(lines[0])
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:369:        if fingerprints() != source["files"] or sha256(recipe_path) != RECIPE_SHA256:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:385:            judge_process = command([sys.executable, HARNESS_JUDGE, "--run", run_id], timeout=120)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:386:            write_new(directory / "judge.json", judge_process.pop("stdout"), raw=True)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:387:            write_new(directory / "judge.stderr.txt", judge_process.pop("stderr"), raw=True)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:388:            receipt["judgeProcess"] = judge_process
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:389:            execution = strict_json((directory / "recipe.json").read_text(encoding="utf-8"))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:394:            judge = strict_json((directory / "judge.json").read_text(encoding="utf-8"))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:395:            audit = [strict_json(line) for line in
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:400:                                   strict_json(recipe_path.read_text(encoding="utf-8")), audit,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:401:                                   execution_process["rc"], judge_process["rc"])
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:419:                                        sha256(recipe_path) == RECIPE_SHA256)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:454:        recipe_path = freeze_recipe(directory)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:475:        if fingerprints() != source["files"] or sha256(recipe_path) != RECIPE_SHA256:
```

### E-SOURCE_TABLE
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "^## Implementado|^Base de código|^\\| (Recipe|Espera|LLM|Navegação|Verificação|Captura|Validator|Extração)", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\SKILL.md"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:26:| Recipe revisada compatível com a classe de página e as entradas | Executar operações nativas com `scripts/recipe.py` |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:29:| Recipe falhou ou ficou incompatível | Diagnosticar o estado e decidir recuperação supervisionada; fallback automático LLM+JEV é alvo v2.6, não recurso atual |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:119:## Implementado versus alvo v2.6
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:121:Base de código desta tabela: `ed963ec`. O nome v2.3 identifica esta revisão da skill, não uma nova implementação do executor.
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:125:| Recipe nativa e re-resolve | Disponíveis | Identidade semântica com escopo e pós-condições explícitas |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:126:| Espera e recuperação | Pausas fixas, busy-wait JS e repetição da operação | Espera não bloqueante e reparo por efeito observado |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:127:| LLM+JEV | Loop single/batch e geração de valores disponíveis | Retomada local integrada à recipe; hoje sem fallback ativo |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:128:| Navegação inicial | Retorno do harness descartado | Gate por retorno, identidade e prontidão |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:129:| Verificação | `persisted:` textual após reload | Comparação completa e falha anterior preservada |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:130:| Captura | `--record` no loop; sem `--capture-dir` na recipe | Captura integrada e falha de evidência explícita |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:131:| Validator | Grava recibos, lê judge; exit baseado em DONE | Destinos imutáveis e gate automático pelo judge |
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:132:| Extração | Compila ações `parsed`, corta no primeiro save | Normalização single/batch, proveniência e verificação separada |
```

### E-SOURCE_TASK
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "^", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\TASK-CONTRACT-20261019.json"]
rc=0
```text
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:1:{
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:2:  "id": "XT-WEB-FORM-01",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:3:  "version": "T1-v1",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:4:  "seed": 20261019,
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5:  "prompt": "No laboratório X-Testing, filtre a tabela de demandas por WEB e Em análise, localize na segunda página DEMO-024 e cadastre um plano de teste do tipo Integração, prioridade Alta, responsável Equipe Alfa. No formulário em etapas, tente continuar com e-mail de fixture inválido para verificar a validação, depois corrija para qa@example.test. Ative Requer ambiente e selecione Homologação sintética no campo condicional. Anexe fixture-evidence.txt, abra o modal de revisão, volte e corrija o título para Plano WEB DEMO-024 revisado; confirme a revisão e salve uma única vez. Recarregue e demonstre que valores, anexo e vínculo com DEMO-024 persistiram. Não contate serviços externos.",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:6:  "promptSha256": "5f101ff2134ba0f8056dffcef3e6b1fd91fc1ea17deb1acbfb4a58b6c1b721d4",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:7:  "locale": "pt-BR",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:8:  "timezone": "America/Sao_Paulo",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:9:  "viewport": {
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:10:    "width": 1280,
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:11:    "height": 900
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:12:  },
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:13:  "fixtureAppStatus": "NOT_IMPLEMENTED",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:14:  "upload": {
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:15:    "path": "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixtures\\fixture-evidence.txt",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:16:    "filename": "fixture-evidence.txt",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:17:    "bytes": 32,
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:18:    "sha256": "22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1"
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:19:  },
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:20:  "expected": {
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:21:    "demand": "DEMO-024",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:22:    "type": "Integração",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:23:    "priority": "Alta",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:24:    "responsible": "Equipe Alfa",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:25:    "email": "qa@example.test",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:26:    "environment": "Homologação sintética",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:27:    "title": "Plano WEB DEMO-024 revisado",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:28:    "records": 1
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:29:  },
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:30:  "reset": "fresh profile, fixture DB and uploads by runId; admin endpoint inaccessible to executor",
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:31:  "judge": "independent server-side; same task all conditions"
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:32:}
```

### E-NORMALIZE
Comando (argv exato): ["rg", "-n", "--with-filename", "--no-heading", "-e", "const deacc|normalize\\(|deacc\\(o.text|deacc\\(a.value", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:528:      const deacc = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:529:      const want = deacc(a.value);
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:530:      let opt = Array.from(el.options).find(o => deacc(o.text) === want || deacc(o.value) === want);
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:531:      if (!opt) opt = Array.from(el.options).find(o => deacc(o.text).includes(want));
```

## Resumo final (3 linhas)

Total de asserts: 48; julgados nas cinco categorias: 47; não verificado: 1 (A025).
fulfilled: 36 | drifted: 1 | omitted: 7.
defer: 0 | N.A.: 3.
