# Fase 1 — Inventário das Skills de Navegação (2026-10-17)

## Matriz de Capacidades

| Skill | Transporte | Representação DOM | Anti-detecção | Gravação | Pontos Fortes | Pontos Fracos |
|---|---|---|---|---|---|---|
| **ultra-browser-skill** | Browser tool nativo (snapshot+act), CDP, Camofox, vision fallback | Refs ARIA (e1,e2) | ⚠️ Parcial (Camofox fallback) | ❌ | Loop 4 fases OBSERVE→DECIDE→ACT→VERIFY; fallback hierarchy; progressive disclosure; regras de segurança (nunca pagar/enviar sem review) | Sem timing humano; sem gravação nativa |
| **ultra-chrome-stealth-navigator** | **CDP attach no Chrome real do usuário** (Playwright connect_over_cdp) | Seletores CSS | ✅ Forte (perfil logado + fingerprint patch + human move/click/type com curvas e jitter) | ❌ | Chrome real = 90% dos sinais de bot eliminados; espera passiva Turnstile; checklist anti-bot rígido | Depende de Chrome aberto c/ flag 9222; 1 aba só; sem gravação |
| **ultra-browser-stealth-timing** | Camada sobre browser tool (JSON act) | Refs (e5,e12) | ✅ Timing discipline (delays 300ms–2.5s, typing char-por-char, hover antes de click, scroll em passos, tab única) | ❌ | Regras de timing quantificadas; integração limpa c/ loop existente; tratamento passivo Cloudflare | Não é standalone — precisa do browser tool base |
| **ultra-dom-engine** | Injeção via browser act:evaluate (npm @agentic-intelligence/dom-engine) | **agenticPurposeId** (IDs descritivos estáveis) | ⚠️ Eventos human-like (mouseover→mousedown→mouseup→click; keydown→input→keyup por char) | ❌ | IDs semânticos estáveis p/ referenciar elementos entre passos; smart scroll; structured extraction (total=12 contadores) | Requer injeção de script por página; depende do npm package |
| **ultra-chrome-assistente** | **Extension MV3 + WebSocket :3032** (bridge p/ OpenClaw Gateway) | agentic-purpose-id (elem_N) | ⚠️ Extensão real (mas é sinal de automação visível) | ❌ | Validada em produção (22 elems Google, fill form, challenge detect); captureAuth (cookies/storage); sidepanel UI | Extensão precisa estar carregada; SW dorme (MV3); porta 3032 pode conflitar |
| **ultra-chrome-devtools** | chrome-devtools-mcp (headless) | Snapshot MCP | ❌ | ⚠️ screencast webp | Lighthouse + performance trace (LCP, CLS, insights); lista network/console | Foco perf, não navegação; headless não serve p/ stealth |
| **playwright-expert** | Playwright puro (E2E tests) | Locators padrão | ❌ | ⚠️ trace/screencast | Baseline determinístico; CI | Não é agentic — código fixo por página |
| **webapp-testing** | Playwright local | Locators + trace viewer | ❌ | ⚠️ screenshots+logs | Simples; bom p/ apps locais | Não é agentic |

## Referências JEV (arquitetura, runtime indisponível no free tier — ver phase0-results.md)

| Projeto | Padrões a herdar |
|---|---|
| **jev-ultrafast** (browser-use) | Action space dinâmico indexado ([1] button · label); **uma request por ciclo** (operation+target heads especulativos numa chamada); snapshot atômico c/ freshness guards; validação de target (occlusion, geometry); espera por estado útil (200ms sugestões, 50ms animação); focus emulation p/ tabs em background; **DONE exige verificação independente**; texto só quando op=TYPE_TEXT (small LLM); "Model output never becomes selectors/coords/JS" |
| **jev-browser-use** (wy-coliney) | Handoff **"Jev clica, Codex pensa e verifica"** — decisões repetitivas no modelo barato, texto/julgamento visual/verificação no caro; completion signal traz o verificador de volta; acessibilidade textual (não screenshots); sessões retêm progresso entre handoffs |

## Gap Analysis (o que NENHUMA skill tem hoje)

1. **Gravação de evidência nativa** — nenhuma grava por padrão. O browser-harness já entrega isso (recording.webp+replay), a skill nova só precisa padronizar wrap start/stop.
2. **Cabeças separadas decisão/texto** — todas usam UM modelo pra tudo. JEV prova que separar operation/target de text-generation viabiliza modelos baratos.
3. **Model routing por orçamento** — nada roteia Jev→free→caro.
4. **Verifier independente de DONE** — ultra-browser tem "verify after action" mas ninguém exige verificação de resultado **por código independente do modelo**.
5. **Rubrica de avaliação** — nenhuma skill tem método de comparação (este repo agora tem).
6. **Anti-detecção em camadas** — stealth-navigator (CDP real) e stealth-timing (comportamento) existem separados; nunca foram combinados + hierarquia de escalada.
7. **Snapshot a11y-first sem screenshot** — JEV consome texto estruturado; nossas skills usam refs genéricos. a11y tree + agenticPurposeId juntos são mais baratos p/ modelos pequenos.
