---
name: ultra-browser-skill
description: "Advanced browser automation — ARIA grounding, multi-agent loop, DevTools, CDP attach, and self-healing interaction. Use when executing web navigation, form fill, or scraping."
---

# Ultra Browser Skill

High-reliability browser control and automation framework. Follows Progressive Disclosure: the core loop is defined below; specialized modules are loaded on demand from `references/`.

## Core Principle
1. **ARIA Grounding First:** Use accessibility refs (`e1`, `e2`) and semantic roles over fragile XPath or CSS selectors.
2. **Verify After Action:** Every state-changing action (click, type, navigate) MUST be verified with a subsequent snapshot or locator check before proceeding.
3. **Graceful Fallback:** Follow the fallback hierarchy: Native Browser Tool ➔ CDP Real-Browser ➔ Camoufox / Anti-Detection ➔ Vision Fallback.

## Quick Decision Matrix

| Task Type | Recommended Approach | Reference Doc |
| :--- | :--- | :--- |
| Standard navigation & forms | Browser Tool (`snapshot` + `act`) | This SKILL.md |
| Logged-in profile / Bot challenge | CDP Attach to existing Chrome | `references/cdp-mode.md` |
| Complex SPA forms (React/Vue) | Direct DOM Injection | `references/smart-form-fill.md` |
| Heavy article / Data extraction | Scraper Engine & Readability | `references/content-scraper.md` |

## 4-Phase Operating Loop

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. OBSERVE  │ ──► │  2. DECIDE  │ ──► │   3. ACT    │ ──► │ 4. VERIFY   │
│  (Snapshot) │     │ (Pick Ref)  │     │(Click/Type) │     │ (Confirm)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **OBSERVE:** Call `browser(action="snapshot")` or `camofox_snapshot`. Identify target element refs.
2. **DECIDE:** Choose the minimal sufficient action. Ensure required fields and targets are unambiguous.
3. **ACT:** Execute action with exact ref. For text inputs, submit or dispatch change events.
4. **VERIFY:** Check resulting URL, alerts, or new DOM elements. If blocked by challenge, transition to `references/cdp-mode.md`.

## Safety Boundaries & Rules
- Never submit payment or irreversible transactions without explicit operator review.
- Do not bypass authentication boundaries or disclose credentials.
- Handle pagination with explicit cursors/offsets rather than uncontrolled loops.
