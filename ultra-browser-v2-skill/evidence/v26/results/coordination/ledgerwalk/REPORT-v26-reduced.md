# Ledger walk reduzido v2.6

Estado: CONCLUÍDO para as duas fontes. Auditoria estática; não é nova bateria nem prova de uso do navegador.

Data: 2026-11-10. Autor: Justus. HEAD: 1a34345a45e9df613e79c2935a106d4fd7ff3f8c.

## Escopo e filtro defer/supersede

Autoridade: somente SKILL.md, seção Implementado versus alvo v2.6 (oito linhas), e TASK-CONTRACT-20261019.json integral. Os demais arquivos são evidência de implementação, não novas fontes de requisitos. Nenhum código, recibo antigo, índice Git ou fixture foi modificado.

As oito linhas são avaliadas pelo ALVO atual; a coluna Em ed963ec é baseline histórico e não promessa sobre HEAD. Um alvo parcialmente implementado recebe omitted quando falta componente, ou drifted quando a forma implementada contraria o alvo. Nenhuma das duas fontes adia explicitamente uma linha para fora de v2.6: não transformei a palavra alvo em dispensa automática. Não denuncio as descrições históricas como drift atual.

Campos declarativos id/version e fixtureAppStatus recebem N.A. com justificativa histórica, não são requisitos de regressão. Não foi usado o primeiro walk incompleto como evidência. Falta de controle/recibo não é prova de um efeito real incorreto.

## Fontes identificadas

C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md | SHA-256 242eba559b612acc3857c1dfad836d3051af4fab43d5d664c2c9658f7c224aaf
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json | SHA-256 0ff589c560efaa10fe412c8c065fac0ce7cc2ffc0c19bdb3743c600140390d09

## Asserts e julgamento

### A001. Resolver identidade semântica com escopo e pós-condições explícitas.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:109. Julgamento: **omitted**.
Há re-resolve e efeitos de email/anexo/revisão, mas o resolvedor nativo continua global por id/primeiro texto parcial, sem contrato de escopo/role. A unicidade no reparador não implementa escopo no caminho nativo. O alvo completo não foi entregue.
Evidência grep: E-RESOLVE, E-SCOPE, E-EFFECT.

### A002. Esperar sem bloquear a página e recuperar por efeito observado.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:110. Julgamento: **drifted**.
Reparo por efeito observado e polling no host existem, mas resolveWait mantém busy-loop JS de 120 ms por ciclo; o caminho antigo não foi removido. A espera não bloqueante não é universal no executor compartilhado.
Evidência grep: E-EFFECT, E-RESOLVE.

### A003. Retomar a recipe localmente com LLM+JEV.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:111. Julgamento: **fulfilled**.
Fallback agora é opt-in, preserva checkpoint/baseline e separa resultado assistido; não usa run() como retomada. A frase hoje sem fallback ativo descreve ed963ec, não HEAD: não é drift documental independente.
Evidência grep: E-REPAIR, E-EFFECT.

### A004. Aplicar gate inicial por retorno, identidade e prontidão.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:112. Julgamento: **fulfilled**.
Retorno inicial é conferido; URL e marker são exigidos na bateria; fixture deve emitir ready com runId/origin corretos. O descarte antigo foi substituído no caminho auditado, embora permaneça sleep inicial.
Evidência grep: E-NAV.

### A005. Comparar o registro completo após reload e preservar falhas anteriores.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:113. Julgamento: **omitted**.
Falha anterior já impede verifier posterior. Porém persisted ainda procura substring em body; comparação integral existe só no judge externo, não no verifier do executor. Não confundir essa separação com ausência de judge correto.
Evidência grep: E-VERIFY, E-FULL_VERIFY, E-EFFECT.

### A006. Integrar captura na recipe e explicitar falhas de evidência.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:114. Julgamento: **omitted**.
Nenhuma chamada de captura nem registro de falha de captura no fluxo recipe/battery. --record permanece só no loop; existência de gravador separado não é integração.
Evidência grep: E-CAPTURE_TARGET, E-CAPTURE_OLD.

