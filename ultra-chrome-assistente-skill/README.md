# Ultra Chrome Assistente Skill

**Version:** 0.2.0  
**Inspired by:** Perplexity Comet / Eclipse (The-Agentic-Intelligence-Co)  
**Status:** Production validated (22 elements Google, fill form, challenge detection)

---

## Overview

Chrome MV3 extension for browser automation with:
- **dom-engine pattern** - DOM extraction based on ARIA roles
- **agentic-purpose-id system** - Stable IDs (`elem_N`) for cross-command reference
- **WebSocket Bridge** (port 3032) - Background ↔ Content script communication
- **OpenClaw Gateway Integration** - Replaces Groq via `openclawClient.ts`

---

## Installation

```powershell
# 1. Open Chrome Extensions
chrome://extensions/

# 2. Enable "Developer mode" (top right)

# 3. Click "Load unpacked"
# Select: <skill-root>/extension

# 4. Verify Service Worker active:
# chrome-extension://fignfifoniblkonapihmkfakmlgkbkcf/
```

---

## Architecture

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

---

## Features Validated

| Capability | Status | Method |
|------------|--------|--------|
| CDP Script Injection | ✅ | `Runtime.evaluate` via CDP |
| DOM Extraction | ✅ | dom-engine pattern, 22 elements Google |
| agentic-purpose-id | ✅ | Auto-assignment working |
| Link/Input/Button Extraction | ✅ | ARIA selectors + implicit role |
| Fill Form | ✅ | `element.value = value` + events |
| Challenge Detection | ✅ | Cloudflare Turnstile / CAPTCHA |
| OpenClaw Gateway | ✅ | `openclawClient.ts` replaces Groq |

---

## Configuration

### Chrome with Remote Debugging (CDP fallback)
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="<profile-dir>"
```

### Environment Variables (.env)
```env
# Gateway OpenClaw
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_API_KEY=

# Extension
CHROME_ASSISTENTE_WS_PORT=3032
CHROME_CDP_PORT=9222
CHROME_PROFILE_DIR=<profile-dir>
```

---

## API Reference

### Initialize
```javascript
await chromeAssistente.connect({ port: 3032 });

const health = await chromeAssistente.healthCheck();
// { extension: "loaded", bridge: "connected", gateway: "ok" }
```

### Navigate & Extract
```javascript
const snapshot = await chromeAssistente.navigateAndExtract({
  url: "https://fredaccount.stlouisfed.org/useraccount/apikeys",
  waitFor: "networkidle",
  extract: ["links", "inputs", "buttons", "forms"]
});
// Returns: { elements: [{id, role, tag, text, attrs, rect}], url, title }
```

### Element Actions
```javascript
// Click by agentic-purpose-id
await chromeAssistente.click({ elementId: "elem_5" });

// Fill input
await chromeAssistente.fill({ 
  elementId: "elem_12", 
  value: "capnascimento321@gmail.com" 
});

// Submit form
await chromeAssistente.submit({ formId: "elem_3" });
```

### Auth Capture
```javascript
const auth = await chromeAssistente.captureAuth({
  domain: "fredaccount.stlouisfed.org",
  include: ["cookies", "localStorage", "sessionStorage"]
});
// Returns: { cookies: [...], localStorage: {...}, sessionStorage: {...} }
```

### Challenge Detection
```javascript
const challenge = await chromeAssistente.detectChallenge();
// { type: "cloudflare" | "recaptcha" | "hcaptcha" | null, details: {...} }
```

---

## Use Case: API Keys Battle

```javascript
// 1. Connect
await chromeAssistente.connect();

// 2. FRED - Login + Key
await chromeAssistente.navigateAndExtract({ 
  url: "https://fredaccount.stlouisfed.org/useraccount/apikeys" 
});
const fredKey = await chromeAssistente.extractApiKey({ 
  selector: "[data-testid='api-key']" 
});

// 3. FMP - Login Google + Dashboard
await chromeAssistente.navigateAndExtract({ 
  url: "https://fmpcloud.io/login" 
});
const fmpKey = await chromeAssistente.extractApiKey({ 
  selector: ".api-key-display" 
});

// 4. Tiingo - Login + Token
await chromeAssistente.navigateAndExtract({ 
  url: "https://tiingo.com" 
});
const tiingoToken = await chromeAssistente.extractApiKey({ 
  selector: ".token-display" 
});

// 5. Save to .env
await chromeAssistente.saveEnvKeys({
  FRED_API_KEY: fredKey,
  FMP_API_KEY: fmpKey,
  TIINGO_API_KEY: tiingoToken
});
```

---

## Known Limitations

| Limitation | Workaround |
|------------|------------|
| MV3 isolated world can't access `chrome.*` APIs directly | Bridge via background SW |
| Cloudflare Turnstile blocks headless automation | Use user's Chrome profile (real cookies) |
| Google OAuth rejects "insecure" browsers | Manual login once → capture session |
| Exec buffer bug in main session | Use isolated sub-agent or extension directly |

---

## Roadmap

- [ ] Auto-install via CDP (remove manual step)
- [ ] Sidepanel UX: elements tree, selector testing
- [ ] Session persistence across restarts
- [ ] Native QuantMind connectors integration
- [ ] Skill marketplace: publish as `ultra-chrome-assistente-skill@0.2.0`

---

## References

- **Eclipse Reference:** `chrome-assistente/eclipse-ref/` (107 TS files)
- **Perplexity Comet System Prompt:** Planner → Executor → Validator (MAX 12 iterations)
- **dom-engine:** ARIA role + implicit HTML role extraction
- **agentic-purpose-id:** Stable IDs for cross-command reference

---

## License

MIT - Part of labsclaw/openclaw-skills
