---
name: ultra-models-skill
description: >-
  Use when auditing free AI model availability across providers (OpenRouter,
  OpenCode, KiloCode, NVIDIA, Antigravity Proxy), checking if configured
  models still exist in live APIs, discovering new free models worth adding,
  diagnosing silent fallback failures, or comparing openclaw.json config
  against actual API responses. Also use when users say "check models",
  "list free models", "which models are available", "are my fallbacks
  working", "audit models", "model health check", "free model monitor",
  or want to verify provider model status. Trigger terms: free models,
  model audit, model check, fallback broken, model status, provider models,
  model monitor, compare config, model health, list providers, antigravity.
---

# Ultra Models Skill

Monitor, compare and maintain free AI models across all providers in sync with
the OpenClaw config. Detects dead models, new additions, broken fallbacks,
and orphaned aliases by cross-referencing live API responses against
`openclaw.json`.

---

## Installation

```bash
cp -r ultra-models-skill/ ~/.openclaw/workspace/ultra-models-skill/
```

---

## Setup

Requires API keys in `.env` (4 providers). Antigravity proxy is local
and needs no auth. Scripts read keys at runtime — never hardcoded.

---

## When to Use This Skill

- **Auditing** free model availability periodically
- **Diagnosing** silent fallback failures (model removed from API but still in config)
- **Discovering** new free models across providers
- **Verifying** config models still exist before a gateway restart
- **Comparing** what the API returns vs what openclaw.json defines
- User says "check models", "list free models", "are fallbacks working"

## When NOT to Use This Skill

- You need to **change** model config — use `gateway config.patch` instead
- You need to **test** a specific model's quality — use session_status or direct API call
- You need **paid** model pricing info — scripts only track free models
- One-off model query — just use `session_status` or check config directly

---

## Instructions

### 1. List all free models from live APIs

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/list-free-models.ps1"
```

Queries OpenRouter, OpenCode Zen, KiloCode, and NVIDIA NIM Preview endpoints.

### 2. Compare config vs live APIs (main diagnostic)

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/compare-config.ps1"
```

Cross-references `openclaw.json` against live API responses from all 5 providers
(OpenRouter, OpenCode, KiloCode, NVIDIA, Antigravity Proxy). Reports:
- **Dead models** — in config but absent from API
- **New models** — available but not in config
- **Orphaned aliases** — alias points to dead model
- **Broken fallbacks** — fallback chain references dead models

### 3. List antigravity proxy models

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/list-antigravity-models.ps1"
```

Queries the local antigravity proxy at `127.0.0.1:8080`. No API key needed.
Returns Claude, Gemini, and GPT-OSS models available via the proxy.

### 4. KiloCode detail view

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/kilo-free-detail.ps1"
```

Expanded info for KiloCode free models: name, owner, description.

---

## Architecture

```
ultra-models-skill/
├── SKILL.md                         ← You are here
├── scripts/
│   ├── list-free-models.ps1         ← Queries OpenRouter, OpenCode, KiloCode, NVIDIA
│   ├── list-antigravity-models.ps1  ← Queries local antigravity proxy
│   ├── compare-config.ps1           ← API vs config cross-reference (all 5 providers)
│   └── kilo-free-detail.ps1         ← KiloCode free model details
```

---

## Allowed Tools

- `exec` — Run PowerShell scripts
- `gateway` — Read/patch openclaw.json config
- `session_status` — Verify current model and fallback state

---

## Best Practices

1. **Run compare-config before any config change** — catch dead models first
2. **Test new models with direct API call** before adding to fallbacks
3. **Never hardcode API keys** — always read from `.env` at runtime
4. **Monitor periodically** — providers remove/rename models without notice
5. **Check fallback chain health** — one dead fallback can cascade failures
6. **OpenCode renames models** — `super` → `ultra` pattern is common
7. **NVIDIA NIM Preview** models rotate frequently — verify before trusting
8. **Antigravity proxy** is local — check if it's running before querying

---

## Reference

### Provider API Endpoints

| Provider | Endpoint | Auth |
|----------|----------|------|
| OpenRouter | `https://openrouter.ai/api/v1/models` | Bearer token |
| OpenCode | `https://opencode.ai/zen/v1/models` | Bearer token |
| KiloCode | `https://api.kilo.ai/api/gateway/models` | Bearer token |
| NVIDIA | `https://integrate.api.nvidia.com/v1/models` | Bearer token |
| Antigravity | `http://127.0.0.1:8080/v1/models` | None (local proxy) |

### Free Model Detection

- **OpenRouter**: `pricing.prompt == "0"`
- **OpenCode**: ID matches `-free` or equals `big-pickle`
- **KiloCode**: `isFree == true`
- **NVIDIA**: `owned_by == "nvidia"` + no pricing or pricing == 0
- **Antigravity**: All models returned are available (local proxy)

### Config ID Mapping

- Config uses prefix `antigravity-proxy/` for proxy models
- Proxy returns bare IDs (e.g., `claude-sonnet-4-6`)
- compare-config.ps1 maps them to `antigravity-proxy/<id>` automatically

### Known Issues

- OpenCode silently removes models (returns 401 "Model not supported")
- NVIDIA NIM Preview catalog requires HTML scraping (no stable JSON API)
- Some models exist in provider definitions but aren't routable

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-create-skill` | Create new skills from workflows |
| `ultra-find-skill` | Search for existing skills |

---

## License

Apache-2.0. This skill is part of the OpenClaw ecosystem.
