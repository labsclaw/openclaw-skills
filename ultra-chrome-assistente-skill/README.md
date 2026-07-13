# Ultra Chrome Assistente Skill

**Version:** 0.3.0
**Inspired by:** Perplexity Comet / Eclipse (The-Agentic-Intelligence-Co)
**Status:** Production validated (dom-engine, agentic-purpose-id, challenge detection, OpenClaw Gateway)

---

## Overview

Chrome MV3 extension for browser automation with:
- **dom-engine pattern** - DOM extraction based on ARIA roles
- **agentic-purpose-id system** - Stable IDs (`elem_N`) for cross-command reference
- **Chrome DevTools Protocol (CDP)** - external control via `--remote-debugging-port=9222`
- **OpenClaw Gateway Integration** - `openclawClient.ts` calls `http://localhost:18789/v1/chat/completions`

---

## Architecture (real, working)

```
┌─────────────────┐  chrome.runtime   ┌──────────────────┐
│  Content Script │ ◄──sendMessage────►│ Background SW    │
│  (isolated world)│                   │ (extension API)  │
└────────┬────────┘                   └────────┬─────────┘
         │                                     │
         │ DOM engine (page context)           │ HTTP fetch
         ▼                                     ▼
┌─────────────────┐                  ┌──────────────────┐
│  Interactive     │                  │  openclawClient  │
│  elements + IDs  │                  │  OpenClaw Gateway │
└─────────────────┘                  │  :18789/v1/...   │
                                     └──────────────────┘

External control (automation driver):
┌──────────────────────┐  CDP (9222)  ┌────────────────────────┐
│  Node SDK            │◄────────────►│  Target tab            │
│  chromeAssistente.js│  Runtime.eval │  (dom-engine via CDP)  │
└──────────────────────┘              └────────────────────────┘
```

> **NOTE: The `chrome.sockets` WebSocket server (WS port 3032) described in earlier
> versions is DEAD CODE.** `chrome.sockets` was removed from stable desktop Chrome
> and never worked there. It is removed in this version. External automation uses
> CDP (port 9222) instead — see "Configuration" below.

---

## Installation

```powershell
# 1. Launch Chrome with remote debugging + the extension loaded
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="<profile-dir>" `
  --load-extension="<skill-root>/extension"

# 2. (Optional) Load unpacked manually instead:
#    chrome://extensions/ -> Developer mode -> Load unpacked -> <skill-root>/extension
```

---

## Configuration

### Chrome with Remote Debugging (CDP) — REQUIRED for external automation
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="<profile-dir>"
```

### Environment Variables (.env)
```env
# Gateway OpenClaw (used by openclawClient.ts inside the extension)
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_API_KEY=

# CDP transport for the external Node SDK (chromeAssistente.js)
CHROME_CDP_PORT=9222
CHROME_PROFILE_DIR=<profile-dir>
```

---

## API Reference

### Initialize (external Node SDK)
```javascript
import ChromeAssistente from './extension/chromeAssistente.js';
const ca = new ChromeAssistente();
await ca.connect({ port: 9222 }); // CDP, defaults to 9222

const health = await ca.healthCheck();
// { extension: "loaded", bridge: "connected", transport: "cdp" }
```

> The in-extension `healthCheck()` (sidepanel/background) is an internal
> `chrome.runtime.sendMessage` check — NOT an external HTTP endpoint.

### Navigate & Extract
```javascript
const snapshot = await ca.navigateAndExtract({
  url: "https://fredaccount.stlouisfed.org/useraccount/apikeys",
  extract: ["links", "inputs", "buttons", "forms"]
});
// Returns: { elements: [{id, role, tag, text, attrs, rect}], url, title }
```

### Element Actions
```javascript
await ca.click({ elementId: "elem_5" });
await ca.fill({ elementId: "elem_12", value: "capnascimento321@gmail.com" });
await ca.submit({ formId: "elem_3" });
```

### Auth Capture (manual review required — see Security)
```javascript
const auth = await ca.captureAuth({ domain: "fredaccount.stlouisfed.org" });
// { cookies, localStorage, sessionStorage } — REVIEW BEFORE STORING
```

### Challenge Detection
```javascript
const challenges = await ca.detectChallenge();
// [ { type: "cloudflare" | "recaptcha" | "hcaptcha" | "generic", confidence } ]
```

---

## Security Notes (IMPORTANT)

This skill can read cookies, localStorage and sessionStorage of the active page.
That data is **third-party credential material** and must NOT be silently exfiltrated
or stored in shared locations.

- `captureAuth()` returns the data so a human can review it. Do not auto-persist to
  a repo, chat, or remote store.
- Do not use this skill to harvest credentials from sites you do not own/operate.
- `saveEnvKeys()` (auto-write to `.env`) was removed deliberately to avoid silent
  credential capture.

---

## Use Case: API Keys (manual, human-in-the-loop)

```javascript
const ca = new ChromeAssistente();
await ca.connect({ port: 9222 });

// FRED
await ca.navigateAndExtract({ url: "https://fredaccount.stlouisfed.org/useraccount/apikeys" });
const fredKey = await ca.extractApiKey({ selector: "[data-testid='api-key']" });

// FMP
await ca.navigateAndExtract({ url: "https://fmpcloud.io/login" });
const fmpKey = await ca.extractApiKey({ selector: ".api-key-display" });

// Tiingo
await ca.navigateAndExtract({ url: "https://tiingo.com" });
const tiingoToken = await ca.extractApiKey({ selector: ".token-display" });

// Store keys yourself, manually, in a secret manager — never auto-saved by the skill.
```

---

## Features Validated

| Capability | Status | Method |
|------------|--------|--------|
| CDP Script Injection | ✅ | `Runtime.evaluate` via CDP (port 9222) |
| DOM Extraction | ✅ | dom-engine pattern, ARIA + implicit roles |
| agentic-purpose-id | ✅ | Auto-assignment, stable across calls |
| Link/Input/Button Extraction | ✅ | ARIA selectors + implicit role |
| Fill Form | ✅ | `element.value = value` + events |
| Challenge Detection | ✅ | Cloudflare Turnstile / CAPTCHA / hCaptcha |
| OpenClaw Gateway | ✅ | `openclawClient.ts` HTTP fetch to `:18789/v1/chat/completions` |

---

## Known Limitations

| Limitation | Workaround |
|------------|------------|
| MV3 isolated world can't access `chrome.*` APIs directly | Bridge via background SW + content script |
| `chrome.sockets` removed from stable Chrome | Use CDP (9222) for external control |
| Cloudflare Turnstile blocks headless automation | Use user's Chrome profile (real cookies) |
| Google OAuth rejects "insecure" browsers | Manual login once → capture session |

---

## Tests

```bash
npm install      # installs ws (dev) for the CDP test
npm test         # unit + integration + CDP bridge
```

- `tests/test_dom_engine.js` — dom-engine + agentic-purpose-id (60 cases)
- `tests/test_integration.js` — live Chrome DOM extraction (5 cases)
- `tests/test_cdp_bridge.js` — external SDK via CDP (requires Chrome + 9222)

---

## License

MIT - Part of labsclaw/openclaw-skills
