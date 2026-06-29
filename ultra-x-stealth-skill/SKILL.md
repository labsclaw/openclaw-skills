---
name: ultra-x-stealth-skill
description: >-
  Post threads on X.com (Twitter) using Playwright with stealth plugin and
  human behavior simulation. Bypasses bot detection with Bézier mouse curves,
  variable typing, random delays, and anti-fingerprinting. Use when x-poster
  gets blocked or when stealth posting is needed. Trigger terms: X stealth,
  X ban, post X safely, stealth tweet, anti-detection X, post without ban.
user-invocable: true
metadata:
  author: ClawLabs
  version: "1.0.0"
  domain: social-media
  triggers:
    - X stealth
    - X ban
    - post X safely
    - stealth tweet
    - anti-detection
    - post without ban
    - x-poster blocked
  role: specialist
  scope: browser-automation
  output-format: action
  related-skills: x-poster, browser-automation
---

# Ultra X Stealth Skill

Post content on X.com using Playwright with anti-detection and human behavior
simulation. Designed to bypass X's bot detection systems that block standard
CDP/browser automation.

> **When to use this skill:**
> - x-poster was blocked or detected
> - You need to post threads without triggering bot detection
> - You need human-like behavior simulation for X.com
> - Standard browser automation failed with rate limits or bans

> **When NOT to use:**
> - Simple single posts (use x-poster instead)
> - Reading/scraping X.com (use browser-automation skill)
> - The account is already suspended

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Thread Config (JSON)                       │
│  tweets: [{text, replyTo?, media?}]        │
├─────────────────────────────────────────────┤
│  Stealth Layer                              │
│  playwright-extra + stealth-plugin          │
│  ├── navigator.webdriver = false            │
│  ├── Real User-Agent                        │
│  ├── Chrome plugin emulation                │
│  └── Canvas/WebGL fingerprint masking       │
├─────────────────────────────────────────────┤
│  Human Behavior Layer                       │
│  ├── Bézier mouse curves with jitter        │
│  ├── Variable typing (50-150ms/char)        │
│  ├── Realistic scroll (accel/decel)         │
│  ├── Random delays (3-8s between actions)   │
│  └── Hover before click                     │
├─────────────────────────────────────────────┤
│  Cadence Layer                              │
│  ├── 3-5 min between tweets in thread       │
│  ├── Max 15-20 tweets/day                   │
│  ├── Post only 8h-22h local time            │
│  └── Session max 6 tweets per session       │
├─────────────────────────────────────────────┤
│  Browser (headed, Chrome profile)           │
│  └── Persistent cookies/session             │
└─────────────────────────────────────────────┘
```

---

## Quick Start

### Option A: Use the Node.js Script (Recommended)

```bash
# Post a thread from JSON config
node scripts/stealth-post.js --config examples/thread-sample.json

# Post a single tweet
node scripts/stealth-post.js --text "Hello world!"