### A007. Criar destinos imutáveis e condicionar aceite ao judge.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:115. Julgamento: **fulfilled**.
Arquivos create-only e diretórios exclusivos; exit depende de três gates aprovados, não de substring DONE. legacyWouldPass permanece apenas diagnóstico e não decide o aceite.
Evidência grep: E-GATE.

### A008. Normalizar single/batch, registrar proveniência e separar verificação.
Fonte: C:\Users\ClawLabs\browser-eval\ultra-browser-v2\SKILL.md:116. Julgamento: **omitted**.
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
Fonte: C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\TASK-CONTRACT-20261019.json:5. Julgamento: **omitted**.
App usa endpoints relativos; entretanto runner não coleta/bloqueia tráfego externo nem produz network ledger. O próprio judge declara que a ausência de tráfego externo não é inferível do DB. Achado é falta da prova/controle no fluxo, NÃO alegação de contato externo observado.
Evidência grep: E-NETWORK_TARGET, E-UI, E-ENV_OLD.

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
- A025 | omitted | Não contatar serviços externos na tarefa. App usa endpoints relativos; entretanto runner não coleta/bloqueia tráfego externo nem produz network ledger. O próprio judge declara que a ausência de tráfego externo não é inferível do DB. Achado é falta da prova/controle no fluxo, NÃO alegação de contato externo observado. Evidência: E-NETWORK_TARGET, E-UI, E-ENV_OLD.
- A029 | omitted | viewport.width = 1280 Não há configuração ou checagem das dimensões contratuais nos runners; maximize() usa o tamanho disponível. Não se afirma dimensão real errada sem observação: a omissão é enforcement/recibo da dimensão declarada. Evidência: E-ENV_TARGET, E-ENV_OLD.
- A030 | omitted | viewport.height = 900 Não há configuração ou checagem das dimensões contratuais nos runners; maximize() usa o tamanho disponível. Não se afirma dimensão real errada sem observação: a omissão é enforcement/recibo da dimensão declarada. Evidência: E-ENV_TARGET, E-ENV_OLD.
- A044 | omitted | Usar perfil de navegador novo por runId. RunId novo reinicia DB/uploads, mas runner reutiliza o harness configurado sem provisionar perfil novo ou registrar a identidade do perfil. Não se infere que o harness nunca possa isolar externamente: falta o mecanismo/prova no fluxo auditado. Evidência: E-ENV_TARGET, E-ENV_OLD.

## Evidências grep reproduzíveis

Consultas executadas com rg; rc=1 significa nenhum match, não erro. Cada saída contém caminho:linha. Consultas negativas vêm acompanhadas do caminho legado positivo correspondente; nenhuma ausência depende só de busca de nome de arquivo.

