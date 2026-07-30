---
name: ultra-x-stealth-skill
description: >-
  Post X.com threads with Playwright stealth + human behavior simulation.
  Gera imagens via Grok no browser. Upload de mídia em tweets.
  Bypasses bot detection. Trigger: X stealth, X ban, stealth tweet, anti-detection.
user-invocable: true
metadata:
  author: ClawLabs
  version: "1.1.0"
  domain: social-media
  triggers: [X stealth, X ban, stealth tweet, anti-detection, Grok image, Grok generate]
  role: specialist
  scope: browser-automation
  output-format: action
  related-skills: [x-poster, browser-automation, agente-redes-sociais]
---

# Ultra X Stealth Skill

Post X.com with Playwright stealth + human simulation. Use when x-poster blocked.
**Agora com geração de imagem via Grok e upload de mídia.**

## Architecture

```
                      ┌─ Stealth Layer ─┐
                      │  playwright-extra│
                      │  webdriver=false │
Thread Config ────────┤  real UA          ├───→ Headed Browser
  JSON               │  Chrome emulation │      persistent cookies
                     └──────────────────┘
                              │
                      ┌──────▼──────┐
                      │  Grok Image │  ← NEW
                      │  Generator  │
                      └─────┬───────┘
                            │
                      ┌─────▼───────┐
                      │ Media Upload│  ← NEW
                      │  to tweets  │
                      └─────────────┘
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/stealth-post.js` | Post tweets/threads with media support + dom-engine |
| `scripts/grok-image.js` | Generate images via Grok browser conversation |
| `scripts/inject-dom-engine.js` | DOM engine for semantic element interaction (used by stealth-post.js) |

## Quick Start

### Posting

```bash
node scripts/stealth-post.js --config examples/thread-sample.json   # thread from JSON
node scripts/stealth-post.js --text "Hello world!"                   # single tweet
node scripts/stealth-post.js --text "Reply" --reply-to 1234567890    # reply
node scripts/stealth-post.js --text "With image" --media image.jpg   # tweet with image
```

### Grok Image Generation

```bash
node scripts/grok-image.js --prompt "A dramatic photorealistic image of books being destroyed by industrial machines, dark amber lighting, dystopian atmosphere, wide shot, cinematic"
# Saves to grok-image.jpg by default

node scripts/grok-image.js --prompt "Description in Portuguese" --output /path/to/output.jpg

node scripts/grok-image.js --prompt "Cinematic scene..." --profile openclaw
```

### Full Pipeline: Grok → Tweet

```bash
# Step 1: Generate image via Grok
node scripts/grok-image.js --prompt "Dramatic scene of..." --output grok-image.jpg

# Step 2: Post tweet with the generated image (needs --media flag)
node scripts/stealth-post.js --text "Image caption" --media grok-image.jpg

# Or use the thread config with "media" field
node scripts/stealth-post.js --config examples/grok-image-thread.json
```

## Thread Config

```json
{
  "profile": "openclaw",
  "tweets": [
    { "text": "Hook tweet with image", "media": "path/to/image.jpg", "replyTo": null },
    { "text": "Thread continuation", "replyTo": "auto" }
  ],
  "settings": {
    "minDelay": 180,
    "maxDelay": 360,
    "typingSpeed": "normal",
    "headed": true,
    "timeout": 60000
  }
}
```

### Config Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `profile` | string | `"openclaw"` | Browser profile name |
| `tweets[].text` | string | required | Tweet content |
| `tweets[].replyTo` | string | `null` | `null` for new, `"auto"` for thread chain, or status ID |
| `tweets[].media` | string | `null` | **NEW** Path to image file for upload |
| `settings.minDelay` | number | `180` | Min delay between tweets (seconds) |
| `settings.maxDelay` | number | `360` | Max delay between tweets (seconds) |
| `settings.typingSpeed` | string | `"normal"` | `"slow"`, `"normal"`, `"fast"` |
| `settings.headed` | boolean | `true` | Show browser window |

## Method 1: Text Posting (stealth-post.js)

### Typing

| Speed | ms/char | Pauses | Typos |
|-------|---------|--------|-------|
| `"slow"` | 100-200 | After space/punct | 5% |
| `"normal"` | 50-120 | After spaces | 2% |
| `"fast"` | 30-70 | Minimal | 1% |

Typo: wrong → 200-500ms → Backspace → 100-200ms → correct.

### Scroll Sim

