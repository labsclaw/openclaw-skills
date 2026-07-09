---
name: ultra-perplexity-pro-bridge-skill
description: "Open Perplexity AI in the browser, select a model, toggle thinking, search, and return full results."
allowed-tools:
  - browser
user-invocable: true
---

# Ultra Perplexity Pro Bridge

Use when the user asks to search with Perplexity, start a technical session with a specific model, or get a web-grounded answer via Perplexity.

## Prerequisites

- `browser({ action: "status" })` available
- Start if needed: `browser({ action: "start", profile: "openclaw" })`
- Crash fix: delete `~/.openclaw/browser/openclaw/user-data/SingletonLock`, then start
- Login state persists in openclaw profile cookies

## Workflow

### 1. Open or reuse Perplexity tab

```js
browser({ action: "tabs" })  // check existing
browser({
  action: "open",
  profile: "openclaw",
  url: "https://www.perplexity.ai",
  label: "perplexity"
})  // returns tabId (e.g. "t1")
```

### 2. Snapshot page

```js
browser({ action: "snapshot", targetId: "<tabId>", refs: "aria", compact: true })
```

Key elements: textbox (search input), model selector button (`"Modelo"` or `"Claude Sonnet 4.6"`), send button (`"Pesquisar"` / `"Enviar"`), thinking toggle (`menuitemcheckbox "Thinking"`).

### 3. Select model (optional)

```js
browser({ action: "act", targetId: "<tabId>", kind: "click", ref: "<model-button-ref>" })
// Then click the model option in dropdown
browser({ action: "act", targetId: "<tabId>", kind: "click", ref: "<model-option-ref>" })
```

Available models (2026-06):
| Model | Notes |
|-------|-------|
| Melhor | auto-select best |
| Sonar 2 | |
| GPT-5.4 | |
| GPT-5.5 Max | |
| Gemini 3.1 Pro | |
| **Claude Sonnet 4.6** | supports Thinking |
| Claude Opus 4.7 Max | supports Thinking |
| Kimi K2.6 | |
| Nemotron 3 Super | |

### 4. Toggle Thinking (Claude models only)

```js
browser({ action: "act", targetId: "<tabId>", kind: "click", ref: "<thinking-ref>" })
```

Close dropdown by clicking the textbox or pressing Escape.

### 5. Type and submit query

```js
browser({
  action: "act", targetId: "<tabId>", kind: "type",
  ref: "<textbox-ref>", text: "<user query>", submit: true
})
```

If `submit: true` fails, click the send button:

```js
browser({ action: "act", targetId: "<tabId>", kind: "click", ref: "<send-ref>" })
```

### 6. Collect result

Wait 3-5s, then snapshot:

```js
browser({ action: "snapshot", targetId: "<tabId>", refs: "aria", compact: true })
```

Response is in `tabpanel "Resposta"`. Extract: question heading, answer paragraphs, subsection headings, link citations, and model used.

### 7. Return to user

Format as clean markdown: heading, answer body, subsections, source links, model note.

## Known issues

| Issue | Fix |
|-------|-----|
| Browser crash (lock file) | `browser({ action: "stop" })` → delete `SingletonLock`/`SingletonSocket`/`SingletonCookie` from `~/.openclaw/browser/openclaw/user-data/` → `browser({ action: "start" })` |
| Stale refs | Always snapshot after navigation or model selection |
| Encoding | Avoid accented chars (Windows code page 850); use plain ASCII |
| act ref mismatch | Some calls need `request` param with `kind/ref/targetId` nested inside |
