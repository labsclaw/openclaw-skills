# Contrato A005 antes da implementação

GOAL: substituir persisted textual por verificação completa pós-reload do registro público T1: todos os campos, vínculo e anexo (metadados, link e bytes/hash). Divergência ou falha anterior não pode ser apagada. Judge externo permanece independente.

Entrada normal: agent_loop.verify usado por recipe.run_recipe, single e batch; battery_pilot fornece a spec. Consumidores devem usar contrato público explícito persisted_json com URL, runId/id, nove campos escalares, demand vinculada e anexo esperado. Fontes de expectativa: entradas autorizadas da tarefa e arquivo público de upload; nunca judge ou arquivos privados de runs.

Fonte de observação: UI pública da aplicação T1 (#saved > dl, #saved > a) e download público /api/attachment, como renderizados por fixture/app.js e fixture/server.py. Layout diferente exige outro adaptador explícito; não fazer fallback a body substring. Nome/tamanho isolados não provam conteúdo: baixar bytes pelo link público same-origin sem redirect e comparar SHA-256 e comprimento.

Compatibilidade: retorno string PASS/FAIL de verify preservado, com detalhes estruturados opcionais. persisted:<titulo> passa a falhar com orientação para contrato completo; não manter aprovação fraca silenciosa. Bateria gera contrato por runId/URL e usa protocolo novo no preflight; juiz separado e gate não são fundidos. Recipes/recibos históricos imutáveis. Single/batch devem manter falhas inesperadas/verifier FAIL como estado fatal; falha negativa explicitamente esperada continua distinguível.

UNKNOWNS: teste Chromium/HTTP local reproduzirá falso positivo do código anterior, reload nativo e divergência isolada de cada componente. Testes de transporte verificarão rc, payload único/estrito, timeOrigin/tipo de navegação e URL. Testes de callers verificarão falha anterior seguida de PASS, sem inferência. Review independente sem judge privado.

SUCCESS CRITERIA: caso completo passa após reload confirmado; cada campo, demanda, metadado/link/conteúdo do anexo divergente falha; ausência/duplicidade/extra não é aceita; erro com PASS e rc não zero falham; record antigo só presente antes do reload falha; recipe/single/batch nunca apagam erro anterior. Verificar separação do judge por código e gates sintéticos externos, sem ler seu conteúdo privado.

STEPS: (1) recibo de correção A001 antes do próximo item; (2) teste baseline; (3) verifier estruturado e integração nos consumidores; (4) testes Chromium e controles de falha/normal entry; (5) review independente, correções e novos recibos; (6) manifesto final depois do freeze do código/testes, commit local e entrega somente A005.

Recuperação: reverter arquivos ativos do patch, preservando recibos e correção A001. Fora do escopo: demais itens, configuração/providers, instalação/runtime, bateria LLM/benchmark completo e alterações no judge.
