---
name: ultra-provider-health-skill
description: >-
  Monitor provider health — version, headers, endpoints, API contract drift.
  Trigger: provider health, opencode version, header check, endpoint check.
---

# Ultra Provider Health Skill

Monitors OpenCode client version and rate-limit bypass headers against npm registry.

## When to Use

- Agents report "couldn't generate a response" without model failure
- Rate-limit errors after CLI update
- Provider returns unexpected auth errors
- Before trusting new OpenCode version
- After OpenCode CLI update

## When NOT to Use

- List models → `ultra-models-skill`
- Change config → `gateway config.patch`
- Endpoint down → check status page
- One-off version → `npm view opencode-ai version`

## Check Version (PowerShell)

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/check-opencode-version.ps1"
```

**Results:**
- **MATCH** — versions aligned, headers current
- **MISMATCH** — config uses old version
- **NOT FOUND** — can't read config or npm

## Provider Header Registry

| Provider | Header | Current Value |
|----------|--------|---------------|
| OpenCode | `User-Agent` | `opencode/{version} ...` |
| OpenCode | `x-opencode-client` | `cli` |
| OpenCode | `x-opencode-project` | `zen-openclaw` |
| OpenCode | `x-opencode-session` | `ses_openclaw_zen` |
| OpenCode | `x-opencode-request` | `msg_openclaw_zen` |

## Architecture

```
ultra-provider-health-skill/
├── SKILL.md
├── scripts/
│   └── check-opencode-version.ps1
└── references/
    └── rate-limit-bypass.md
```

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-models-skill` | Model availability |
| `ultra-x-stealth-skill` | Header bypass patterns |

## License

Apache-2.0.