# Chrome Assistente Extension Skill

**Versão:** 0.3.0
**Inspiração:** Perplexity Comet / Eclipse (The-Agentic-Intelligence-Co)
**Status:** Validada em produção (dom-engine, agentic-purpose-id, challenge detection, OpenClaw Gateway)

---

## 📦 Estrutura da Extensão

```
chrome-assistente/extension/
├── manifest.json          # MV3
├── background.js          # Service Worker (relay chrome.runtime + gateway HTTP)
├── content.js             # Isolated world, dom-engine, agentic-purpose-id
├── sidepanel.html         # UI sidepanel
├── sidepanel.js           # Sidepanel logic
├── sidepanel.css          # Styling
├── openclawClient.ts      # Gateway OpenClaw integration (HTTP fetch)
└── chromeAssistente.js    # External Node SDK (CDP, port 9222)
```

---

## 🔧 Instalação (Chrome com CDP)

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="<profile-dir>" `
  --load-extension="<skill-root>/extension"
```

(Ou `chrome://extensions/` → Modo do desenvolvedor → Carregar sem compactação → `<skill-root>/extension`.)

---

## 🌉 Arquitetura de Comunicação (real, funciona)

```
┌─────────────────┐  chrome.runtime   ┌──────────────────┐
│  Content Script │ ◄──sendMessage────►│ Background SW    │
│  (isolated world)│                   │ (extension API)  │
└────────┬────────┘                   └────────┬─────────┘
         │ DOM engine                          │ HTTP fetch
         ▼                                     ▼
┌─────────────────┐                  ┌──────────────────────┐
│  Interactive     │                  │  openclawClient       │
│  elements + IDs  │                  │  OpenClaw Gateway     │
└─────────────────┘                  │  :18789/v1/completions│
                                     └──────────────────────┘

Controle externo (driver de automação):
┌──────────────────────┐  CDP (9222)  ┌────────────────────────┐
│  Node SDK            │◄────────────►│  Target tab            │
│  chromeAssistente.js│  Runtime.eval │  (dom-engine via CDP)  │
└──────────────────────┘              └────────────────────────┘
```

- **Content Script:** Isolated world (MV3), injetado via `scripting.executeScript`.
- **Background SW:** relay `chrome.runtime` + `openclawClient` HTTP → gateway.
- **Gateway:** `openclawClient.ts` faz `fetch` para `http://localhost:18789/v1/chat/completions`.
- **External:** `chromeAssistente.js` usa **CDP (porta 9222)**, NÃO WebSocket.

> ⚠️ **`chrome.sockets` / WS porta 3032 é CÓDIGO MORTO.** `chrome.sockets` foi removido
> do Chrome desktop estável e nunca funcionou lá. Removido nesta versão. Use CDP.

---

## 🧠 Dom-Engine Pattern (Content Script)

```javascript
const INTERACTIVE_ROLES = [
  'button', 'link', 'textbox', 'checkbox', 'radio',
  'menuitem', 'tab', 'searchbox', 'slider', 'spinbutton', 'switch'
];

function buildDomSnapshot(root = document) {
  const elements = [];
  let counter = 0;
  (function walk(node) {
    if (node.nodeType !== 1) return;
    const role = node.getAttribute('role') || getImplicitRole(node);
    if (INTERACTIVE_ROLES.includes(role) || isInteractive(node)) {
      const id = `elem_${++counter}`;
      node.dataset.agenticPurposeId = id;
      elements.push({ id, role, tag: node.tagName, text: (node.innerText||'').slice(0,100), attrs: extractAttrs(node), rect: node.getBoundingClientRect() });
    }
    for (const c of node.children) walk(c);
  })(root);
  return elements;
}
```

**agentic-purpose-id system:** IDs estáveis (`elem_1`, `elem_2`...) para referenciar elementos entre comandos.

---

## 🎯 Capacidades Validadas

| Capacidade | Status | Método |
|------------|--------|--------|
| CDP Script Injection | ✅ | `Runtime.evaluate` via CDP (port 9222) |
| DOM Extraction | ✅ | dom-engine pattern, ARIA + implicit role |
| agentic-purpose-id | ✅ | Auto-atribuição estável |
| Link/Input/Button Extraction | ✅ | Seletores ARIA + role implícito |
| Fill Form | ✅ | `element.value = value` + events |
| Challenge Detection | ✅ | Cloudflare Turnstile / CAPTCHA / hCaptcha |
| OpenClaw Gateway | ✅ | `openclawClient.ts` HTTP → `:18789/v1/chat/completions` |

