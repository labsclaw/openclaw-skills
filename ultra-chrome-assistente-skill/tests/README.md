# Tests — ultra-chrome-assistente-skill

## Quick Run

```bash
# Unit tests (no Chrome needed — validates dom-engine logic in isolation)
node tests/test_dom_engine.js

# Integration tests (starts Chrome with extension, runs full flow)
node tests/test_integration.js

# Both
node tests/test_dom_engine.js && node tests/test_integration.js
```

## What's Tested

### Unit Tests (`test_dom_engine.js`)
- `getImplicitRole()` — correct ARIA role mapping for all HTML elements
- `isInteractive()` — filtering by role, disabled state, visibility
- `buildDomSnapshot()` — DOM traversal, element extraction, agentic-purpose-id assignment
- `detectChallenge()` — Cloudflare, reCAPTCHA, hCaptcha detection
- `captureAuth()` — cookies, localStorage, sessionStorage extraction

### Integration Tests (`test_integration.js`)
- Chrome launches with `--load-extension` + CDP
- Extension Service Worker loads
- Content script injected into live page
- Dom-engine finds elements on google.com
- Agentic-purpose-id persists across calls
- Click, fill, and navigation actions work

## Requirements

- Node.js 18+
- Google Chrome installed
- `ws` package (`npm install ws` in skill root)
