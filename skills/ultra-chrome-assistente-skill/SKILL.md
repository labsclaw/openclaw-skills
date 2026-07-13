# Chrome Assistente Extension Skill

**Versão:** 0.2.0  
**Inspiração:** Perplexity Comet / Eclipse (The-Agentic-Intelligence-Co)  
**Status:** Validada em produção (22 elementos Google, fill form, challenge detection)

---

## 📦 Estrutura da Extensão

```
chrome-assistente/extension/
├── manifest.json          # MV3, permissions: activeTab, scripting, tabs, storage
├── background.js          # Service Worker, WebSocket bridge porta 3032
├── content.js             # Isolated world, dom-engine, agentic-purpose-id
├── sidepanel.html         # UI sidepanel
├── sidepanel.js           # Sidepanel logic
├── sidepanel.css          # Styling
└── openclawClient.ts      # Gateway OpenClaw integration (substitui Groq)
```

---

## 🔧 Instalação Manual (Chrome do Usuário)

```powershell
# 1. Abrir Chrome Extensions
chrome://extensions/

# 2. Ativar "Modo do desenvolvedor" (canto superior direito)

# 3. Clicar "Carregar sem compactação"
# Selecionar pasta: C:\Users\renat\.openclaw\workspace\chrome-assistente\extension

# 4. Verificar Service Worker ativo:
# chrome-extension://fignfifoniblkonapihmkfakmlgkbkcf/
```

---

## 🌉 Arquitetura de Comunicação

```
┌─────────────────┐     WS:3032      ┌──────────────────┐
│  Content Script │ ◄──────────────► │ Background SW    │
│  (isolated world)│  postMessage    │ (extension API)  │
└────────┬────────┘                  └────────┬─────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐                  ┌──────────────────┐
│  DOM Engine     │                  │  openclawClient  │
│  agentic-purpose│                  │  OpenClaw Gateway │
└─────────────────┘                  └──────────────────┘
```

- **Content Script:** Isolated world (MV3), injectado via `scripting.executeScript`
- **Background:** Service Worker, mantém WebSocket server na porta 3032
- **Bridge:** `chrome.runtime.sendMessage` + `postMessage` para isolated world
- **Gateway:** `openclawClient.ts` substitui Groq → usa gateway OpenClaw local

---

## 🧠 Dom-Engine Pattern (Content Script)

```javascript
// content.js - core extraction
const INTERACTIVE_ROLES = [
  'button', 'link', 'textbox', 'checkbox', 'radio',
  'menuitem', 'tab', 'searchbox', 'slider', 'spinbutton', 'switch'
];

function buildDomSnapshot(root = document) {
  const elements = [];
  let counter = 0;
  
  function walk(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const role = node.getAttribute('role') || getImplicitRole(node);
    if (INTERACTIVE_ROLES.includes(role) || isInteractive(node)) {
      const id = `elem_${++counter}`;
      node.dataset.agenticPurposeId = id;  // agentic-purpose-id
      elements.push({
        id, role, tag: node.tagName,
        text: node.innerText?.slice(0, 100),
        attrs: extractAttrs(node),
        rect: node.getBoundingClientRect()
      });
    }
    node.childNodes.forEach(walk);
  }
  walk(root);
  return elements;
}
```

**agentic-purpose-id system:** Auto-atribuição de IDs estáveis (`elem_1`, `elem_2`...) para referenciar elementos entre comandos.

---

## 🎯 Capacidades Validadas

| Capacidade | Status | Método |
|------------|--------|--------|
| CDP Script Injection | ✅ | `Runtime.evaluate` via CDP |
| DOM Extraction | ✅ | dom-engine pattern, 22 elementos Google |
| agentic-purpose-id | ✅ | Auto-atribuição funcionando |
| Link/Input/Button Extraction | ✅ | Seletores ARIA + role implícito |
| Fill Form | ✅ | `element.value = value` + events |
| Challenge Detection | ✅ | Cloudflare Turnstile / CAPTCHA |
| OpenClaw Gateway | ✅ | `openclawClient.ts` substitui Groq |

---

## 📋 API da Skill (para uso em tasks)

### Inicialização
```javascript
// Conectar bridge WebSocket
await chromeAssistente.connect({ port: 3032 });

// Verificar health
const health = await chromeAssistente.healthCheck();
// { extension: "loaded", bridge: "connected", gateway: "ok" }
```

