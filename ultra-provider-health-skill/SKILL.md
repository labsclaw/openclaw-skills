---
name: ultra-provider-health-skill
description: >-
  Monitor provider client health — version, headers, endpoints, and
  API contract drift. Tracks OpenCode client version against npm
  registry, validates rate-limit bypass headers, and periodically
  checks if provider endpoints still respond as expected. Use when
  agents report "couldn't generate a response" with no clear model
  failure, after OpenCode CLI updates, when rate-limit patterns
  change, or during incident investigation for provider-side issues.
  Trigger terms: provider health, client version, header check,
  opencode version, provider incident, endpoint check, agent error.
---

# Ultra Provider Health Skill

Tracks the health of provider client configurations — specifically
the rate-limit bypass headers used against OpenCode Zen and other
provider endpoints that accept the CLI-originated header pattern.

---

## Installation

```bash
cp -r ultra-provider-health-skill/ ~/.openclaw/skills/ultra-provider-health-skill/
```

---

## Setup

Requires no API keys. Reads `openclaw.json` directly to extract
current client headers. Queries npm registry (public, no auth) for
version comparison.

---

## When to Use This Skill


### Incident Response
- Agents report "Agent couldn't generate a response" without clear model failure
- Rate-limit errors appear after CLI update
- Provider returns unexpected auth errors with existing client headers

### Preventive Maintenance
- Before trusting a new OpenCode version's API contract
- After OpenCode CLI is updated globally
- When adding a new provider that uses CLI-originated header auth

## When NOT to Use This Skill

- You need to list or audit free models — use `ultra-models-skill`
- You need to change provider config — use `gateway config.patch`
- Provider endpoint is down — check status page, not this skill
- One-off version query — just run `npm view opencode-ai version`

---

## Instructions

### 1. Check OpenCode Client Version vs Config

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/check-opencode-version.ps1"
```

Compares the installed OpenCode CLI version (`npm view opencode-ai version`)
against the User-Agent header in `openclaw.json`. Reports:

- **MATCH** — versions aligned, headers are current
- **MISMATCH** — config uses old version, needs update
- **NOT FOUND** — can't read config or npm registry unavailable

### 2. Audit All Provider Headers

(Coming soon — will validate all header fields across opencode
provider definition against expected patterns.)

---

## Provider Header Registry

The following providers use CLI-originated header patterns in our config:

| Provider | Header Field | Current Value | Source |
|----------|-------------|---------------|--------|
| OpenCode | `User-Agent` | `opencode/{version} ...` | `openclaw.json > models.providers.opencode.headers` |
| OpenCode | `x-opencode-client` | `cli` | PI project #2824 bypass |
| OpenCode | `x-opencode-project` | `zen-openclaw` | Static project ID |
| OpenCode | `x-opencode-session` | `ses_openclaw_zen` | Static session ID |
| OpenCode | `x-opencode-request` | `msg_openclaw_zen` | Static request ID |

---

## Architecture

```
ultra-provider-health-skill/
├── SKILL.md                                    ← You are here
├── scripts/
│   └── check-opencode-version.ps1              ← Version comparison script
├── references/
│   └── rate-limit-bypass.md                    ← (coming soon)
└── .gitignore
```

---

## Allowed Tools

- `exec` — Run PowerShell scripts
- `gateway` — Read `openclaw.json` provider headers

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-models-skill` | Model availability — complements provider health |
| `ultra-x-stealth-skill` | Uses similar header bypass patterns for X.com |

---

## License

Apache-2.0. Part of the OpenClaw ecosystem.
