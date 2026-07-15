---
name: "browser-stealth-timing"
description: "Add human-like timing and anti-detection patterns to browser automation"
---

# Skill: browser-stealth-timing

_Extends: browser-automation (plugin-skill)_

## Purpose

When the browser tool runs multi-step flows (login, form filling, navigation sequences), timing patterns reveal automation. This skill adds human-like behavioral timing to reduce detection without changing the underlying tool calls.

**When to apply:** Any multi-step browser flow where bot detection is a risk (Cloudflare, Akismet, PerimeterX, DataDome). Skip for internal tools, localhost, or single-check reads.

---

## Core Principles

### 1. Randomized Inter-Action Delays

Never fire actions back-to-back. Insert variable pauses between distinct steps.

| Action type | Delay range | Rationale |
|---|---|---|
| After navigation | 800ms–2.5s | Page load + human scan time |
| Before click (after snapshot) | 300ms–900ms | Human reads before clicking |
| Between form fields | 400ms–1.2s | Tab/move between inputs |
| After form submit | 1000ms–3s | Wait for response + human check |
| Between unrelated actions | 500ms–2s | Context switching pause |

**Implementation:** Use `act` kind="wait" with `timeMs` between steps, or `evaluate` with `setTimeout` for more natural variance.

```json
{ "action": "act", "kind": "wait", "timeMs": 1200, "targetId": "task" }
```

### 2. Character-by-Character Typing

Replace bulk `fill` with individual keystroke simulation when typing into visible input fields. This mimics human typing rhythm.

**Instead of:**
```json
{ "action": "act", "kind": "fill", "ref": "e5", "text": "myemail@example.com" }
```

**Use:**
```json
{ "action": "act", "kind": "type", "ref": "e5", "text": "myemail@example.com", "slowly": true }
```

**When to use `slowly: true`:**
- Login forms (username/password)
- Search bars on public sites
- Contact forms
- Any field where typing speed is monitored

**When bulk fill is fine:**
- Internal tools (localhost, admin panels)
- Fields you just filled and are now re-filling
- Test environments

### 3. Mouse Movement Before Clicks

When clicking a button or link, hover over the target area first with a brief pause. This adds the hover-before-click pattern humans naturally do.

```json
{ "action": "act", "kind": "hover", "ref": "e12", "targetId": "task" }
```
Then wait 200–600ms, then click:
```json
{ "action": "act", "kind": "click", "ref": "e12", "targetId": "task" }
```

### 4. Scroll in Steps

When scrolling to find content, use multiple smaller scrolls instead of one large jump.

**Instead of:** One big scroll via `act:evaluate` with `window.scrollTo(0, 3000)`

**Use:** 2-3 sequential scroll actions with 300–800ms pauses between them.

### 5. Single Tab Discipline

During stealth-sensitive flows, keep one active tab. Do not open parallel tabs to the same domain — multiple concurrent workers is a strong bot signal.

### 6. Cloudflare / Turnstile Passive Handling

When a Cloudflare challenge iframe appears:

1. **Do not click the checkbox.** Turnstile detects non-human interaction patterns.
2. **Wait passively.** If the browser is trusted (real profile via `profile="user"`), Turnstile usually auto-resolves in 2–5 seconds.
3. After challenge resolves, continue the flow.
4. If challenge persists beyond 15 seconds, report to user for manual resolution.

```json
{ "action": "act", "kind": "wait", "timeMs": 5000, "targetId": "task" }
```

Then re-snapshot to verify the challenge cleared.

---

## Timing Variance Rules

- **Never use fixed delays.** Always vary within the range. Pick a random value, don't default to the midpoint.
- **Shorter delays for trusted contexts** (localhost, internal tools): use the lower bound.
- **Longer delays for public sites** with known bot detection: use the upper bound.
- **After errors or retries**, add a longer pause (2–5s) before retrying — humans hesitate after failures.

---

## Integration with Existing browser-automation

This skill layers on top of the existing workflow:

1. **Snapshot** (unchanged) — read the page state
2. **Add delay** (new) — 300–900ms pause
3. **Hover** (new) — optional, for important clicks
4. **Act** (unchanged) — click/type/evaluate
5. **Add delay** (new) — 500–2000ms pause
6. **Re-snapshot** (unchanged) — verify result

The Operating Loop, Tab Hygiene, and Stale Ref Recovery from browser-automation remain unchanged. This skill only adds timing discipline to the action sequences.

---

## Quick Reference

| Situation | What to do |
|---|---|
| Typing credentials | `slowly: true` + 500ms delay after |
| Clicking a login button | hover → 400ms → click → 1.5s pause |
| Navigating to new page | 1–2.5s wait after navigation |
| Cloudflare Turnstile appears | passive wait 5–10s, don't click |
| Form submission | 1–3s wait after submit |
| Error/retry | 3–5s pause before retry |
| Multiple actions in sequence | 500ms–2s between each distinct action |
