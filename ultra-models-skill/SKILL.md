---
name: ultra-models-skill
description: >-
  Use when auditing free AI model availability across providers (OpenRouter,
  OpenCode, KiloCode, NVIDIA), checking if configured models still exist in
  live APIs, discovering new free models worth adding, diagnosing silent
  fallback failures, comparing openclaw.json config against actual API
  responses, building capability maps for agent allocation, or generating
  routing plans by mission type. Also use when users say "check models",
  "list free models", "which models are available", "are my fallbacks
  working", "audit models", "model health check", "free model monitor",
  "build model map", "plan routing", "allocate models", or want to verify
  provider model status. Trigger terms: free models, model audit, model
  check, fallback broken, model status, provider models, model monitor,
  compare config, model health, list providers, model map, routing plan,
  agent allocation.
---

# Ultra Models Skill

Monitor, compare, maintain, and allocate free AI models across all providers
in sync with the OpenClaw config. Detects dead models, new additions, broken
fallbacks, orphaned aliases, and generates capability maps for intelligent
agent allocation.

---

## Installation

```bash
cp -r ultra-models-skill/ ~/.openclaw/workspace/ultra-models-skill/
```

---

## Setup

Requires API keys in `.env` (4 providers). Scripts read keys at runtime
via `_shared.ps1` — never hardcoded.

| Key | Provider |
|-----|----------|
| `OPENROUTER_API_KEY` | OpenRouter |
| `OPENCODE_API_KEY` | OpenCode Zen |
| `KILOCODE_API_KEY` | KiloCode |
| `NVIDIA_API_KEY` | NVIDIA NIM |

---

## When to Use This Skill

- **Auditing** free model availability periodically
- **Diagnosing** silent fallback failures (model removed from API but still in config)
- **Discovering** new free models across providers
- **Verifying** config models still exist before a gateway restart
- **Comparing** what the API returns vs what openclaw.json defines
- **Building** capability maps for agent allocation
- **Planning** routing by mission type and criticality
- User says "check models", "list free models", "are fallbacks working"

## When NOT to Use This Skill

- You need to **change** model config — use `gateway config.patch` instead
- You need to **test** a specific model's quality — use session_status or direct API call
- You need **paid** model pricing info — scripts only track free models
- One-off model query — just use `session_status` or check config directly

---

## Scripts

### _shared.ps1 (Foundation)

Common functions used by all scripts. **Do not execute directly.**

Provides:
- `Get-OpenClawHome` — detect OpenClaw home directory
- `Get-AllEnvKeys` — load all `.env` keys
- `Get-CanonicalModelId` — normalize model IDs across providers
- `Get-ModelFamily` — classify model family (nemotron, deepseek, etc.)
- `Get-ModelTier` — classify as premium/high/standard/light
- `Get-ModelQualityScore` — heuristic quality score by size + family
- `Get-ModelTPSScore` — estimated throughput
- `Get-ModelCapabilities` — intrinsic capabilities (reasoning, code, vision, etc.)
- `Get-ModelRoleFit` — suitability score for a specific agent role
- `Get-RoleCapabilityWeights` — which capabilities matter for each role
- `Export-Json` / `Export-JsonPretty` — UTF-8 JSON output without BOM

### sync-config.ps1 (Config Maintenance)

Compare live API responses against `openclaw.json` config.

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/sync-config.ps1"
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/sync-config.ps1" -Json
```

Reports:
- **Dead models** — in config but absent from API
- **New models** — available but not in config
- **Orphaned aliases** — alias points to dead model
- **Broken fallbacks** — fallback chain references dead models

### build-model-map.ps1 (Capability Map)

Generate `model-capability-map.json` for the allocator agent.

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/build-model-map.ps1"
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/build-model-map.ps1" -OutFile "C:\path\to\map.json"
```

Output includes per model:
- Canonical ID, family, tier
- Provider availability with priority
- Capability scores (reasoning, code, vision, etc.)
- Role fit scores for all 10 agent roles
- Best roles and roles to avoid
- Fallback chains (same-model + same-capability)

### plan-routing.ps1 (Routing Plan)

