---
name: ultra-chrome-devtools-skill
description: "Diagnóstico e otimização de performance web usando Chrome DevTools MCP."
---

# Chrome DevTools Performance Skill

## Setup

```bash
npm i chrome-devtools-mcp@latest -g
chrome-devtools start --headless
chrome-devtools status
chrome-devtools stop
```

## Comandos

```bash
chrome-devtools lighthouse_audit --outputDirPath "<ws>/lighthouse-report"
chrome-devtools performance_start_trace --reload --autoStop
chrome-devtools performance_analyze_insight <insightSetId> <insightName>
chrome-devtools list_network_requests
chrome-devtools list_console_messages
chrome-devtools take_snapshot
chrome-devtools take_screenshot --filePath "<path>/screenshot.png"
chrome-devtools screencast_start --filePath "<ws>/debug.webp"
chrome-devtools screencast_stop
chrome-devtools list_extensions          # --categoryExtensions=true
chrome-devtools list_webmcp_tools        # --categoryExperimentalWebmcp=true
```

**Lighthouse** retorna scores (A, BP, SEO, Agentic) + `report.json` + `report.html`.

**Trace** retorna LCP, CLS e insights: LCPBreakdown, CLSCulprits, RenderBlocking, ImageDelivery, FontDisplay, ThirdParties, ForcedReflow, Cache, NetworkDependencyTree.

## Flags

| Flag | Efeito |
|------|--------|
| `--headless` | Sem UI (não conflita com browser OpenClaw) |
| `--no-performance-crux` | Desabilita dados CrUX |
| `--no-usage-statistics` | Desabilita telemetria Google |
| `--slim` | Modo leve, tarefas básicas |

## Workflow Otimização em Loop

1. `navigate_page` → URL
2. `performance_start_trace --reload --autoStop`
3. Insights → `performance_analyze_insight <id> <name>`
4. Corrige código → repete passo 2 pra validar

## Padrões

### SafeToAutoRun

- **Auto-safe**: `status`, `take_screenshot`, `list_pages`
- **Requires approval**: `navigate_page` em sites externos, `lighthouse_audit`
- **Never auto**: `start` com flags novas, `stop` durante diagnóstico

### Checkpoint (sessões longas)

```markdown
## Checkpoint: Diagnóstico [URL]
- Trace: ✅ | Lighthouse: ✅ (A:91, BP:92, SEO:92)
- Insights: LCPBreakdown, ImageDelivery
- Pendências: [lista] | Próximo: [ação]
```

Salvar em `memory/checkpoints/`.

### Correção Loop (Antigravity-inspired)

1. Diagnosticar → `performance_start_trace` + `lighthouse_audit`
2. Identificar → Ler insights
3. Buscar código → `grep`/`rg`
4. Visualizar → `read` com StartLine/EndLine
5. Corrigir → `edit` com precisão de linha
6. Validar → Trace novo, comparar métricas
7. Gravar → Screencast antes/depois

### Design Aesthetics (UI)

- Typography: Inter, Roboto, Outfit | Colors: paletas curadas, gradients sutis
- Micro-animations: hover, transitions | Layout: semantic HTML, unique IDs
- Images: `generate_image` > placeholders

### Web App Checklist

- [ ] HTML semântico | CSS vanilla | JS modular
- [ ] Title tags e meta descriptions | Heading h1→h2→h3
- [ ] Lazy loading, code splitting | SEO: structured data, sitemap

## Notas

- Named pipes: `\\.\pipe\chrome-devtools-mcp\server.sock`
- Mesma instância reusada entre comandos
- Screencast requer `--experimentalScreencast=true`
- Memory debugging requer `--memoryDebugging=true`
- Não compartilhar dados sensíveis via MCP
