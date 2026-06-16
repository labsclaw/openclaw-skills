# ultra-chrome-devtools

Diagnóstico e otimização de performance web usando **Chrome DevTools MCP** — ferramenta oficial do Google que dá acesso ao Chrome DevTools completo via Model Context Protocol.

## O que é

O Chrome DevTools MCP permite que coding agents (como o OpenClaw) controlem e inspecionem um navegador Chrome em tempo real. Isso inclui:

- **Lighthouse Audit** — scores automáticos de acessibilidade, SEO, best practices
- **Performance Trace** — Core Web Vitals (LCP, CLS) com insights automáticos
- **Network Analysis** — análise de requests HTTP
- **Console Debug** — mensagens de erro com stack traces mapeados
- **Screenshot/Snapshot** — estado visual e a11y tree da página

## Pré-requisitos

### 1. Node.js (LTS)

```bash
# Verificar se já tem
node --version  # mínimo v18.x
npm --version
```

Se não tiver: https://nodejs.org

### 2. Google Chrome

```bash
# Verificar versão
chrome --version
```

Suporta Chrome estável ou Chrome for Testing. Outros browsers Chromium podem funcionar mas não são garantidos.

Download: https://www.google.com/chrome

### 3. Instalar o Chrome DevTools MCP

```bash
npm i chrome-devtools-mcp@latest -g
```

### 4. Verificar instalação

```bash
chrome-devtools status
```

Se funcionar, verá algo como:

```
chrome-devtools-mcp daemon is not running.
```

## Uso Rápido

### Iniciar o daemon

```bash
chrome-devtools start --headless
```

O modo `--headless` roda sem interface gráfica, evitando conflito com outros browsers.

### Verificar status

```bash
chrome-devtools status
```

### Navegar pra um site

```bash
chrome-devtools navigate_page --url "https://example.com"
```

### Rodar Lighthouse Audit

```bash
chrome-devtools lighthouse_audit --outputDirPath "./lighthouse-report"
```

Gera `report.json` e `report.html` com scores completos.

### Performance Trace (Core Web Vitals)

```bash
chrome-devtools performance_start_trace --reload --autoStop
```

Retorna LCP, CLS e insights automáticos (imagens otimizáveis, fontes com problema, etc.).

### Parar o daemon

```bash
chrome-devtools stop
```

## Flags Disponíveis

| Flag | Descrição |
|------|-----------|
| `--headless` | Roda sem UI (recomendado pra agents) |
| `--no-performance-crux` | Desabilita busca de dados CrUX |
| `--no-usage-statistics` | Desabilita telemetria Google |
| `--slim` | Modo leve, só tarefas básicas |
| `--experimentalScreencast=true` | Habilita gravação de sessão WebP |
| `--memoryDebugging=true` | Habilita heap snapshots |

## Como funciona com o OpenClaw

O daemon roda em background via named pipe (Windows: `\\.\pipe\chrome-devtools-mcp\server.sock`). O skill `SKILL.md` documenta o workflow completo:

1. Iniciar daemon → 2. Navegar → 3. Diagnosticar → 4. Corrigir → 5. Re-testar → 6. Gravar

Consulte o `SKILL.md` para a referência completa de comandos e padrões.

## Links

- **GitHub**: https://github.com/ChromeDevTools/chrome-devtools-mcp
- **NPM**: https://www.npmjs.com/package/chrome-devtools-mcp
- **CLI Docs**: https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/cli.md