```javascript
await page.mouse.wheel(0, 300);
await page.waitForTimeout(100);
await page.mouse.wheel(0, 100);
await page.mouse.wheel(0, -30);
```

## Method 2: Grok Image Generation (grok-image.js) — NEW

Use the Grok AI on X.com to generate images directly from text descriptions.

### Prompt Tips

Grok understands both English and Portuguese. For best results, include:

- **Style**: `photorealistic`, `cinematic`, `illustration`, `dark fantasy`
- **Lighting**: `dark amber lighting`, `dramatic shadows`, `golden hour`
- **Composition**: `wide shot`, `close-up`, `aerial view`, `low angle`
- **Details**: colors, textures, specific objects, atmosphere
- **Scale**: indicate the scope (massive, epic, intimate)

Example: *"A dramatic, dark, cinematic photorealistic illustration showing a massive industrial hydraulic cutting machine slicing through stacks of old hardcover books. Pages flying through the air, conveyor belt feeding books into a high-speed scanner, dystopian atmosphere, dark amber lighting, wide shot showing the destruction scale, books piled high in a warehouse setting."*

### Extraction Flow

```
Grok generates image
       │
       ├── Method A: Screenshot (most reliable)
       │   → page.screenshot() → file
       │
       ├── Method B: CDN URL (if already posted)
       │   → document.querySelector('img[alt*="Image"]')?.src
       │
       └── Method C: Canvas toDataURL (for blobs)
           → canvas.toDataURL('image/jpeg', 0.95)
```

### Common Issues

| Issue | Fix |
|-------|-----|
| Grok input not found | Try `--profile` with logged-in browser profile |
| Image generation timeout | Increase prompt specificity; Grok can take 30-60s |
| Corrupted image (< 1KB) | Re-extract via screenshot method |
| Browser not logged in | Login to X.com manually first |
| File chooser not triggered | Ensure the media button selector matches current X UI |

## Method 3: Media Upload (stealth-post.js) — NEW

The `--media` flag and `tweets[].media` field enable attaching images to tweets.

```bash
# Single tweet with image
node scripts/stealth-post.js --text "Cool image" --media screenshot.jpg

# Reply with image
node scripts/stealth-post.js --text "Check this" --reply-to 1234567890 --media image.jpg
```

### Media Validation

Before upload, the script checks:
- File exists (throws if not found)
- File size > 1KB (throws if corrupted/empty)
- File chooser completes within timeout

### Pipeline: Generate + Post

```
1. grok-image.js --prompt "..." --output image.jpg
2. stealth-post.js --text "Caption" --media image.jpg
```

Or use the thread JSON with `media` field for threaded content.

## Architecture: dom-engine Integration

This skill integrates `@agentic-intelligence/dom-engine` (via `scripts/inject-dom-engine.js`) for **robust, semantic element interaction**.

Instead of relying solely on fragile CSS selectors (`[data-testid="..."]`), the dom-engine:
1. Scans the page for all interactive elements
2. Assigns unique `agenticPurposeId` identifiers
3. Provides `window.getInteractiveContext()` → structured JSON
4. Executes clicks/types via `window.executeActions()` with human-like mouse/keyboard events

### How It Works

```
stealth-post.js
      │
      ├── Inject dom-engine into page context
      │     └── page.evaluate(injectDomEngine)
      │
      ├── Find element via getInteractiveContext()
      │     └── Match by data-testid, aria-label, or fuzzy text
      │
      ├── Execute action via executeActions()
      │     └── { agenticPurposeId, actionType: "click" | "type", value }
      │
      └── Fallback to Playwright native selectors
            └── humanClick() / humanType() with Bézier curves
```

### Why Dom-Engine?

| Problem | dom-engine Solution |
|---------|-------------------|
| `data-testid="tweetTextarea_0"` can change | Finds by role, placeholder, or fuzzy match |
| Generic refs (e1, e2) in snapshot | Returns descriptive `agenticPurposeId` |
| Playwright click lacks mouseover/mousemove | Dispatches full event chain |
| Hard to verify element state | `getInteractiveContext()` returns full element info |

### When Dom-Engine Falls Back

If `useDomEngine: false` in config or injection fails, the script falls back to:
- `humanClick()` — Playwright click with Bézier mouse curves
- `humanType()` — Variable speed typing with typos
- Standard CSS selectors

## Anti-Detection

