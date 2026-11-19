# Item 3, A005: verifier completo pós-reload

**Veredito: fulfilled no adaptador público T1 e nos consumidores exercitados.** Transporte Hermes, instalação de runtime e bateria LLM/benchmark completa não verificados. Não é suporte universal a qualquer layout.

Base: `fb5e6cbe928ad481a6e56bee3ac9f100bf461b63`. Branch: `fix/browser-v26-a005-20261119`.

## Entrada, consumidores e legado, antes da mudança

[PLAN.md](PLAN.md) registra o contrato anterior à implementação. Entrada normal: agent_loop.verify, chamado por recipe.run_recipe, single e batch; battery_pilot gera a spec para seu worker. O formato novo é `persisted_json:<JSON>` ou `persisted_json:@arquivo`, com URL/runId, todos os campos esperados, demanda vinculada e anexo completo. Expectativa vem de entradas públicas autorizadas, não de judge.

Mantido retorno PASS/FAIL; logs recebem detalhe estruturado. O legado `persisted:<titulo>` falha fechado com orientação de migração. Não foi mantido fallback por substring. A migração exige contrato explícito; não declarar receitas legadas automaticamente compatíveis. Single/batch agora encerram em falha inesperada/host/verifier FAIL, em vez de permitir recuperação opaca que apague erro. Negativas explicitamente esperadas permanecem distintas.

## O que mudou, arquivo:linha

- `scripts/persisted_verifier.py:23`: contrato completo/estrito, nove campos escalares, binding demand, filename/bytes/SHA-256/href/download do anexo, URL e timeout. Ausente, duplicado e tipo inválido falham.
- `scripts/persisted_verifier.py:44`, `:77`: observa somente UI pública #saved > dl/#saved > a e download público same-origin sem seguir redirects; protocolo UB2VERIFY único/JSON válido/rc zero.
- `scripts/persisted_verifier.py:88`: comparação exata de todos os campos, vínculo, estrutura e metadados; bytes baixados conferidos por tamanho e SHA-256, inclusive adulteração de mesmo tamanho.
- `scripts/persisted_verifier.py:118`: reload confirmado por documento novo, timeOrigin, tipo reload, marcador anterior removido, prontidão e URL exata. Não confundir espera fixa com prova.
- `scripts/agent_loop.py:765`: encaminha persisted_json ao módulo e devolve detalhes; persisted textual não aprova mais.
- `scripts/agent_loop.py:360`, `:662`, `:799`, `:824`, `:840`: mantém rc/envelope nos adapters, distingue negativa esperada, preserva falha de host e impede que verificação posterior substitua falha anterior. Aplicado à navegação inicial, navigate/reload, upload e execuções em single/batch.
- `scripts/recipe.py:641`, `:647`: registra o detalhe e transforma verifier negativo em RECIPE-FAIL; a proteção de falha anterior continua impedindo chamada ao verifier.
- `scripts/battery_pilot.py:33`, `:203`, `:279`, `:387`: contrato por URL/runId no caller normal, snippets novos no preflight e fingerprint do módulo. Judge continua separado; função gate não foi alterada.
- `references/persisted-verification.md`: formato, invocação normal, origem das expectativas, migração e limites, alcançável pelo SKILL.md.

## Evidência por critério

| Critério da fila | Evidência executada | Estado |
|---|---|---|
| Comparar campos, anexo e vínculo completos | `chromium-final.json`, 43/43: registro completo passa depois de reload; nove campos, demanda, metadados/link e conteúdo público do anexo; seis casos pela CLI recipe e loops single/batch, verifier real | fulfilled no adaptador T1 |
| Divergência em qualquer componente falha | Alteração isolada de cada campo e vínculo; nome/tamanho/hash/href/download; conteúdo alterado com tamanho diferente ou igual; ausente/extra/duplicado, estrutura inválida, URL errada, HTTP de anexo e erro contendo PASS | fulfilled nos casos executados |
| Falha anterior não é apagada | `guards-final.json`, 51/51: action failure, rc não zero, navegação inicial/terminal, upload negativo/erro/exceção, verifier FAIL/exceção; zero nova verificação que apague erro; recipe pula verifier após falha | fulfilled nos caminhos exercitados |
| Judge independente preservado | Gate/constante de judge comparados ao baseline por AST em static-checks.json. Controles externos sintéticos exigem identidade, pass_ e cada um dos onze checks; ausência/divergência falha. Nenhum import/leitura do judge privado no executor ou teste | fulfilled quanto à separação; benchmark não executado |

