# Anti-Detection Guide

## X.com Bot Detection System (2025-2026)

X.com uses a multi-layered detection system that combines:

### 1. Browser Fingerprinting
- `navigator.webdriver` property (CDP flag)
- User-Agent string analysis
- Chrome plugin list (empty = suspicious)
- `chrome.app`, `chrome.csi` objects (DevTools leak)
- Canvas/WebGL fingerprint consistency
- Audio context fingerprinting

### 2. Behavioral Analysis
- Mouse movement patterns (linear = bot)
- Typing speed consistency (constant = bot)
- Click timing patterns (too fast = bot)
- Scroll behavior (instant jump = bot)
- Session duration patterns

### 3. Network Analysis
- IP reputation (datacenter vs residential)
- TLS fingerprint matching
- Request header consistency
- Rate limiting per IP and per account

### 4. ML Pattern Matching
- Activity burst detection
- Coordinated inauthentic behavior
- Content similarity across accounts
- Account age vs activity ratio

---

## How This Skill Bypasses Each Layer

### Layer 1: Browser Fingerprinting
| Detection | Bypass |
|---|---|
| `navigator.webdriver = true` | Stealth plugin removes this flag |
| HeadlessChrome UA | Sets real Chrome UA string |
| Empty plugin list | Emulates 3-5 standard Chrome plugins |
| Missing `chrome.app` | Adds fake `chrome.app` and `chrome.csi` |
| Canvas fingerprint | Headed mode uses real GPU rendering |

### Layer 2: Behavioral Analysis
| Detection | Bypass |
|---|---|
| Linear mouse paths | Bézier curves with random jitter |
| Constant typing speed | Variable 50-150ms per character |
| No thinking delays | Random 3-8s between actions |
| Instant scroll | Acceleration/deceleration pattern |
| Zero hover time | 200-600ms hover before click |

### Layer 3: Network Analysis
| Detection | Bypass |
|---|---|
| Datacenter IP | User must provide residential proxy |
| TLS fingerprint | Uses real Chrome TLS stack |
| Inconsistent headers | Stealth plugin normalizes headers |

### Layer 4: ML Pattern Matching
| Detection | Bypass |
|---|---|
| Burst posting | 3-6 min delay between tweets |
| High daily volume | Max 20 tweets/day enforced |
| Night activity | Posts only 08:00-22:00 |
| New account abuse | 90-day minimum account age |

---

## Limitations (What We Can't Bypass)

1. **IP Reputation**: Without a residential proxy, datacenter IPs will be flagged. The stealth plugin handles browser-level detection but not network-level.

2. **TLS Fingerprint**: Advanced systems check the TLS handshake. Playwright's TLS fingerprint is close to real Chrome but not identical. Requires custom browser builds for 100% match.

3. **Advanced ML**: X's ML models are constantly evolving. Behavioral simulation reduces risk but doesn't eliminate it. The "cat-and-mouse game" continues.

4. **Account History**: A brand-new account posting 6 tweets immediately will be flagged regardless of stealth. Account warming is a manual process.

5. **Content Analysis**: AI-generated content patterns can be detected. Ensure tweets are genuinely human-written or well-varied.

---

## Best Practices

1. **Use headed mode** — headless browsers have more detectable signals
2. **Keep browser profile persistent** — cookies and session data must persist
3. **Vary posting times** — don't always post at the same hour
4. **Engage organically** — like, reply, retweet other content regularly
5. **Monitor account health** — check for warnings, shadow bans, follower drops
6. **Rotate content types** — mix text, images, threads, polls
7. **Never automate likes/follows** — these are strictly policed
8. **Stop on any warning** — if X shows a verification prompt, STOP immediately

---

## Emergency Procedures

### Account Warning Detected
1. STOP all automation immediately
2. Wait 48-72 hours before any posting
3. Manually engage with content (likes, replies)
4. Check account status in settings

### Shadow Ban Suspected
1. Check if tweets appear in search
2. Check if replies are visible to others
3. If suspected: reduce posting to 1-2/day for 2 weeks
4. Focus on organic engagement

### Full Suspension
1. File appeal through X support
2. Do NOT create new accounts (linked and banned)
3. Wait for appeal resolution (typically 24-48h)
4. Review what triggered the suspension
