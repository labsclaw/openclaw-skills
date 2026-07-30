---
name: browser-automation
description: >-
  Full browser automation with semantic element identification (dom-engine),
  human-like interaction patterns, tool fallback hierarchy, and execution
  discipline. Use for any multi-step browser flow, login checks, tab management,
  image generation, form filling, or recovery from stale refs/timeouts.
user-invocable: false
---

# Browser Automation v2.0

Full browser control with semantic grounding, human-like events, and self-healing patterns.
Based on patterns from Stagehand, browser-use, Skyvern, and Luna's dom-engine integration.

## Core Principle

**Observe smart, act fast, verify always, heal automatically.**

Every browser action follows: **Snapshot → Act → Verify**. No exceptions.

---

## 1. Tool Fallback Hierarchy

Use this decision tree for every browser task:

```
┌─ 1. Built-in browser tool (snapshot/click/navigate)
│     → Simple actions, single page checks, ARIA refs
│     → refs="aria" + compact=true as defaults
│
├─ 2. Camoufox (anti-detection)
│     → Sites with bot detection (Cloudflare, LinkedIn, X.com)
│     → Fingerprint spoofing, human-like profiles
│     → Use when built-in browser gets blocked
│
├─ 3. CDP Real Browser (port 9222)
│     → Logged-in sessions needing auth cookies
│     → Multi-step flows with existing Chrome profile
│
└─ 4. Dom-Engine Injection (semantic elements)
      → When refs are generic/unreliable (e1, e2, e3...)
      → When you need stable element IDs across DOM changes
      → When Playwright selectors break on SPA re-renders
```

---

## 2. Dom-Engine Injection (Semantic Elements)

The OpenClaw browser tool returns generic refs (e1, e2, e3). The dom-engine
injects a JavaScript layer that identifies elements by semantic purpose.

### When to Use

- Generic refs keep pointing to wrong elements
- SPA re-renders break your selectors between snapshot and click
- You need to find elements by role/name (e.g., "tweet button", "search box")
- Complex multi-step flows where DOM stability matters

### How It Works

```javascript
// Step 1: Inject the dom-engine (once per page)
browser act evaluate fn="injectDomEngine"

// Step 2: Get interactive context with semantic IDs
browser act evaluate fn="getInteractiveContext"
// Returns: { buttons: [{ dataTestid: "tweetButton", agenticPurposeId: "a978871c" }], ... }

// Step 3: Interact by semantic purpose
browser act evaluate fn="executeActions" args='[{ "agenticPurposeId": "a978871c", "actionType": "click" }]'
```

### Dom-Engine Capabilities

| Feature | Browser Tool Alone | With Dom-Engine |
|---------|-------------------|-----------------|
| Element identification | Generic refs (e1, e2) | Semantic IDs (tweetButton, searchBox) |
| Stability across re-renders | Breaks on DOM change | agenticPurposeId persists |
| Human-like clicks | Playwright native | mouseover→mousedown→mouseup→click |
| Typing simulation | Basic keystroke | 2% typo chance + pauses |
| Mouse movement | Direct jump | Bézier curves |
| Element discovery | Manual ref hunting | Auto-scan all interactive elements |

### Dom-Engine Injection Script

The injection script is a self-contained bundle. Store it at:
`scripts/inject-dom-engine.js` in the workspace.

Key functions:
- `injectDomEngine()` — Injects the @agentic-intelligence/dom-engine bundle
- `getInteractiveContext()` — Returns all interactive elements with agenticPurposeId
- `executeActions(actions)` — Executes actions by agenticPurposeId with human-like events
- `scrollToNewContent()` — Smart scroll that detects new content

---

## 3. Execution Discipline (NON-NEGOTIABLE)

### The 3-Step Loop

Every single browser action MUST follow this pattern:

```
1. SNAPSHOT  → Get current state (refs or dom-engine context)
2. ACT       → Perform the action with fresh refs
3. VERIFY    → Confirm the action succeeded (screenshot or snapshot)
```

**NEVER skip verification.** This is the #1 cause of browser failures.

### Rules

| Rule | Why |
|------|-----|
| Always snapshot before act | Refs go stale between calls |
| Always verify after act | Assumes = silent failures |
| Max 3 tools per action | snapshot → act → verify; if more needed, new loop |
| Screenshot when refs are ambiguous | Visual state > accessibility tree |
| If action fails, diagnose before retry | Never repeat the same failed action |
| After navigation, always re-snapshot | DOM changed completely |
| After modal/popup, re-snapshot | New layer on top of old DOM |

### Stale Ref Recovery

If an action fails with missing/stale ref:

1. Snapshot the same targetId again
2. Find the current visible control
3. Retry once with new ref
4. If UI moved to blocker state, report blocker — do NOT loop

