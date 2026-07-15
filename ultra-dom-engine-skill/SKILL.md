# Skill: ultra-dom-engine

**Depends on:** `@agentic-intelligence/dom-engine` (npm, installed in workspace)

## Purpose

Use dom-engine to convert any page's DOM into structured, actionable context for AI agents. Replaces generic refs (e1, e2) with descriptive `agenticPurposeId` identifiers and enables human-like click/type interactions.

**When to use:** Multi-step browser flows where element identification matters (forms, dashboards, complex UIs). Skip for simple page reads.

---

## Architecture

dom-engine runs **in the browser page context**, not in Node.js. Use `browser act:evaluate` to inject and call it.

```
Agent                          Browser Page
  │                                │
  ├─ evaluate(dom-engine code) ──► │ Inject script
  │                                │
  ├─ evaluate(getInteractiveContext()) ──► │ Returns DOMExtractionResult
  │ ◄── { interactiveElements, scrollInfo } │
  │                                │
  ├─ evaluate(executeActions([...])) ──► │ Click/type with human-like events
  │ ◄── { success, results }       │
  │                                │
  ├─ evaluate(scrollToNewContent()) ──► │ Smart scroll
  │ ◄── { success, scrolledTo }    │
```

---

## Step 1: Inject dom-engine into the page

First, load the dom-engine source into the page. Use the bundled dist file:

```javascript
// browser act:evaluate
(() => {
  const script = document.createElement('script');
  script.src = 'data:text/javascript;base64,' + btoa(`
    // dom-engine core (inlined from node_modules)
    // See inject-dom-engine.js for the full injection
  `);
  document.head.appendChild(script);
  return 'dom-engine injected';
})()
```

**Simpler approach:** Use the pre-built injection script at `openclaw-skills/ultra-dom-engine-skill/inject-dom-engine.js`. This bundles the dom-engine source as a self-executing function.

---

## Step 2: Get Interactive Context

After injection, call `getInteractiveContext()` to get the structured DOM data:

```javascript
// browser act:evaluate
(() => {
  const result = window.getInteractiveContext({ injectTrackers: true });
  return JSON.stringify(result, null, 2);
})()
```

### Response Structure

```json
{
  "interactiveElements": {
    "total": 12,
    "buttons": [
      {
        "text": "Submit",
        "agenticPurposeId": "a1b2c3d4",
        "className": "btn btn-primary",
        "onclick": "Yes",
        "tabindex": 0,
        "role": "button",
        "ariaLabel": "Submit form"
      }
    ],
    "inputs": [
      {
        "text": "Placeholder: Enter your email | Name: email",
        "agenticPurposeId": "e5f6g7h8",
        "className": "form-control",
        "onclick": "No",
        "tabindex": 1
      }
    ],
    "links": [...],
    "editable": [...],
    "custom": [...],
    "selectable": [...]
  },
  "scrollInfo": {
    "totalHeight": 2000,
    "viewportHeight": 800,
    "scrollTop": 0,
    "verticalScrollPercentage": 0,
    "remainingHeight": 1200,
    "nextContentPixel": 800
  }
}
```

### Use `agenticPurposeId` for element identification

Instead of generic refs (e1, e2), use the descriptive IDs:
- `a1b2c3d4` → Submit button
- `e5f6g7h8` → Email input
- `i9j0k1l2` → "Learn more" link

---

## Step 3: Execute Actions (Human-like)

Use `executeActions()` for clicks and typing with realistic mouse/keyboard events:

```javascript
// browser act:evaluate
(() => {
  const result = window.executeActions([
    {
      agenticPurposeId: "e5f6g7h8",
      actionType: "type",
      value: "user@example.com"
    },
    {
      agenticPurposeId: "a1b2c3d4",
      actionType: "click"
    }
  ]);
  return JSON.stringify(result, null, 2);
})()
```

### Available Actions

| actionType | What it does | Human-like events |
|---|---|---|
| `click` | Click element | mouseover → mousedown → mouseup → click + keyboard activation |
| `type` | Type text | Focus → keydown → keypress → input → keyup per character |

---

## Step 4: Smart Scroll

Use `scrollToNewContent()` for intelligent scrolling:

```javascript
// browser act:evaluate
(() => {
  const result = window.scrollToNewContent();
  return JSON.stringify(result);
})()
```

### Behavior
- If content below: scrolls to next unseen content
- If no new content: scrolls back to top (pixel 0)
- Always returns `{ success: true, scrolledTo: <number> }`

---

## Workflow: Enriched Snapshot

The primary use case is enriching the standard browser snapshot with dom-engine context:

```
1. browser act:evaluate → inject dom-engine
2. browser act:evaluate → getInteractiveContext()
3. Parse result → map agenticPurposeId to element purposes
4. Use agenticPurposeId in subsequent executeActions() calls
```

### Example: Login Form

```javascript
// Step 1: Inject
// (use inject-dom-engine.js evaluate)

// Step 2: Get context
(() => {
  const ctx = window.getInteractiveContext({ injectTrackers: true });
  return JSON.stringify(ctx.interactiveElements.inputs.map(i => ({
    id: i.agenticPurposeId,
    text: i.text,
    ariaLabel: i.ariaLabel
  })));
})()
// Returns: [{ id: "x1y2z3", text: "Placeholder: Username", ... }, ...]

// Step 3: Execute
(() => {
  return JSON.stringify(window.executeActions([
    { agenticPurposeId: "x1y2z3", actionType: "type", value: "dr_roger" },
    { agenticPurposeId: "a1b2c3d4", actionType: "type", value: "********" },
    { agenticPurposeId: "c5d6e7f8", actionType: "click" }
  ]));
})()
```

---

## Integration with ultra-browser-stealth-timing

For maximum stealth, combine with timing skill:

1. Inject dom-engine
2. Get interactive context
3. **Wait 300-900ms** (timing skill)
4. Execute actions via dom-engine (human-like events built-in)
5. **Wait 500-2000ms** (timing skill)
6. Re-snapshot or scroll

dom-engine's `executeActions()` already does human-like mouse/keyboard events, so the timing skill's delays complement it for inter-action pacing.

---

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | This file |
| `inject-dom-engine.js` | Self-contained injection script (bundles dom-engine source) |
| `README.md` | Quick reference card |
