---
name: ultra-x-stealth-skill
description: >-
  Post threads on X.com using Playwright with stealth plugin and human behavior
  simulation. Bypasses bot detection with Bézier mouse curves, variable typing,
  random delays, and anti-fingerprinting.
user-invocable: true
metadata:
  author: ClawLabs
  version: "1.0.0"
  domain: social-media
  triggers: [X stealth, X ban, post X safely, stealth tweet, anti-detection, post without ban, x-poster blocked]
  role: specialist
  scope: browser-automation
  output-format: action
  related-skills: x-poster, browser-automation
---

# Ultra X Stealth Skill

Post X.com content with Playwright + anti-detection + human behavior simulation. Use when x-poster was blocked/rate-limited. NOT for simple posts (use x-poster), scraping (use browser-automation), or suspended accounts.

## Architecture

```
Thread Config (JSON) → Stealth Layer → Human Behavior Layer → Cadence Layer → Headed Browser
  playwright-extra       Bézier mouse curves      3-5 min between tweets     persistent cookies
  stealth-plugin         variable typing 50-150ms  max 20 tweets/day
  navigator.webdriver=false  random delays 3-8s     active 8h-22h only
  real User-Agent        scroll accel/decel        session max 6 tweets
  chrome.app emulation   hover before click
```

## Quick Start

```bash
node scripts/stealth-post.js --config examples/thread-sample.json   # thread from JSON
node scripts/stealth-post.js --text "Hello world!"                   # single tweet
node scripts/stealth-post.js --text "Reply" --reply-to 1234567890    # reply
```

Agent workflow: create config JSON → run script → wait → report.

## Thread Config

```json
{
  "profile": "openclaw",
  "tweets": [
    { "text": "Hook tweet", "media": null },
    { "text": "Reply", "replyTo": "auto" },
    { "text": "With image", "replyTo": "auto", "media": "/path/to/image.png" }
  ],
  "settings": { "minDelay": 180, "maxDelay": 360, "typingSpeed": "normal", "headed": true, "timeout": 60000 }
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `profile` | string | `"openclaw"` | Chrome profile |
| `tweets[].text` | string | required | Tweet content (280 free / 25000 premium) |
| `tweets[].replyTo` | string | `null` | `"auto"` = reply to previous, or status ID |
| `tweets[].media` | string | `null` | File path to image/video |
| `settings.minDelay` | number | `180` | Min seconds between tweets |
| `settings.maxDelay` | number | `360` | Max seconds between tweets |
| `settings.typingSpeed` | string | `"normal"` | `"slow"` / `"normal"` / `"fast"` |
| `settings.headed` | boolean | `true` | Visible browser (recommended) |
| `settings.timeout` | number | `60000` | Page load timeout (ms) |

## Typing Simulation

| Speed | ms/char | Pauses | Typos |
|---|---|---|---|
| `"slow"` | 100-200ms | After spaces, punctuation | 5% |
| `"normal"` | 50-120ms | After spaces | 2% |
| `"fast"` | 30-70ms | Minimal | 1% |

Typo flow: wrong char → 200-500ms pause → Backspace → 100-200ms pause → correct char.

### Scroll Simulation

```javascript
await page.mouse.wheel(0, 300);  // fast
await page.waitForTimeout(100);
await page.mouse.wheel(0, 100);  // slower
await page.waitForTimeout(200);
await page.mouse.wheel(0, -30);  // overshoot correction
```

### Action Delays

| Action | Delay | Rationale |
|---|---|---|
| Page load → first action | 3-8s | "Reading" page |
| Click → next click | 2-5s | "Thinking" |
| Type → post button | 3-8s | "Reviewing" |
| Post → next tweet | 180-360s | Human thread pace |
| Scroll → next action | 1-3s | "Scanning" |

## Anti-Detection

**What X detects:** `navigator.webdriver=true`, HeadlessChrome UA, empty plugin list, missing `chrome.app`, linear mouse paths, constant typing speed, zero-delay actions, datacenter IPs.

**What this skill does:** ✅ Removes webdriver flag, ✅ Real UA, ✅ Chrome plugin emulation, ✅ Adds `chrome.app`/`chrome.csi`, ✅ Bézier mouse curves, ✅ Variable typing with typos, ✅ Random delays, ✅ Headed mode.

**Limitations:** ❌ No IP rotation, ❌ No TLS fingerprint mod, ❌ No guaranteed ML bypass, ❌ No account warming.

## Safety Limits

| Limit | Value |
|---|---|
| Max tweets/session | 6 |
| Max tweets/day | 20 |
| Min delay between tweets | 180s |
| Max delay between tweets | 360s |
| Active hours | 08:00-22:00 |
| Account age minimum | 90 days |

Exceeding any limit → script stops and reports.

## Installation

```bash
cd ~/.openclaw/skills/ultra-x-stealth-skill
npm install playwright-extra puppeteer-extra-plugin-stealth humanization-playwright
npx playwright install chromium
```

## Session Recovery

1. Detects login page → attempts Google OAuth recovery
2. Recovery fails → stops, reports to user
3. User manual re-login: `openclaw browser open --url https://x.com`

**NEVER type passwords — browser has them saved.**

## Error Handling

| Error | Action |
|---|---|
| Login page | Attempt Google OAuth recovery |
| CAPTCHA / verification | STOP — report to user |
| Rate limit | Wait 60s, retry once, then STOP |
| Post button disabled | Re-snapshot, find ref, retry |
| Network timeout | Wait 10s, retry once |
| Account suspended | STOP — report immediately |
| Session limit | STOP — report count posted |

## x-poster vs ultra-x-stealth

| Feature | x-poster | ultra-x-stealth |
|---|---|---|
| Stealth plugins | ❌ | ✅ |
| Human mouse/typing | ❌ | ✅ |
| Random delays | ❌ | ✅ |
| Thread support | Basic | Full (auto-reply chain) |
| Safety limits | None | Enforced |
| Detection risk | HIGH | LOW |

## Rules

1. NEVER exceed safety limits
2. NEVER post without user approval
3. NEVER use headed=false unless tested
4. ALWAYS verify login before posting
5. ALWAYS report results
6. ALWAYS use persistent Chrome profile
7. STOP on CAPTCHA, 2FA, or verification
8. STOP if user says stop

## References

- `references/anti-detection-guide.md`
- `examples/thread-sample.json`
- Related: `x-poster` for simple posting