### Navegação + Extração
```javascript
// Navegar + extrair snapshot
const snapshot = await chromeAssistente.navigateAndExtract({
  url: "https://fredaccount.stlouisfed.org/useraccount/apikeys",
  waitFor: "networkidle",
  extract: ["links", "inputs", "buttons", "forms"]
});

// Retorna: { elements: [{id, role, tag, text, attrs, rect}], url, title }
```

### Interação
```javascript
// Click por agentic-purpose-id
await chromeAssistente.click({ elementId: "elem_5" });

// Fill input
await chromeAssistente.fill({ 
  elementId: "elem_12", 
  value: "capnascimento321@gmail.com" 
});

// Submit form
await chromeAssistente.submit({ formId: "elem_3" });
```

### Captura de Credenciais/Storage
```javascript
// Extrair cookies/localStorage/sessionStorage do domínio
const auth = await chromeAssistente.captureAuth({
  domain: "fredaccount.stlouisfed.org",
  include: ["cookies", "localStorage", "sessionStorage"]
});

// Retorna: { cookies: [...], localStorage: {...}, sessionStorage: {...} }
```

### Detecção de Challenges
```javascript
const challenge = await chromeAssistente.detectChallenge();
// { type: "cloudflare" | "recaptcha" | "hcaptcha" | null, details: {...} }
```

---

## 🚀 Fluxo Completo: Batalha das API Keys

```javascript
// 1. Conectar
await chromeAssistente.connect();

// 2. FRED - Login + Key
await chromeAssistente.navigateAndExtract({ 
  url: "https://fredaccount.stlouisfed.org/useraccount/apikeys" 
});
// Se login dialog: fill email/password → submit
const fredKey = await chromeAssistente.extractApiKey({ 
  selector: "[data-testid='api-key']" 
});

// 3. FMP - Login Google + Dashboard
await chromeAssistente.navigateAndExtract({ 
  url: "https://fmpcloud.io/login" 
});
// OAuth Google → wait redirect → dashboard
const fmpKey = await chromeAssistente.extractApiKey({ 
  selector: ".api-key-display" 
});

// 4. Tiingo - Login + Token
await chromeAssistente.navigateAndExtract({ 
  url: "https://tiingo.com" 
});
// Login → navigate to account/token
const tiingoToken = await chromeAssistente.extractApiKey({ 
  selector: ".token-display" 
});

// 5. Salvar no .env
await chromeAssistente.saveEnvKeys({
  FRED_API_KEY: ***
  FMP_API_KEY: ***
  TIINGO_API_KEY: ***
});
```

---

## ⚙️ Configuração Necessária

### Chrome com Remote Debugging (para CDP fallback)
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="C:\Users\renat\.openclaw\chrome-profile"
```

### Variáveis de Ambiente (.env)
```env
# Gateway OpenClaw
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_API_KEY=

*** Extension
CHROME_ASSISTENTE_WS_PORT=3032
CHROME_CDP_PORT=9222
CHROME_PROFILE_DIR=C:\Users\renat\.openclaw\chrome-profile
```

---

## 🔗 Referências Técnicas

- **Eclipse Reference:** `workspace/chrome-assistente/eclipse-ref/` (107 arquivos TS)
- **Perplexity Comet System Prompt:** Planner → Executor → Validator (MAX 12 iterações)
- **dom-engine:** Extração baseada em role ARIA + role implícito HTML
- **agentic-purpose-id:** IDs estáveis para referência cross-comando

---

## ⚠️ Limitações Conhecidas

| Limitação | Workaround |
|-----------|------------|
| MV3 isolated world não acessa `chrome.*` APIs diretamente | Bridge via background SW |
| Cloudflare Turnstile bloqueia automação headless | Usar Chrome profile do usuário (cookies reais) |
| OAuth Google rejeita navegadores "inseguros" | Login manual uma vez → captura sessão |
| Exec buffer bug na sessão principal | Usar sub-agent isolado ou extension direta |

---

## 📝 Próximos Passos (Roadmap)

- [ ] Auto-install via CDP (remover passo manual)
- [ ] Sidepanel UX: visualizar elements tree, testar seletores
- [ ] Persistência de sessão cross-restart
- [ ] Integração nativa com QuantMind connectors
- [ ] Skill marketplace: publicar como `chrome-assistente@0.2.0`