# Post a reply
node scripts/stealth-post.js --text "Reply content" --reply-to 1234567890
```

### Option B: Use from Agent (Delegated)

When the agent needs to post stealthily:

1. Create a thread config JSON file
2. Run `node scripts/stealth-post.js --config <path>`
3. Wait for completion
4. Report results to user

---

## Thread Config Format

```json
{
  "profile": "openclaw",
  "tweets": [
    {
      "text": "First tweet (hook)",
      "media": null
    },
    {
      "text": "Second tweet (reply to first)",
      "replyTo": "auto"
    },
    {
      "text": "Third tweet with image",
      "replyTo": "auto",
      "media": "/path/to/image.png"
    }
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
|---|---|---|---|
| `profile` | string | `"openclaw"` | Chrome profile to use |
| `tweets[].text` | string | required | Tweet content (max 280 free / 25000 premium) |
| `tweets[].replyTo` | string | `null` | `"auto"` = reply to previous tweet, or status ID |
| `tweets[].media` | string | `null` | File path to image/video |
| `settings.minDelay` | number | `180` | Min seconds between tweets |
| `settings.maxDelay` | number | `360` | Max seconds between tweets |
| `settings.typingSpeed` | string | `"normal"` | `"slow"`, `"normal"`, `"fast"` |
| `settings.headed` | boolean | `true` | Run browser visibly (recommended) |
| `settings.timeout` | number | `60000` | Page load timeout in ms |

---

## Human Behavior Simulation

### Mouse Movement (Bézier Curves)

The script generates natural mouse paths using cubic Bézier curves:

```
Start Point → Control Point 1 → Control Point 2 → End Point
     + random jitter (±5px) on each control point
     + varying duration (200-800ms per segment)
```

This creates curved, slightly wobbly paths that mimic real hand movement.

### Typing Simulation

| Speed | ms/char | Pauses | Typos |
|---|---|---|---|
| `"slow"` | 100-200ms | After spaces, punctuation | 5% chance |
| `"normal"` | 50-120ms | After spaces | 2% chance |
| `"fast"` | 30-70ms | Minimal | 1% chance |

When a "typo" occurs, the script:
1. Types the wrong character
2. Pauses 200-500ms (realization delay)
3. Presses Backspace
4. Pauses 100-200ms
5. Types the correct character

### Scroll Simulation

```javascript
// Realistic scroll: fast start, decelerate, slight overshoot, correct back
await page.mouse.wheel(0, 300);  // fast
await page.waitForTimeout(100);
await page.mouse.wheel(0, 100);  // slower
await page.waitForTimeout(200);
await page.mouse.wheel(0, -30);  // overshoot correction
```

### Delays Between Actions

| Action | Delay Range | Rationale |
|---|---|---|
| Page load → first action | 3-8s | "Reading" the page |
| Click → next click | 2-5s | "Thinking" between actions |
| Type → click post | 3-8s | "Reviewing" before posting |
| Post → next tweet | 180-360s | Human pace for threads |
| Scroll → next action | 1-3s | "Scanning" content |

---

## Anti-Detection Techniques

### What X Detects

1. **`navigator.webdriver = true`** — instant ban signal
2. **HeadlessChrome User-Agent** — obvious bot
3. **Empty plugin list** — real Chrome has 3-5 plugins
4. **Missing `chrome.app`** — DevTools protocol leak
5. **Linear mouse paths** — no human moves in straight lines
6. **Constant typing speed** — humans vary speed naturally
7. **Zero-delay actions** — humans pause to "think"
8. **Datacenter IPs** — easily identified and blocked

### What This Skill Does

1. ✅ Removes `navigator.webdriver` flag
2. ✅ Sets real Chrome User-Agent string
3. ✅ Emulates standard Chrome plugins
4. ✅ Adds `chrome.app`, `chrome.csi` objects
5. ✅ Bézier curve mouse movements with jitter
6. ✅ Variable-speed typing with typos
7. ✅ Random delays between all actions
8. ✅ Uses headed mode (real browser window)

### What This Skill Does NOT Do

- ❌ IP rotation / residential proxy (use external proxy config)
- ❌ TLS fingerprint modification (requires custom browser build)
- ❌ Guaranteed bypass of advanced ML detection
- ❌ Account warming (manual process)

---

## Safety Limits

| Limit | Value | Reason |
|---|---|---|
| Max tweets per session | 6 | Prevents session-level detection |
| Max tweets per day | 20 | Account-level safety |
| Min delay between tweets | 180s (3 min) | Mimics human thread pace |
| Max delay between tweets | 360s (6 min) | Keeps thread coherent |
| Active hours | 08:00-22:00 | No 3am bot activity |
| Account age minimum | 90 days | New accounts have stricter limits |

**If any limit is exceeded, the script STOPS and reports to the user.**

---

## Installation

### Prerequisites

```bash
# Node.js 18+ required
node --version  # >= 18.0.0

# Install dependencies
cd ~/.openclaw/skills/ultra-x-stealth-skill
npm install playwright-extra puppeteer-extra-plugin-stealth humanization-playwright
npx playwright install chromium
```

### Quick Setup

```bash
# One-liner install
cd ~/.openclaw/skills/ultra-x-stealth-skill && npm install
```

---

## Session Recovery

If the browser session expires during posting:

1. Script detects login page instead of home feed
2. Attempts Google OAuth recovery (credentials saved in profile)
3. If recovery fails → stops and reports to user
4. User must manually re-login: `openclaw browser open --url https://x.com`

**NEVER type passwords. The browser has them saved.**

---

## Error Handling

| Error | Action |
|---|---|
| Login page detected | Attempt Google OAuth recovery |
| CAPTCHA / verification | STOP — report to user |
| Rate limit hit | Wait 60s, retry once, then STOP |
| Post button disabled | Re-snapshot, find correct ref, retry |
| Network timeout | Wait 10s, retry once |
| Account suspended | STOP — report immediately |
| Session limit reached | STOP — report count posted |

---

## Comparison with x-poster

| Feature | x-poster | ultra-x-stealth |
|---|---|---|
| Stealth plugins | ❌ | ✅ |
| Human mouse curves | ❌ | ✅ |
| Variable typing | ❌ | ✅ |
| Random delays | ❌ | ✅ |
| Anti-fingerprinting | ❌ | ✅ |
| Thread support | Basic | Full (auto-reply chain) |
| Safety limits | None | Enforced |
| Detection risk | HIGH | LOW |
| Speed | Fast | Deliberate |

---

## Monitoring

After posting, check:

1. **X.com notifications** — any "suspicious activity" warnings?
2. **Tweet analytics** — are tweets getting impressions normally?
3. **Account status** — any restrictions or shadow bans?
4. **Follower changes** — sudden drops indicate detection

If any warning appears, STOP all automation for 24-48 hours.

---

## Important Rules

1. **NEVER exceed safety limits** — they exist to protect the account
2. **NEVER post without user approval** — get explicit go-ahead first
3. **NEVER use in headed=false mode** unless specifically tested
4. **ALWAYS verify login before posting** — check for login page
5. **ALWAYS report results** — success count + any warnings
6. **ALWAYS use persistent Chrome profile** — cookies must persist
7. **STOP immediately** on any CAPTCHA, 2FA, or verification prompt
8. **STOP if user says stop** — no questions asked

---

## References

- See `references/anti-detection-guide.md` for detailed techniques
- See `examples/thread-sample.json` for thread config format
- Related skill: `x-poster` for simple, non-stealth posting
