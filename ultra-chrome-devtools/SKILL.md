# Chrome DevTools Performance Skill

Diagnóstico e otimização de performance web usando Chrome DevTools MCP.

## Pré-requisitos

```bash
npm i chrome-devtools-mcp@latest -g
```

## Uso

### 1. Iniciar o daemon (headless, não conflita com browser OpenClaw)

```bash
chrome-devtools start --headless
```

### 2. Verificar status

```bash
chrome-devtools status
```

### 3. Lighthouse Audit (acessibilidade, SEO, best practices)

```bash
chrome-devtools lighthouse_audit --outputDirPath "<workspace>/lighthouse-report"
```

Retorna scores: Accessibility, Best Practices, SEO, Agentic Browsing.
Gera `report.json` e `report.html` no diretório indicado.

### 4. Performance Trace (Core Web Vitals)

```bash
chrome-devtools performance_start_trace --reload --autoStop
```

Retorna:
- **LCP** (Largest Contentful Paint) com breakdown por fase
- **CLS** (Cumulative Layout Shift)
- **Insights automáticos**: LCPBreakdown, CLSCulprits, RenderBlocking, ImageDelivery, FontDisplay, ThirdParties, ForcedReflow, Cache, NetworkDependencyTree

### 5. Analisar insight específico

```bash
chrome-devtools performance_analyze_insight <insightSetId> <insightName>
```

Exemplo:
```bash
chrome-devtools performance_analyze_insight NAVIGATION_0 LCPBreakdown
```

### 6. Network requests

```bash
chrome-devtools list_network_requests
```

### 7. Console messages

```bash
chrome-devtools list_console_messages
```

### 8. Snapshot da página (a11y tree)

```bash
chrome-devtools take_snapshot
```

### 9. Screenshot

```bash
chrome-devtools take_screenshot --filePath "<path>/screenshot.png"
```

### 10. Parar daemon

```bash
chrome-devtools stop
```

## Workflow de Otimização em Loop

1. `navigate_page` → navega pra URL
2. `performance_start_trace --reload --autoStop` → grava trace
3. Analisa insights retornados
4. `performance_analyze_insight <id> <insightName>` → detalha o problema
5. Aplica correção no código
6. Repete passo 2 pra validar melhoria

## Flags Importantes

- `--headless`: roda sem UI (não conflita com browser OpenClaw)
- `--no-performance-crux`: desabilita busca de dados CrUX
- `--no-usage-statistics`: desabilita telemetria Google
- `--slim`: modo leve, só tarefas básicas de browser

## Padrões Avançados (inspirados no Google Antigravity)

### Recording de Sessões de Debug

Toda sessão de diagnóstico pode ser gravada como vídeo WebP:

```bash
# Iniciar screencast
chrome-devtools screencast_start --filePath "<workspace>/debug-session.webp"

# ... rodar diagnósticos ...

# Parar screencast
chrome-devtools screencast_stop
```

Útil pra documentar problemas encontrados e compartilhar com o time.

### Workflow de Correção em Loop

Padrão inspirado no Implementation Workflow do Antigravity:

1. **Diagnosticar** → `performance_start_trace` + `lighthouse_audit`
2. **Identificar** → Ler insights (LCPBreakdown, ImageDelivery, etc.)
3. **Buscar código** → `grep`/`rg` pra localizar trecho problemático
4. **Visualizar** → `read` com StartLine/EndLine pra contexto
5. **Corrigir** → `edit` com precisão de linha
6. **Validar** → Rodar trace de novo, comparar métricas
7. **Gravar** → Screencast do antes/depois

### SafeToAutoRun Pattern

Comandos podem ser分类ados por segurança:
- **Auto-safe**: `chrome-devtools status`, `take_screenshot`, `list_pages`
- **Requires approval**: `navigate_page` pra sites externos, `lighthouse_audit`
- **Never auto**: `start` com flags novas, `stop` durante diagnóstico

### Checkpoint Pattern (pra sessões longas)

Quando um diagnóstico tem múltiplos passos:

```
## Checkpoint: Diagnóstico [URL]
- Trace rodado: ✅
- Lighthouse: ✅ (A:91, BP:92, SEO:92)
- Insights analisados: LCPBreakdown, ImageDelivery
- Correções pendentes: [lista]
- Próximo passo: [ação]
```

### Design Aesthetics (quando otimizar UI)

Se o diagnóstico identificar problemas visuais/UX:

- **Typography**: Inter, Roboto, Outfit
- **Colors**: paletas curadas, gradients sutis
- **Micro-animations**: hover effects, transitions
- **Layout**: semantic HTML, unique IDs, heading structure
- **Images**: usar `generate_image` em vez de placeholders

### Web App Best Practices

Checklist de performance pra web apps:

- [ ] HTML semântico
- [ ] CSS vanilla (sem framework desnecessário)
- [ ] JavaScript modular
- [ ] Title tags e meta descriptions
- [ ] Heading structure (h1 → h2 → h3)
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] SEO: structured data, sitemap

### MCP Resources (quando disponível)

```bash
# Listar recursos disponíveis
chrome-devtools list_extensions  # se --categoryExtensions=true
chrome-devtools list_webmcp_tools  # se --categoryExperimentalWebmcp=true
```

## Notas

- Daemon usa named pipes no Windows (`\\.\pipe\chrome-devtools-mcp\server.sock`)
- Mesma instância é reusada entre comandos (preserva estado)
- Não compartilhar dados sensíveis via MCP — o browser expõe tudo aos clients
- Screencast requer flag `--experimentalScreencast=true` no start
- Memory debugging requer flag `--memoryDebugging=true` no start
- Checkpoints devem ser salvos em `memory/checkpoints/` quando aplicável