---

## 📋 API da Skill

### Inicialização (SDK externa Node)
```javascript
import ChromeAssistente from './extension/chromeAssistente.js';
const ca = new ChromeAssistente();
await ca.connect({ port: 9222 }); // CDP
const health = await ca.healthCheck();
// { extension: "loaded", bridge: "connected", transport: "cdp" }
```

> `healthCheck()` interno (sidepanel/background) é `chrome.runtime.sendMessage` — não HTTP.

### Navegação + Extração
```javascript
const snapshot = await ca.navigateAndExtract({
  url: "https://fredaccount.stlouisfed.org/useraccount/apikeys",
  extract: ["links", "inputs", "buttons", "forms"]
});
// { elements: [{id, role, tag, text, attrs, rect}], url, title }
```

### Interação
```javascript
await ca.click({ elementId: "elem_5" });
await ca.fill({ elementId: "elem_12", value: "user@example.com" });
await ca.submit({ formId: "elem_3" });
```

### Captura de Storage (revisar antes de salvar — segurança)
```javascript
const auth = await ca.captureAuth({ domain: "fredaccount.stlouisfed.org" });
// { cookies, localStorage, sessionStorage } — REVISAR ANTES DE ARMAZENAR
```

### Detecção de Challenges
```javascript
const challenges = await ca.detectChallenge();
// [ { type: "cloudflare" | "recaptcha" | "hcaptcha" | "generic", confidence } ]
```

---

## 🔐 Segurança (IMPORTANTE)

A skill lê cookies/localStorage/sessionStorage da página ativa. Isso é **credencial de
terceiro** e NÃO deve ser exfiltrada nem salva silenciosamente.

- `captureAuth()` devolve os dados para revisão humana. Não auto-persistir em repo/chat/remoto.
- Não usar para harvest de credenciais de sites que você não controla.
- `saveEnvKeys()` (auto-write `.env`) foi removido de propósito para evitar captura silenciosa.

---

## 🚀 Fluxo: Batalha das API Keys (manual, human-in-the-loop)

```javascript
const ca = new ChromeAssistente();
await ca.connect({ port: 9222 });

await ca.navigateAndExtract({ url: "https://fredaccount.stlouisfed.org/useraccount/apikeys" });
const fredKey = await ca.extractApiKey({ selector: "[data-testid='api-key']" });

await ca.navigateAndExtract({ url: "https://fmpcloud.io/login" });
const fmpKey = await ca.extractApiKey({ selector: ".api-key-display" });

await ca.navigateAndExtract({ url: "https://tiingo.com" });
const tiingoToken = await ca.extractApiKey({ selector: ".token-display" });

// Guarde as chaves manualmente num secret manager — NUNCA auto-salvo pela skill.
```

---

## ⚙️ Configuração

```env
# Gateway OpenClaw (openclawClient.ts)
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_API_KEY=

# CDP transport (SDK externa)
CHROME_CDP_PORT=9222
CHROME_PROFILE_DIR=<profile-dir>
```

---

## 🔗 Referências

- Eclipse Reference: `eclipse-ref/` (107 TS files)
- Perplexity Comet System Prompt: Planner → Executor → Validator (MAX 12 iterações)
- dom-engine: role ARIA + role implícito HTML
- agentic-purpose-id: IDs estáveis cross-comando

---

## ⚠️ Limitações

| Limitação | Workaround |
|-----------|------------|
| MV3 não acessa `chrome.*` no isolated world | Bridge via background SW |
| `chrome.sockets` removido do Chrome stable | Usar CDP (9222) para controle externo |
| Cloudflare Turnstile bloqueia headless | Usar Chrome profile do usuário (cookies reais) |
| OAuth Google rejeita navegadores "inseguros" | Login manual → captura sessão |

---

## 📝 Roadmap

- [ ] Auto-install via CDP
- [ ] Sidepanel UX: elements tree, teste de seletores
- [ ] Persistência de sessão cross-restart
