# Auditoria de gatilhos e anti-gatilhos

## Escopo e resultado

Base revisada: `0af3231ce4d3c892d7240ea6c8d5d151b1645a69` da `master`.

- 77 manifests do repositório, 71 nomes únicos: 31 arquivos Ultra e 46 do bundle executivo, incluindo seis nomes duplicados.
- 60 descrições corrigidas, correspondentes a 56 nomes. As 17 restantes foram mantidas por já terem escopo suficientemente concreto. Não se exigiu um anti-gatilho cosmético em toda skill.
- 28 skills aprendidas foram revisadas separadamente: 13 descrições corrigidas e 15 mantidas. Seus corpos privados não foram copiados para este repositório. A projeção pública contém somente descrições e limites de publicação.
- Duas descriptions aprendidas continham `: ` em escalares YAML não citados; foram corrigidas com strings citadas.
- Metadados flow-style em oito manifests foram normalizados para YAML block-style, preservando os valores, para compatibilidade com o parser estrito do validador de referência.

O inventário completo, decisões, descrições anteriores/candidatas e digests estão em [inventory.json](../evals/routing-boundaries/inventory.json). As descrições aprendidas, sem seus procedimentos privados, estão em [learned-descriptions.json](../evals/routing-boundaries/learned-descriptions.json).

## Mudanças de comportamento

1. Descoberta de skills exige intenção de descoberta ou lacuna de capacidade, não qualquer pergunta “como faço X”.
2. Avaliação adversarial e planejamento não são ativados por todo “pronto”, teste simples ou pequena alteração reversível.
3. Onboarding empresarial exige pedido de setup/atualização; contexto ausente ou antigo não inicia entrevista automaticamente.
4. Advisors executivos respondem a decisões e artefatos empresariais, não à mera menção de CEO, CAC, LTV, arquitetura ou cultura.
5. Browser geral, recipe/JEV, extensão, CDP, DOM injection e QA possuem fronteiras distintas. Leitura simples não exige esses workflows.
6. Ebook, análise crítica de vídeo, digest recorrente e auditoria exaustiva não substituem definições, resumos breves ou consultas pontuais.
7. A skill de autoria, seu otimizador e templates agora ensinam gatilho e exclusão pertinente na mesma string de frontmatter. Foram removidos os conselhos de ampliar ativação por palavras genéricas e os exemplos contraditórios.

## Evidência de verificação

- YAML e inventário: 77 manifests, sem erro pelo parser YAML e pelo gate de auditoria.
- Casos: 112 consultas sintéticas, um positivo e um near miss por nome corrigido. Um agente independente recebeu apenas nomes, descrições candidatas, digests e consultas, sem expectativas, e classificou 112/112 conforme o resultado esperado.
- Os IDs foram verificados contra duplicatas, ausências e valores inválidos antes de calcular o resultado. Entrada e resultados foram preservados em [reviewer-input.json](../evals/routing-boundaries/reviewer-input.json) e [review-results.json](../evals/routing-boundaries/review-results.json).
- Oito testes do gate incluem rejeição de YAML inválido, decisão “mantida” falsa, exemplos não textuais, snapshot desatualizado, caso ausente e caminho duplicado.
- Licenças, avisos de terceiros e hashes canônicos permanecem preservados. Um fixture negativo de licença foi exercitado separadamente para confirmar rejeição.

Esta é uma avaliação semântica independente de descrições e casos sintéticos, não um benchmark controlado antes/depois, não execução dos workflows e não prova de adoção em produção. O agente herdou o modelo da sessão principal; não foi registrada uma chamada separada de provedor. O campo `routingEval` dos itens governados alterados fica `not-run` para o benchmark de provedor; os resultados históricos não são atribuídos às novas descrições.

### Compatibilidade do validador de referência

O `skills_ref.validate` foi executado nos 77 diretórios reais. Resultado bruto: **72 aprovados e cinco incompatibilidades preexistentes preservadas**, detalhadas em [official-validation.json](../evals/routing-boundaries/official-validation.json):

- Quatro manifests usam a extensão OpenClaw `user-invocable`, não reconhecida pelo esquema estrito AgentSkills. Não se removeu esse campo funcional para fabricar aprovação.
- O diretório `ultra-browser-stealth-timing-skill` preserva o nome legado `browser-stealth-timing`, utilizado pelo runtime. Renomear identidade e migrar consumidores não faz parte desta correção de gatilhos.

Essas cinco incompatibilidades não são apresentadas como sucesso no validador oficial. O gate OpenClaw do repositório verifica YAML, descrições, nomes auditados, duplicatas coerentes e fixtures; não esconde a diferença entre os esquemas.

## Runtime e publicação são estados distintos

As 13 descriptions aprendidas foram alteradas via Workshop versionado e conferidas por leitura. Os procedimentos permaneceram iguais, desconsiderando a normalização de newline final e a anotação de arquivos adicionada pela ferramenta de visualização.

As novas descrições também foram aplicadas a 52 cópias gerenciadas já existentes. Destas, 12 estavam visíveis ao modelo antes da mudança; filtros, ativação e configuração global foram preservados. Nas cópias com corpo diferente do repositório, o conteúdo mais novo foi mantido e o limite de ativação foi explicitado na entrada. Cinco recursos de autoria que coincidiam com a base foram atualizados. Backups e hashes anteriores/posteriores ficam fora das raízes ativas.

Isso comprova atualização de descrições instaladas, **não sincronização integral de todos os payloads**. Os itens governados antes marcados como integralmente sincronizados e agora alterados ficam `repository-pending-runtime` até que a instalação e os inventários completos sejam comprovados. Não se reinstalaram skills ausentes nem se habilitaram as filtradas.

## Manutenção

```bash
python -m pip install PyYAML==6.0.2
python scripts/validate-routing-boundaries.py
python scripts/test-routing-boundaries.py
node scripts/validate-library.mjs
node scripts/build-catalog.mjs --check
node scripts/validate-licenses.mjs
```

Ao mudar uma description ou adicionar uma skill, atualizar a decisão e o digest no inventário; se o gatilho mudar, registrar positivo e near miss. O gate valida integridade estrutural, não substitui a revisão semântica nem deve converter palavras-chave em um roteador rígido.