### Common Failure Patterns & Fixes

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| "Element not found" | Ref stale after DOM change | Re-snapshot, get fresh ref |
| Click lands wrong spot | Accessibility tree position mismatch | Use screenshot + coordinates |
| Form submit doesn't work | SPA intercepted native submit | Inject framework-aware JS (React/Vue/Angular) |
| Page keeps loading | SPA waiting for API | Wait for networkidle or specific element |
| Cloudflare challenge | Bot detection triggered | Switch to Camoufox profile |
| Snapshot truncated (~38k) | Page too large | Fallback to screenshot + image analysis |

---

## 4. Tab Hygiene

Before creating a tab for a named task:

```json
{ "action": "tabs" }
```

Reuse existing matching label/URL when still usable. If none:

```json
{ "action": "open", "url": "https://example.com", "label": "task" }
```

Target by label:

```json
{ "action": "snapshot", "targetId": "task", "refs": "aria" }
```

Close duplicates by tabId:

```json
{ "action": "close", "targetId": "t3" }
```

**Never pass bare numbers as targetId.** Use suggestedTargetId, label, or tabId.

---

## 5. Human-Like Interaction Patterns

When stealth matters (X.com, LinkedIn, sites with bot detection):

### Mouse Movement (Bézier Curves)
```
Direct jump → detectable by anti-bot
Bézier curve → natural mouse path with random control points
```

### Typing Simulation
```
Instant fill → detectable
Human typing → 50-120ms per char, 8% pause chance, 2% typo chance
```

### Click Sequence
```
Playwright click → single event
Human click → mouseover (50ms) → mousemove (100ms) → mousedown (80ms) → mouseup (60ms) → click
```

### Delays
```
Fixed delay → pattern-detectable
Random delay → 3-8 seconds between actions, gaussian distribution
```

---

## 6. SPA Form Fill (Framework-Aware)

When `act()` fails on SPA forms (React, Vue, Angular, Svelte):

1. Detect framework (React fiber, Vue __vue__, Angular ng.getComponent)
2. Inject framework-specific JS to set value + dispatch events
3. Fallback cascade: framework-aware → native setter → custom dropdown → escalate

### Framework Detection Patterns

| Framework | Detection | Value Set |
|-----------|-----------|-----------|
| React | `element._reactInternalInstance` or `__reactFiber$` | Native input setter + React synthetic event |
| Vue | `element.__vue__` or `__vue_app__` | `vm.$emit('input', value)` |
| Angular | `window.ng.getComponent(element)` | `component.value = value` + dispatchEvent |
| Svelte | `element.__svelte_meta` | Direct property + event dispatch |

---

## 7. Existing User Browser

Use `profile="user"` only when existing cookies/login matter.

For `profile="user"` and other existing-session profiles, omit `timeoutMs` on:
`act:type`, `evaluate`, `hover`, `scrollIntoView`, `drag`, `select`, `fill`.
That driver rejects per-call timeout overrides for those actions.

---

## 8. Snapshot Truncation Protocol

When snapshot exceeds ~38k characters (page too large):

1. Fallback to `screenshot` with `fullPage: true`
2. Use image analysis to understand page state
3. Extract actionable elements from visual analysis
4. If specific element needed, use `snapshot` with `ref` to clip to one element

---

## 9. Console & Network Monitoring

During complex flows, monitor for errors:

```javascript
// After any action, check console for errors
browser console level=error

// Monitor network for failed API calls
browser console level=warning
```

Stop and report if:
- Console shows authentication errors
- Network returns 403/429 (rate limited or blocked)
- CSP violations block required resources

---

## 10. Known Limitations

| Limitation | Workaround |
|-----------|------------|
| iframe cross-origin | Access contentFrame separately, or use CDP |
| Snapshot truncation (~38k) | Screenshot fallback + image analysis |
| Exec buffer bug (PowerShell) | Use .ps1 files, not inline commands |
| Camoufox setup | `node test-camofox.mjs` to verify |
| SPA dynamic forms | Framework-aware JS injection |
| Cron delivery buffer leak | Explicit prompt constraints + Test-Path |

---

## Quick Reference

```bash
# Simple page check
browser snapshot refs="aria" compact=true

# Dom-engine injection for semantic elements
browser act evaluate fn="injectDomEngine"
browser act evaluate fn="getInteractiveContext"

# Click by semantic ID
browser act evaluate fn="executeActions" args='[{ "agenticPurposeId": "xxx", "actionType": "click" }]'

# Screenshot for visual verification
browser screenshot

# Anti-detection browsing
camofox_create_tab url="https://x.com"
camofox_snapshot
camofox_click ref="e5"

# Tab management
browser action="tabs"
browser action="open" url="https://..." label="task"
browser action="close" targetId="t3"
```