## Execuções novas, incluindo tentativas falhas

Todos os recibos estão nesta pasta, sem sobrescrita. Hashes e caminhos em SHA256SUMS.txt, gerado somente depois do freeze de código/testes/documentação.

- `baseline.json`: 1/30 contra verifier anterior; título isolado aprovava casos que deveriam falhar. Teste inicial com transporte Playwright e reload real.
- `after-01.json`: 30/30, primeira implementação.
- `after-02.json`: 37/37, casos adicionais de conteúdo/tipo/estrutura/URL e ambiente opcional.
- `after-entrypoints.json`: 43/43, incluindo CLI recipe e loops reais, sem LLM.
- `chromium-final.json`: 43/43, fonte final. Transporte substituído por page.evaluate e pedido de reload mapeado para page.reload nativo; não certifica browser-harness Hermes.
- `guards-01-error.json`: erro de setup do teste usava max_steps para run_batch (parâmetro real max_cycles). A execução não gerou o recibo solicitado; erro registrado separadamente, não como defeito do verifier.
- `guards-02.json`: 46/47. Identificou bug real no guard: negativa expected no single era tratada como fatal. Corrigido, sem apagar a falha.
- `guards-03.json`: 47/47 após correção.
- `guards-final.json`: 51/51, controles adicionais de rc booleano, exceção sticky, chaves duplicadas e correspondência das expectativas da bateria aos inputs públicos. Preflight percorre/compila o verifier real, mas seu PASS sintético não prova uso funcional.
- `recipe-regression.json`: 31 testes existentes, exit 0.
- `a002-regression.json`: 20/20.
- `a001-boundaries-regression.json`: 10/10; `a001-template-regression.json`: 6/6, templates equivalentes.
- `a001-main-regression.json`: 79/80, preservado. Um caso aria_name encontrou baseline já igual ao efeito esperado; o executor recusou corretamente efeito stale. A hipótese de contaminação do fixture foi reproduzida separadamente: set_content mantém callbacks do Window anterior, enquanto nova navegação os elimina.
- `a001-isolated-regression.json`: 80/80, com reprodução do vazamento de timer e wrapper de isolamento por documento novo. O teste original A001 não foi alterado; não enfraquecido seu predicado de frescor.
- `static-checks.json`: fontes finais conferem com os recibos, função gate inalterada, históricos preservados e lint/validação/checks Git.
- `REVIEW.md`: síntese da revisão independente read-only e limitações.

Comandos no diretório ultra-browser-v2-skill, sempre usando nome de recibo novo:

```powershell
python -B scripts/test_persisted_verifier.py --receipt novo-chromium.json
python -B scripts/test_persisted_guards.py --receipt novo-guards.json
python -B scripts/test_semantic_isolated.py --receipt novo-a001.json
python -B -m unittest discover -s scripts -p 'test_recipe.py' -v
```

## Proveniência pública e limites

O contrato do piloto vem da recipe pública `evidence/v26/results/recipes/xt24ds7-recipe.json`, do arquivo público de upload e da UI pública da fixture. Os valores sem acento da recipe correspondem ao value com acento da opção selecionada; teste registra essa relação. O arquivo fixture-evidence.txt tem 32 bytes e SHA-256 `22591ebec4f89fd83947ba44fa6e64d6a1e358ed2935a7493ed5b21cb81a3ed1`. runId e URL são fornecidos pelo caller, não lidos de arquivo privado.

A proteção usa leitura pública posterior, não ground truth de judge. Bateria completa ainda depende de ambiente/harness/fixture e de revisão da recipe legada diante do A001; o patch não migrou essa recipe nem corrigiu referências históricas a commits ausentes nesta biblioteca. Não alegar que os 19 erros conhecidos da suíte geral desapareceram. A suíte geral não foi reexecutada integralmente nesta etapa.

Nenhum recibo A001/A002 ou auditoria antiga foi modificado. O manifesto intermediário A001 já teve seu erro formalizado no novo `evidence/v26/corrections/A001-manifest-20261119/CORRECTION.json`, enviado antes de prosseguir ao A005. A001 continua parcialmente aceito; este patch não fecha a lacuna genérica de cliques sem predicado.

Sem configuração de provider, sincronização browser-eval/runtime, push/merge ou execução dos próximos itens. Entrega local para revisão sequencial.
