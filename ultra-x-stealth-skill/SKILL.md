---
name: ultra-x-stealth-skill
description: >-
  Post X.com threads with Playwright stealth + human behavior simulation.
  Bypasses bot detection. Trigger: X stealth, X ban, stealth tweet, anti-detection.
user-invocable: true
metadata:
  author: ClawLabs
  version: "1.0.0"
  domain: social-media
  triggers: [X stealth, X ban, stealth tweet, anti-detection]
  role: specialist
  scope: browser-automation
  output-format: action
  related-skills: [x-poster, browser-automation]
---

# Ultra X Stealth Skill

Post X.com with Playwright stealth + human simulation. Use when x-poster blocked. NOT for simple posts (use x-poster), scraping (use browser-automation), or suspended accounts.

## Architecture

```
Thread Config → Stealth Layer → Human Behavior Layer → Cadence Layer → Headed Browser
  JSON              Bézier curves      3-5 min between tweets        persistent cookies
  playwright-extra  50-150ms typing    max 20 tweets/day
  webdriver=false     random 3-8s delays    active 8h-22h only
  real UA             scroll accel/decel    session max 6 tweets
```

## Quick Start

```bash
node scripts/stealth-post.js --config examples/thread-sample.json   # thread from JSON
node scripts/stealth-post.js --text "Hello world!"                   # single tweet
node scripts/stealth-post.js --text "Reply" --reply-to 1234567890    # reply
```

## Thread Config

```json
{
  "profile": "openclaw",
  "tweets": [
    { "text": "Hook", "media": null },
    { "text": "Reply", "replyTo": "auto" }
  ],
  "settings": { "minDelay": 180, "maxDelay": 360, "typingSpeed": "normal", "headed": true, "timeout": 60000 }
}
```

| Field | Type | Default |
|---|---|---|
| `profile` | string | `"openclaw"` |
| `tweets[].text` | string | required |
| `tweets[].replyTo` | string | `null` |
| `tweets[].media` | string | `null` |
| `settings.minDelay` | number | `180` |
| `settings.maxDelay` | number | `360` |
| `settings.typingSpeed` | string | `"normal"` |
| `settings.headed` | boolean | `true` |

## Typing

| Speed | ms/char | Pauses | Typos |
|---|---|---|---|
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

## Anti-Detection

| X Detects | This Skill Does |
|---|---|
| `webdriver=true` | ✅ Removes flag |
| Headless UA | ✅ Real UA |
| Empty plugins | ✅ Chrome emulation |
| Missing `chrome.app` | ✅ Adds it |
| Linear mouse | ✅ Bézier curves |
| Constant typing | ✅ Variable + typos |
| Zero delays | ✅ Random 3-8s |
| Datacenter IPs | ❌ Not covered |

## Safety Limits

| Limit | Value |
|---|---|
| Max tweets/session | 6 |
| Max tweets/day | 20 |
| Min delay | 180s |
| Max delay | 360s |
| Active hours | 08:00-22:00 |
| Account age min | 90 days |

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
|---|---|
| Login page | Google OAuth recovery |
| CAPTCHA | STOP — report |
| Rate limit | Wait 60s, retry once, STOP |
| Post disabled | Re-snapshot, retry |
| Network timeout | Wait 10s, retry once |
| Suspended | STOP — report |
| Session limit | STOP — report |

## Comparison

| Feature | x-poster | ultra-x-stealth |
|---|---|---|
| Stealth plugins | ❌ | ✅ |
| Human mouse/typing | ❌ | ✅ |
| Random delays | ❌ | ✅ |
| Thread support | Basic | Full |
| Safety limits | None | Enforced |
| Detection risk | HIGH | LOW |

## Rules

1. NEVER exceed limits
2. NEVER post without approval
3. NEVER use `headed=false` unless tested
4. ALWAYS verify login
5. ALWAYS report results
6. ALWAYS use persistent profile
7. STOP on CAPTCHA/2FA
8. STOP if user says stop

## References

- `references/anti-detection-guide.md`
- `examples/thread-sample.json`
- `x-poster` for simple posting

## License

Apache-2.0.