| X Detects | This Skill Does |
|-----------|----------------|
| `webdriver=true` | ✅ Removes flag |
| Headless UA | ✅ Real UA |
| Empty plugins | ✅ Chrome emulation |
| Missing `chrome.app` | ✅ Adds it |
| Linear mouse | ✅ Bézier curves |
| Constant typing | ✅ Variable + typos |
| Zero delays | ✅ Random 3-8s |
| Datacenter IPs | ❌ Not covered |
| Grok automation | ✅ Human-like typing in Grok input |
| DOM interaction detection | ✅ dom-engine simulates real browser events (mouseover→mousedown→mouseup→click) |

## Safety Limits

| Limit | Value |
|-------|-------|
| Max tweets/session | 6 |
| Max tweets/day | 20 |
| Min delay | 180s |
| Max delay | 360s |
| Active hours | 08:00-22:00 |
| Account age min | 90 days |
| Max media size | 5 MB (X limit) |

Exceeding → script stops.

## Installation

```bash
cd ~/.openclaw/skills/ultra-x-stealth-skill
npm install playwright-extra puppeteer-extra-plugin-stealth humanization-playwright
npx playwright install chromium
```

## Session Recovery

1. Login page → attempt Google OAuth
2. Recovery fails → STOP, report
3. Manual re-login: `openclaw browser open --url https://x.com`

**NEVER type passwords.**

## Error Handling

| Error | Action |
|-------|--------|
| Login page | Google OAuth recovery |
| CAPTCHA | STOP — report |
| Rate limit | Wait 60s, retry once, STOP |
| Post disabled | Re-snapshot, retry |
| Network timeout | Wait 10s, retry once |
| Suspended | STOP — report |
| Session limit | STOP — report |
| Media not found | Check file path and size |
| Media corrupted | Re-generate or re-download |
| Grok timeout | Increase prompt detail, retry |
| File chooser failed | Manual upload via browser UI |

## Comparison

| Feature | x-poster | ultra-x-stealth (v1.0) | ultra-x-stealth (v1.1 w/ Grok) |
|---------|----------|----------------------|-------------------------------|
| Stealth plugins | ❌ | ✅ | ✅ |
| Human mouse/typing | ❌ | ✅ | ✅ |
| Random delays | ❌ | ✅ | ✅ |
| Thread support | Basic | Full | Full |
| Media upload | ❌ | ❌ | **✅ NEW** |
| Grok image generation | ❌ | ❌ | **✅ NEW** |
| Safety limits | None | Enforced | Enforced |
| Detection risk | HIGH | LOW | LOW |

## Rules

1. NEVER exceed limits
2. NEVER post without approval
3. NEVER use `headed=false` unless tested
4. ALWAYS verify login
5. ALWAYS report results
6. ALWAYS use persistent profile
7. STOP on CAPTCHA/2FA
8. STOP if user says stop
9. Verify media file integrity before posting (min 5KB)
10. Wait for Grok generation to complete before extracting

## Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `useDomEngine` | boolean | `true` | **NEW** Enable dom-engine for element interaction |
| `minDelay` | number | `180` | Min delay between tweets (seconds) |
| `maxDelay` | number | `360` | Max delay between tweets (seconds) |
| `typingSpeed` | string | `"normal"` | `"slow"`, `"normal"`, `"fast"` |
| `headed` | boolean | `true` | Show browser window |
| `timeout` | number | `60000` | Navigation timeout (ms) |
| `maxTweetsPerSession` | number | `6` | Max tweets per session |
| `maxTweetsPerDay` | number | `20` | Max tweets per day |

## Files

| File | Purpose |
|------|---------|
| `SKILL.md` | This file |
| `scripts/stealth-post.js` | Main stealth posting script with dom-engine |
| `scripts/grok-image.js` | Grok image generator |
| `scripts/inject-dom-engine.js` | **NEW** DOM engine injection (origin: ultra-dom-engine-skill) |
| `examples/thread-sample.json` | Thread config example |
| `examples/grok-image-thread.json` | Thread with media example |
| `references/anti-detection-guide.md` | Anti-detection reference |
| `package.json` | Dependencies and scripts |

## References

- `references/anti-detection-guide.md`
- `examples/thread-sample.json`
- `examples/grok-image-thread.json`
- `ultra-dom-engine-skill` for standalone dom-engine usage
- `x-poster` for simple posting
- `agente-redes-sociais` for Grok image + QA gate workflows

## License

Apache-2.0.
