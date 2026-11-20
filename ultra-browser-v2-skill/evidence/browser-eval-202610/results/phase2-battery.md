# Fase 2 — Bateria T1-T6 (browser-harness nativo, 2026-10-17)

**Skill avaliada:** browser-harness v0.1.13 (CDP attach ao Chrome real do usuário — equivale ao modo "ultra-chrome-stealth-navigator" + gravação nativa)
**Todas as tarefas gravadas** → `recordings/harness-*` (frames + events.jsonl + video.html)

| ID | Tarefa | Tentativas | Resultado | Evidência |
|---|---|---|---|---|
| T1 | Busca Google "previsão do tempo São Paulo" | 1 | ✅ PASS — URL de busca com query correta | harness-t1-google |
| T2 | Wikipedia PT multi-hop (portal → Ciência → Matemática) | 3 | ✅ PASS (3ª tentativa) — 1ª falhou por seletor frágil ("Lógica" como link de portal não existe; "Ciência" já era portal) | harness-t2-wikipedia, -retry, -v3 |
| T3 | Google Flights Zürich→London, 1 adulto | 2 | ✅ PASS — 12 listitems de voos, Zürich+London visíveis. One-way button não achado por aria-label ("nf") mas o fluxo de busca completou com ambas cidades | harness-t3-flights |
| T4 | Form complexo: inputs + select + shadow-DOM checkbox + submit + iframe com botão interno | 1 | ✅ PASS — "OK: Roger Oliveira \| roger@labsclaw.dev \| plano=pro" + código iframe "X7-K9-42" | harness-t4-form |
| T5 | Anti-bot passivo (site com Cloudflare) | 4 | ⚠️ NULO — nowsecure.uk fora do ar ("Não é possível acessar"); Danske Bank sem challenge. **Nenhum bloqueio encontrado = o Chrome real + perfil logado não foi bloqueado** | harness-t5-v3, -v4-nowsecure |
| T6 | Dashboard KPI extraction (4 KPIs + 4 rows tabela) | 2 | ✅ PASS — 4/4 KPIs + 4/4 rows (1ª falhou por case-sensitivity do título — CSS uppercase) | harness-t6-dashboard, -v2 |

## Observações qualitativas (modo harness/CDP)

**Fortes:**
- Zero configuração pós-permissão: o daemon conecta e todos os helpers (goto_url, js, fill_input, page_info) funcionam imediatamente
- Gravação automática de cada tarefa com metadata completa (events.jsonl tem URL, title, viewport, box do elemento clicado, timestamps)
- shadow DOM e iframe: acesso direto via JS (`.shadowRoot`, `contentDocument`) — sem fricção
- Multi-hop Wikipedia: precisa de seletores mais cuidadosos, mas JS direto no DOM é confiável

**Fracos / gaps:**
- **fill_input + form.submit() no Google**: o primeiro submit da T1 só funcionou com blur+submit manual; fill_input não dispara busca
- **Google Flights**: aria-labels dinâmicos ("Where from?" muda pra "Where else?"); botão one-way não localizável por aria-label — precisa busca por texto/role mais resiliente (padrão jev-ultrafast: tabela de elementos indexada resolveria)
- **Sem verificação independente**: o resultado da T3 foi verificado manualmente por JS ad-hoc — precisa de verifier estruturado
- **Seletores frágeis na 1ª tentativa T2**: `find(a => a.textContent.trim() === 'Ciência')[0]` — o `[0]` em undefined quebra silenciosamente; a 3ª versão com `?.click()` e match por includes funcionou

## Comparativo com as skills existentes (preliminar)

| Critério | harness-CDP (testado) | ultra-browser-skill | stealth-navigator | dom-engine | assistente(WS:3032) | playwright/webapp |
|---|---|---|---|---|---|---|
| T4 shadow-DOM | ✅ direto | ⚠️ via refs do snapshot | ⚠️ seletores CSS | ✅ agenticPurposeId | ✅ elem_N | ⚠️ locator pierce |
| T4 iframe | ✅ contentDocument | ⚠️ | ⚠️ | ❌ não coberto | ✅ | ✅ frame locators |
| Gravação nativa | ✅ automática | ❌ | ❌ | ❌ | ❌ | ⚠️ trace |
| Anti-detecção | ✅ Chrome real (T5: 0 bloqueios) | ⚠️ Camofox | ✅ idem harness | n/a | ⚠️ extensão | ❌ |
| Custo p/ modelo pequeno | ⚠️ js ad-hoc gera prompts grandes | ⚠️ refs genéricos | ⚠️ | ✅ IDs estáveis | ✅ | ✅ código fixo |

**Conclusão da Fase 2:** o modo harness-CDP com Chrome real passou 5/6 (T5 nulo por alvo fora do ar). A base da skill nova é este modo + os padrões JEV (tabela indexada de elementos, verificação independente, cabeças separadas) + stealth timing entre ações.