Generate a routing plan for a specific mission type.

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/plan-routing.ps1"
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/plan-routing.ps1" -Mission "software_architecture" -Criticality high
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/plan-routing.ps1" -Mission "classification" -Json
```

Mission types: `general`, `software_architecture`, `research`, `code_review`,
`implementation`, `classification`, `content_creation`, `critical_decision`

### report-final.ps1 (Full Report)

Generate a comprehensive report with rankings, health, and recommendations.

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/report-final.ps1"
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/report-final.ps1" -Json
```

### list-free-models.ps1 (Raw Listing)

List all free models from live APIs (original script, unchanged).

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/list-free-models.ps1"
```

### list-antigravity-models.ps1

Query the local antigravity proxy at `127.0.0.1:8080`.

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/list-antigravity-models.ps1"
```

### kilo-free-detail.ps1

Expanded info for KiloCode free models.

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/kilo-free-detail.ps1"
```

### compare-config.ps1

Cross-references `openclaw.json` against live API responses (all 5 providers).

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>/scripts/compare-config.ps1"
```

---

## Architecture

```
ultra-models-skill/
├── SKILL.md                          ← You are here
├── scripts/
│   ├── _shared.ps1                   ← Common functions (DO NOT EXECUTE)
│   ├── sync-config.ps1               ← Config vs API cross-reference
│   ├── build-model-map.ps1           ← Generate capability map JSON
│   ├── plan-routing.ps1              ← Routing plan by mission type
│   ├── report-final.ps1              ← Full report with rankings
│   ├── list-free-models.ps1          ← Raw free model listing
│   ├── list-antigravity-models.ps1   ← Antigravity proxy models
│   ├── compare-config.ps1            ← Config vs API (legacy)
│   └── kilo-free-detail.ps1          ← KiloCode detail view
```

### Data Flow

```
Live APIs → build-model-map.ps1 → model-capability-map.json
                                        ↓
                              plan-routing.ps1 → routing-plan.json
                                        ↓
                              Agent Allocator → team-allocation.json

Live APIs → sync-config.ps1 → dead/new/orphan report
Live APIs → report-final.ps1 → human-readable report
```

---

## Agent Role System

The skill defines 10 agent roles with specific capability weights:

| Role | Primary Use | Best Models |
|------|-------------|-------------|
| `ceo_orchestrator` | Strategy, synthesis, judgment | Nemotron Super, Ultra |
| `strategic_planner` | Deep reasoning, trade-offs | Nemotron Ultra, Super |
| `architecture_agent` | Technical design, system decisions | Super, DeepSeek V4 Pro |
| `implementation_agent` | Code, tools, iteration | DeepSeek V4 Flash, North Mini Code |
| `reviewer_agent` | Critique, consistency, gap detection | Super, Ultra, DeepSeek V4 Pro |
| `research_agent` | Research, extraction, synthesis | Nano Omni, Super |
| `fast_worker` | High throughput, repetitive tasks | DeepSeek V4 Flash, Nano 30B, HY3 |
| `classifier_agent` | Low latency, schema consistency | HY3, Nano 30B |
| `vision_agent` | Image input, OCR, UI description | Nemotron Nano 12B VL |
| `red_team_agent` | Independence, critique, counter-argument | Ultra, Super, GLM-5 |

---

## Allowed Tools

- `exec` — Run PowerShell scripts
- `gateway` — Read/patch openclaw.json config
- `session_status` — Verify current model and fallback state

---

## Best Practices

1. **Run sync-config before any config change** — catch dead models first
2. **Run build-model-map定期** — keep capability map fresh
3. **Use plan-routing for team assembly** — match mission to models
4. **Test new models with direct API call** before adding to fallbacks
5. **Never hardcode API keys** — always read from `.env` at runtime
6. **Monitor periodically** — providers remove/rename models without notice
7. **Check fallback chain health** — one dead fallback can cascade failures
8. **Ensure family diversity** — don't fill all critical roles with same family
9. **Reserve premium models** — Ultra for decisions, Super for general, Flash for workers

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

### Model Capability Map Schema

See `build-model-map.ps1` output for the full schema. Key fields:
- `canonical_id` — normalized model name (provider-agnostic)
- `capabilities` — intrinsic scores (0.0-1.0) per skill
- `role_fits` — suitability per agent role
- `fallback_policy` — same-model and same-capability chains

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-create-skill` | Create new skills from workflows |
| `ultra-find-skill` | Search for existing skills |

---

## License

Apache-2.0. This skill is part of the OpenClaw ecosystem.
