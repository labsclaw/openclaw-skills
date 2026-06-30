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

- Browser tool must be available (`browser({ action: "status" })`)
- If browser is not running: `browser({ action: "start", profile: "openclaw" })`
- If browser crashed (lock error): clean stale lock files at `~/.openclaw/browser/openclaw/user-data/SingletonLock`, then start
- Perplexity login state persists in the openclaw profile (cookies/session)

## Workflow

### 1. Open or reuse Perplexity tab

```js
// Check existing tabs first
browser({ action: "tabs" })

// Open new tab if no perplexity tab exists
browser({
  action: "open",
  profile: "openclaw",
  url: "https://www.perplexity.ai",
  label: "perplexity"
})
// tabId will be returned (e.g. "t1")
```

### 2. Wait for page load and snapshot

```js
browser({
  action: "snapshot",
  targetId: "<tabId>",
  refs: "aria",
  compact: true
})
```

Key elements to identify:
- Textbox (search input) — ref varies per load, search by `textbox` role
- Model selector button — has `button "Modelo"` or `button "Claude Sonnet 4.6"`
- Search button — `button "Pesquisar"` or `button "Enviar"`
- Thinking toggle — `menuitemcheckbox "Thinking"` with `switch`

### 3. Select model (optional)

Click the model button to open the dropdown:

```js
browser({
  action: "act",
  targetId: "<tabId>",
  kind: "click",
  ref: "<model-button-ref>"
})
```

Available models on Perplexity (as of 2026-06):
- Melhor (auto-select best)
- Sonar 2
- GPT-5.4
- GPT-5.5 Max
- Gemini 3.1 Pro
- **Claude Sonnet 4.6**
- Claude Opus 4.7 Max
- Kimi K2.6
- Nemotron 3 Super

Find the model in the dropdown menu and click it:

```js
browser({
  action: "act",
  targetId: "<tabId>",
  kind: "click",
  ref: "<model-option-ref>",
  request: { kind: "click", ref: "<model-option-ref>", targetId: "<tabId>" }
})
```

### 4. Toggle Thinking mode (optional, Claude models only)

If `menuitemcheckbox "Thinking"` is visible in the model dropdown, click it:

```js
browser({
  action: "act",
  targetId: "<tabId>",
  kind: "click",
  ref: "<thinking-ref>",
  request: { kind: "click", ref: "<thinking-ref>", targetId: "<tabId>" }
})
```

Then close the dropdown by clicking the textbox or pressing Escape.

### 5. Type the query

Focus the textbox and type:

```js
browser({
  action: "act",
  targetId: "<tabId>",
  kind: "type",
  ref: "<textbox-ref>",
  text: "<user query>",
  submit: true, // may not trigger submission on all layouts
  request: { kind: "type", ref: "<textbox-ref>", targetId: "<tabId>", text: "<user query>" }
})
```

### 6. Submit (if submit:true did not work)

```js
browser({
  action: "act",
  targetId: "<tabId>",
  kind: "click",
  ref: "<send-ref>",
  request: { kind: "click", ref: "<send-ref>", targetId: "<tabId>" }
})
```

### 7. Wait for response and collect result

Wait 3-5 seconds for generation, then snapshot:

```js
// wait
browser({
  action: "snapshot",
  targetId: "<tabId>",
  refs: "aria",
  compact: true
})
```

The response appears in `tabpanel "Resposta"`. Extract:
- Heading with the question
- Paragraphs for the answer body
- Headings for sections (Principais melhorias, Disponibilidade, etc.)
- Link citations (source URLs)
- "Concluiu X etapas" indicates multi-step research completed

### 8. Return results to user

Format the extracted text as clean markdown. Include:
- The question as heading
- The answer body
- Any subsections with their content
- Source links at the bottom
- Note the model used

## Known issues

- **Browser crash on double start**: If a Chrome instance is already running with the same user-data-dir, openclaw's Chrome fails with "Lock file can not be created". Fix: `browser({ action: "stop" })` then clean `SingletonLock`/`SingletonSocket`/`SingletonCookie` from `~/.openclaw/browser/openclaw/user-data/`, then `browser({ action: "start" })`
- **Stale refs**: Always snapshot after navigation or model selection before acting on new elements
- **Encoding**: Avoid accented characters in queries (Windows code page 850); use plain ASCII
- **act ref mismatch**: Some act calls need `request` param with the same kind/ref/targetId nested inside