### E-RESOLVE
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "const resolve|cands0.find|cands.find|includes\\(want|actionable|a.element", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
348:    if (!opt) opt = Array.from(el.options).find(o => o.text.toLowerCase().includes(want));
382:  // v2.3.1 (pesquisa web): bid persistente — injeta data-ub2-idx em cada elemento
401:  const actionable = (el) => el && !el.disabled && (el.offsetParent !== null || el.getClientRects().length > 0);
403:  // re-resolve + espera actionable ate budget — mata stalls de re-render async)
404:  const resolve = (a, els) => {
410:      const m0 = cands0.find(e =>
411:        norm(e.innerText).includes(want0) ||
412:        norm(e.getAttribute && (e.getAttribute('aria-label') || '')).includes(want0));
416:    if (a.bid || a.element) {
417:      const sel = '[data-ub2-idx="' + (a.bid || a.element) + '"]';
426:      const m = cands.find(e =>
427:        norm(e.innerText).includes(want) ||
428:        norm(e.getAttribute && (e.getAttribute('aria-label') || '')).includes(want) ||
429:        norm(e.value).includes(want) ||
430:        norm(e.placeholder).includes(want) ||
431:        (e.tagName === 'A' && norm(e.href).includes(want)));
434:      if (idm) { const b = cands.find(e => e.id === idm[1]); if (b) return b; }
436:    // v2.5.4: fallback por POSICAO so com a.element explicito — sem ele, nao achou = null
437:    return (a.element !== undefined && a.element !== null && els[a.element - 1]) || null;
439:  const resolveWait = (a, els, budgetMs) => {
444:      if (el && actionable(el)) return el;
449:    return (el && actionable(el)) ? el : null; // v2.4.4: nao devolver nao-actionable (modal fechado etc)
494:      results.push({i, error: 'element not found (waited)', element: a.element, label: a.label, bid: a.bid});
531:      if (!opt) opt = Array.from(el.options).find(o => deacc(o.text).includes(want));
1209:                                   f"this element is NOT actionable now; re-open the needed panel/step first "
```

### E-SCOPE
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "\\bscope\\b|within\\(|get_by_role|querySelector.*dialog|closest\\(", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=1
```text
(nenhum match)
```

### E-EFFECT
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "def await_effect|_t.sleep|while \\(Date.now|const until|def recover_checkpoint|observed.get|baseline=prev|fallback_jev|ASSISTED|verify_spec and|SKIPPED", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:446:      const until = Date.now() + 120;
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:447:      while (Date.now() < until) {}
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:890:    harness(f'{pre}goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:993:                harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1007:                    "    _t.sleep(1)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1048:    harness(f'{pre}goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1231:                    "    _t.sleep(1)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\agent_loop.py:1242:                harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
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
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:498:            return fallback_jev and recover_checkpoint(
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:513:                "    _t.sleep(0.3)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:516:                "    _t.sleep(2)\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:526:            _t.sleep(1.0)  # v2.5.10: upload handler e async (POST + attachment render)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:547:            nav2 = harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:559:            _t.sleep(min(5, float(res.get("value") or 1)))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:604:                _t.sleep(2.5 if op.get("id") in ("review", "next") or
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:609:        if fallback_jev:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:627:    if verify_spec and log["result"] == "RECIPE-DONE":
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:633:            log["result"] = ("RECIPE-DONE-VERIFIED-ASSISTED" if log["repairs"]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:636:        log["verifier"] = "SKIPPED (falha anterior — PASS nao poderia apagar)"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:661:                         fallback_jev="--fallback-jev" in sys.argv, repair_model=repair_model)
```

### E-REPAIR
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "def repair_single|REPAIR_MODELS|REPAIR_PROVIDER|matches|len\\(matches\\)|decision = measured|fallback_jev|recover_checkpoint|--fallback-jev", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:21:  python recipe.py run <recipe.json> --url http://... [--fallback-jev]
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:282:def recover_checkpoint(log, ops, i, prev, trigger, reason, attempted, budget,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:298:                   provedor=AL.REPAIR_PROVIDER, calls=[], attempt=attempt + 1)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:412:def run_recipe(recipe_path: str, url: str, verify_spec: str = "", fallback_jev: bool = False,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:498:            return fallback_jev and recover_checkpoint(
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:609:        if fallback_jev:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:661:                         fallback_jev="--fallback-jev" in sys.argv, repair_model=repair_model)
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
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "nav =|nav.get|got_url|want =|markerOk|marker not in|wait_ready|ready.get|initial_navigation", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:304:                    or (marker and marker not in (str(state.get("title", "")) + "\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:361:                    or (marker and marker not in str(fresh.get("title", "")) + "\n"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:392:                        or (marker and marker not in str(after.get("title", "")) +
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:424:    nav = harness(f'goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:425:    log["navigation"] = {"rc": nav.get("rc"), "url": url, "marker": marker or None}
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:426:    if nav.get("rc") != 0:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:427:        log["result"] = f"RECIPE-FAIL initial navigation rc={nav.get('rc')}"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:434:    want = (url or "").rstrip("/")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:435:    got_url = str(state0.get("url") or "").rstrip("/")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:436:    if got_url != want:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:437:        log["result"] = f"RECIPE-FAIL identity: url {got_url!r} != {want!r}"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:440:    if marker and marker not in hay:
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:443:    log["identity"] = {"url": got_url, "title": state0.get("title"),
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:444:                       "markerOk": (True if marker else None)}
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
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "def verify|kind ==|location.reload|r0 = harness|r1 = harness|return \"PASS\"|VERIFY =|checks=dict|fields=all|single_record|persisted_read", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\harness\\judge.py"]
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
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "expected|attachment|demand|records|requiresEnvironment|sha256", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\verifier.js"]
rc=0
```text
19:      // field_value|selector|expected
23:      return (v === arg[1] || v.includes(arg[1])) ? 'PASS: field=' + v : 'FAIL: field=' + v + ' expected=' + arg[1];
```

### E-CAPTURE_TARGET
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "capture.dir|screenshot|start_recording|stop_recording|capture_error|recording_error", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=1
```text
(nenhum match)
```

### E-CAPTURE_OLD
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "start_recording|stop_recording|record", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
10:                     [--verify "text_contains:OK:"] [--record]
884:def run_batch(url, goal, model, max_cycles, verify_spec, record, engine="typesafe",
889:    pre = f'start_recording(name="{rec_name}", title="{goal[:40]}")\n' if record else ""
1039:    if record:
1040:        harness("stop_recording()", timeout=60)
1044:def run(url, goal, model, max_steps, verify_spec, record, engine="opencode", text_helper=None):
1047:    pre = f'start_recording(name="{rec_name}", title="{goal[:40]}")\n' if record else ""
1257:    if record:
1258:        harness("stop_recording()", timeout=60)
1277:    ap.add_argument("--record", action="store_true")
1359:                           args.record, n_heads=args.n_heads, **common)
1362:                     args.record, **common)
```

### E-GATE
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "open\\(\"x\"|exist_ok=False|require\\(|CHECKS =|ordinary ==|len\\(receipts\\)|legacyWouldPass|summary\\[\"passed\"\\]|success =", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=0
```text
35:CHECKS = frozenset(("runId", "seed", "filtered_second_page", "fields",
50:    with Path(path).open("x", encoding="utf-8", newline="\n") as stream:
211:    check_js = """const fs=require('fs'),vm=require('vm');
232:    with Path(audit_path).open("x", encoding="utf-8", buffering=1) as audit:
272:    def require(condition, reason):
275:    require(type(recipe_rc) is int and recipe_rc == 0, "recipe process rc != 0")
276:    require(type(judge_rc) is int and judge_rc == 0, "judge process rc != 0")
277:    require(judge.get("runId") == run_id, "judge runId divergente")
278:    require(judge.get("pass_") is True, "judge pass_ != true")
280:    require(isinstance(checks, dict) and set(checks) == CHECKS and
282:    require(execution.get("result") == "RECIPE-DONE-VERIFIED", "resultado não verificado")
283:    require(execution.get("verifier") == "PASS", "verifier != PASS")
284:    require(bool(audit) and audit[0].get("phase") == "initial_navigation" and
289:    require(isinstance(identity, dict) and identity.get("url") == execution.get("url") and
291:    require(bool(audit) and all(type(a.get("rc")) is int and a["rc"] == 0 and
294:    require(isinstance(steps, list) and len(steps) == len(ops) == 22,
299:            require(False, f"passo {index} inválido")
302:        require(type(step.get("i")) is int and step["i"] == index and index < len(ops) and
307:            require(False, f"resultado estruturado ausente no passo {index}")
310:        require(type(row.get("i")) is int and row["i"] == 0 and isinstance(op, dict) and
319:            require(confirmed, f"upload terminal não confirmado no passo {index}")
325:            require(good, f"passo {index} sem ok:true")
327:    require(ordinary == 21 and uploads == 1, "exigidos 21 ok:true + 1 upload confirmado")
334:    path.mkdir(parents=False, exist_ok=False)
371:        with (directory / "fixture.stdout.txt").open("x", encoding="utf-8") as out, \
372:                (directory / "fixture.stderr.txt").open("x", encoding="utf-8") as err:
391:                receipt["legacyWouldPass"] = "DONE" in str(execution.get("result"))
429:    return len(receipts) == 3 and len({r["runId"] for r in receipts}) == 3 and \
471:                if not receipt["gate"]["passed"] and receipt.get("legacyWouldPass"):
474:            summary["passed"] = battery_passed(summary["pilots"])
484:    success = (summary.get("preflightPassed") is True if args.preflight_only else summary["passed"] is True)
```

### E-EXTRACT
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "def extract_recipe|steps =|s.get\\(\"parsed\"|source_trace|native_ops|exj.get|r0.get|cut after save|break", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py"]
rc=0
```text
43:def extract_recipe(trace_path: str, goal: str = ""):
48:    steps = d.get("steps", []) or d.get("cycles", [])
52:        "source_trace": trace_path,
53:        "native_ops": [],
57:        p = s.get("parsed") or {}
68:        if isinstance(exj, dict) and exj.get("results"):
70:            if not (r0.get("ok") or r0.get("action") == "upload"):
78:            "id": p.get("id") or exj.get("id") or "",
84:            op["value"] = exj.get("file") or op["value"] or "fixture-evidence.txt"
85:        recipe["native_ops"].append(op)
88:        if (act == "click" and (exj.get("id") == "save" or
89:                                "salvar" in str((exj.get("text") or "")).lower())
91:            recipe["notes"].append(f"cut after save at op {len(recipe['native_ops'])} "
94:            break
225:            "        break\n"
418:    ops = recipe["native_ops"]
461:            break
487:                break
495:            break
524:                break
542:                break
554:                break
562:        if r0.get("ok"):
585:                    break
602:                    break
616:            break
620:            log["result"] = f"RECIPE-FAIL at step {i}: {r0.get('error') or res.get('reason')}"
621:            break
```

### E-EXTRACT_TARGET
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "s.get\\(\"plan\"|\\[\"plan\"\\]|traceSha|trace_sha|\"provenance\"|\"verification\"|\"validation\"", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py"]
rc=1
```text
(nenhum match)
```

### E-TASK
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "\"(id|value|label|op)\"|intent", "C:\\Users\\ClawLabs\\browser-eval\\results\\recipes\\xt24ds7-recipe.json"]
rc=0
```text
3: "intent": "Criar plano DEMO-024 (WEB, Em analise), email invalido bloqueado e corrigido, condicional Homologacao sintetica, anexo fixture-evidence.txt, revisar, voltar, editar titulo para 'Plano WEB DEMO-024 revisado', reabrir revisao e salvar",
7:   "op": "select",
8:   "id": "channel",
9:   "label": "current=Todos",
10:   "value": "WEB"
13:   "op": "click",
14:   "id": "status",
15:   "label": "current=Todos",
16:   "value": ""
19:   "op": "select",
20:   "id": "status",
21:   "label": "current=Todos",
22:   "value": "Em analise"
25:   "op": "click",
26:   "id": "filter",
27:   "label": "Filtrar demandas",
28:   "value": ""
31:   "op": "click",
32:   "id": "next",
33:   "label": "Próxima página",
34:   "value": ""
37:   "op": "click",
38:   "id": "",
39:   "label": "Criar plano DEMO-024",
40:   "value": ""
43:   "op": "type",
44:   "id": "title1",
45:   "label": "value=(empty)",
46:   "value": "Plano WEB DEMO-024"
49:   "op": "type",
50:   "id": "email",
51:   "label": "value=(empty)",
52:   "value": "invalid-email@fixture"
55:   "op": "click",
56:   "id": "",
57:   "label": "Continuar",
58:   "value": ""
61:   "op": "type",
62:   "id": "email",
63:   "label": "value=\"invalid-email@fixture\"",
64:   "value": "qa@example.test"
67:   "op": "click",
68:   "id": "",
69:   "label": "Continuar",
70:   "value": ""
73:   "op": "select",
74:   "id": "type",
75:   "label": "current=Selecione",
76:   "value": "Integracao"
79:   "op": "select",
80:   "id": "priority",
81:   "label": "current=Normal",
82:   "value": "Alta"
85:   "op": "type",
86:   "id": "responsible",
87:   "label": "value=(empty)",
88:   "value": "Equipe Alfa"
91:   "op": "click",
92:   "id": "requires",
93:   "label": "checked=false",
94:   "value": ""
97:   "op": "select",
98:   "id": "environment",
99:   "label": "current=Selecione",
100:   "value": "Homologacao sintetica"
103:   "op": "upload",
104:   "id": "upload",
105:   "label": "value=(empty)",
106:   "value": "fixture-evidence.txt"
109:   "op": "click",
110:   "id": "review",
111:   "label": "Revisar plano",
112:   "value": ""
115:   "op": "click",
116:   "id": "back",
117:   "label": "Voltar",
118:   "value": ""
121:   "op": "type",
122:   "id": "title2",
123:   "label": "value=\"Plano WEB DEMO-024\"",
124:   "value": "Plano WEB DEMO-024 revisado"
127:   "op": "click",
128:   "id": "review",
129:   "label": "Revisar plano",
130:   "value": ""
133:   "op": "click",
134:   "id": "save",
135:   "label": "Confirmar revisão e salvar",
136:   "value": ""
```

### E-FIXTURE
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "XT-WEB|seed=|runId=|No admin|runId exists|state_path|upload.bin|upload=None|records=|submitAttempts|email_invalid_blocked|review_open|title_changed|document_reload|persisted_read|p==|return self.send\\(404", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixture\\server.py"]
rc=0
```text
1:"""Synthetic T1 server. No admin/reset/judge HTTP endpoints; use separate offline tools."""
9:    return dict(runId=run,seed=20261019,mode=mode,model=model,skill=skill,events=[],records=[],draft={},stage='table',upload=None,mutations=0,submitAttempts=0,reloads=0,selection=None)
16:    state_path=folder/'state.json'
17:    if state_path.exists(): raise ValueError('runId exists; use a NEW run or offline reset')
25:    print(json.dumps(dict(ready=True,origin=server.origin,runId=run,pid=os.getpid())),flush=True)
51:            if assets[p]=='index.html' and s['records']:self.event('document_reload')
53:        if p=='/favicon.ico':return self.send(204,b'','image/png')
54:        if p=='/api/session':
55:            if s['records']:s['reloads']+=1;self.event('persisted_read')
57:        if p=='/api/demands':
64:        if p=='/api/attachment' and s['records'] and s['upload']:
65:            return self.send(200,(self.server.folder/'upload.bin').read_bytes(),'text/plain; charset=utf-8')
75:            if p=='/api/upload':
80:                (self.server.folder/'upload.bin').write_bytes(raw);self.event('upload',**s['upload']);return self.send(200,s['upload'])
82:            if p=='/api/start':
86:            if p=='/api/identity':
89:                    self.event('email_invalid_blocked');return self.send(422,{'error':'Informe um e-mail válido para continuar.'})
92:            if p=='/api/review':
99:                if s['draft'].get('title')!=title:self.event('title_changed',old=s['draft'].get('title'),new=title)
101:                s['stage']='review';self.event('review_open');return self.send(200,{'ok':True,'draft':s['draft']})
102:            if p=='/api/back':
105:            if p=='/api/save':
106:                s['submitAttempts']+=1
110:                record=dict(s['draft'],id='PLAN-001',runId=s['runId'],attachment=s['upload'])
112:            return self.send(404,{'error':'Not found'})
```

### E-UI
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "lang=|pt-BR|America/Sao_Paulo|fetch|api\\(|onchange|onsubmit|modal|saved|Homologação|Integração|DEMO", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixture\\app.js", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixture\\index.html"]
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
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "new_context|new.profile|fresh.profile|incognito|clear.cookies|set_viewport|viewport_size|1280|900|set_window|window_size", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=1
```text
(nenhum match)
```

### E-ENV_OLD
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "HARNESS =|subprocess.run|goto_url|maximize|--run|uuid.uuid4", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
rc=0
```text
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:30:HARNESS = (r"C:\Users\ClawLabs\AppData\Local\hermes\installs"
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:36:    p = subprocess.run([HARNESS], input=code, capture_output=True, text=True,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:424:    nav = harness(f'goto_url("{url}")\nmaximize()\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\recipe.py:547:            nav2 = harness(f'goto_url("{dest}")\nimport time as _t\n_t.sleep(1.5)', timeout=90)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:70:        proc = subprocess.run([str(a) for a in args], input=input_text, capture_output=True,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:109:    blob = subprocess.run(["git", "-C", str(ROOT), "show",
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:174:            exec(compiled, dict(js=fake_js, goto_url=lambda *_: None,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:176:                                maximize=lambda: None))
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:238:                             phase="initial_navigation" if calls == 1 and code.startswith("goto_url(")
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:373:            fixture = subprocess.Popen([sys.executable, "-u", str(FIXTURE), "--run", run_id,
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:385:            judge_process = command([sys.executable, HARNESS_JUDGE, "--run", run_id], timeout=120)
C:\Users\ClawLabs\browser-eval\ultra-browser-v2\scripts\battery_pilot.py:446:    batch_id = "battery-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8]
```

### E-NETWORK_TARGET
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "network.ledger|network_origin|request_intercept|route\\(|allowlist|allowed_origins|blocked_origins", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\recipe.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\harness\\judge.py"]
rc=0
```text
C:\Users\ClawLabs\.openclaw\workspace\pocs\browser-benchmark-20261016\harness\judge.py:17:    return dict(runId=run,pass_=all(checks.values()),checks=checks,events=names,mutationCount=s['mutations'],submitAttempts=s['submitAttempts'],network_origin_assertion='External traffic must be checked in executor network ledger; not inferable from DB',readOnly=True)
```

### E-SAME_TASK
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "TASK-CONTRACT|def judge|HARNESS_JUDGE|RECIPE =|RECIPE_SHA256|freeze_recipe|strict_json|judge_process", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\harness\\judge.py", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\battery_pilot.py"]
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
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "^## Implementado|^Base de código|^\\| (Recipe|Espera|LLM|Navegação|Verificação|Captura|Validator|Extração)", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\SKILL.md"]
rc=0
```text
26:| Recipe revisada compatível com a classe de página e as entradas | Executar operações nativas com `scripts/recipe.py` |
29:| Recipe falhou ou ficou incompatível | Diagnosticar o estado e decidir recuperação supervisionada; fallback automático LLM+JEV é alvo v2.6, não recurso atual |
103:## Implementado versus alvo v2.6
105:Base de código desta tabela: `ed963ec`. O nome v2.3 identifica esta revisão da skill, não uma nova implementação do executor.
109:| Recipe nativa e re-resolve | Disponíveis | Identidade semântica com escopo e pós-condições explícitas |
110:| Espera e recuperação | Pausas fixas, busy-wait JS e repetição da operação | Espera não bloqueante e reparo por efeito observado |
111:| LLM+JEV | Loop single/batch e geração de valores disponíveis | Retomada local integrada à recipe; hoje sem fallback ativo |
112:| Navegação inicial | Retorno do harness descartado | Gate por retorno, identidade e prontidão |
113:| Verificação | `persisted:` textual após reload | Comparação completa e falha anterior preservada |
114:| Captura | `--record` no loop; sem `--capture-dir` na recipe | Captura integrada e falha de evidência explícita |
115:| Validator | Grava recibos, lê judge; exit baseado em DONE | Destinos imutáveis e gate automático pelo judge |
116:| Extração | Compila ações `parsed`, corta no primeiro save | Normalização single/batch, proveniência e verificação separada |
```

### E-SOURCE_TASK
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "^", "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\TASK-CONTRACT-20261019.json"]
rc=0
```text
1:{
2:  "id": "XT-WEB-FORM-01",
3:  "version": "T1-v1",
4:  "seed": 20261019,
5:  "prompt": "No laboratório X-Testing, filtre a tabela de demandas por WEB e Em análise, localize na segunda página DEMO-024 e cadastre um plano de teste do tipo Integração, prioridade Alta, responsável Equipe Alfa. No formulário em etapas, tente continuar com e-mail de fixture inválido para verificar a validação, depois corrija para qa@example.test. Ative Requer ambiente e selecione Homologação sintética no campo condicional. Anexe fixture-evidence.txt, abra o modal de revisão, volte e corrija o título para Plano WEB DEMO-024 revisado; confirme a revisão e salve uma única vez. Recarregue e demonstre que valores, anexo e vínculo com DEMO-024 persistiram. Não contate serviços externos.",
6:  "promptSha256": "5f101ff2134ba0f8056dffcef3e6b1fd91fc1ea17deb1acbfb4a58b6c1b721d4",
7:  "locale": "pt-BR",
8:  "timezone": "America/Sao_Paulo",
9:  "viewport": {
10:    "width": 1280,
11:    "height": 900
12:  },
13:  "fixtureAppStatus": "NOT_IMPLEMENTED",
14:  "upload": {
15:    "path": "C:\\Users\\ClawLabs\\.openclaw\\workspace\\pocs\\browser-benchmark-20261016\\fixtures\\fixture-evidence.txt",
16:    "filename": "fixture-evidence.txt",
17:    "bytes": 32,
18:    "sha256": "22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1"
19:  },
20:  "expected": {
21:    "demand": "DEMO-024",
22:    "type": "Integração",
23:    "priority": "Alta",
24:    "responsible": "Equipe Alfa",
25:    "email": "qa@example.test",
26:    "environment": "Homologação sintética",
27:    "title": "Plano WEB DEMO-024 revisado",
28:    "records": 1
29:  },
30:  "reset": "fresh profile, fixture DB and uploads by runId; admin endpoint inaccessible to executor",
31:  "judge": "independent server-side; same task all conditions"
32:}
```

### E-NORMALIZE
Comando (argv exato): ["rg", "-n", "--no-heading", "-e", "const deacc|normalize\\(|deacc\\(o.text|deacc\\(a.value", "C:\\Users\\ClawLabs\\browser-eval\\ultra-browser-v2\\scripts\\agent_loop.py"]
rc=0
```text
528:      const deacc = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
529:      const want = deacc(a.value);
530:      let opt = Array.from(el.options).find(o => deacc(o.text) === want || deacc(o.value) === want);
531:      if (!opt) opt = Array.from(el.options).find(o => deacc(o.text).includes(want));
```

## Verificação da auditoria

Os oito arquivos de implementação inspecionados mantiveram SHA-256 idêntico antes/depois. Nenhum navegador, modelo, fixture ou judge foi executado. O único cálculo adicional foi hash/leitura de contrato e upload. Sem claim de resultado empírico novo.

## Resumo final (3 linhas)

Total de asserts: 48.
fulfilled: 36 | drifted: 1 | omitted: 8.
defer: 0 | N.A.: 3.
