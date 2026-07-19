# Ultra Browser Skill v5 🦉 — THE ULTIMATE

**Full browser control for OpenClaw — combining the best of Stagehand, Nanobrowser, Skyvern, and browser-use.**

## Architecture: Best of All Worlds

| Pattern | Source | What It Does |
|---------|--------|-------------|
| **Accessibility Tree** | Stagehand | 80-90% fewer tokens vs raw DOM |
| **4 Primitives** | Stagehand | act, extract, observe, agent (clean API) |
| **Observe-Act Cache** | Stagehand | Cache successful patterns → deterministic replay |
| **Vision Fallback** | Skyvern | Screenshot analysis when DOM fails |
| **Multi-Agent Loop** | Nanobrowser | Planner→Navigator→Validator with self-correction |
| **Agent Loop** | browser-use | observe→decide→act→reflect continuous learning |
| **DevTools** | Addy Osmani | Console, network, performance, a11y verification |

## Quick Start

```bash
# Install
cp -r ultra-browser-skill ~/.openclaw/workspace/skills/

# Use
/ultra-browse here fill out this form
/ultra-browse bg research 5 competitors
/ultra-browse auto post to LinkedIn and Twitter
```

## 4 Core Primitives

| Primitive | Purpose | Example |
|-----------|---------|---------|
| `observe` | Discover actions (no execution) | "Find all buttons on this form" |
| `act` | Execute natural language action | "Click the Submit button" |
| `extract` | Pull structured data | "Extract all product prices" |
| `agent` | Multi-step autonomous | "Find cheapest flight and book it" |

## Self-Correction Cascade

```
Step fails → Re-snapshot → Alternative ref → Scroll → Wait → Vision fallback → Alternative approach → Escalate
```

Max 3 full cycles before reporting to user.

## Observe-Act Caching

```
First run: AI finds action → succeeds → Cache it
Next run: Check cache → match? → Execute deterministically (no AI call)
Self-heal: Cache fails → Invalidate → Fall back to AI
```

## Session Replay

```json
{
  "replay_id": "linkedin-post-v1",
  "steps": ["observe compose button", "click compose", "type content", "click post"],
  "variables": ["content"],
  "cache_patterns": ["compose-button", "post-button"]
}
```

## All Modules

| Module | Purpose |
|--------|---------|
| `planner.json` | Task decomposition + cache-aware planning |
| `navigator.json` | 4 primitives + execution protocols |
| `validator.json` | Verification + vision fallback trigger |
| `action-cache.json` | Observe-act cache for known patterns |
| `vision-fallback.json` | Screenshot analysis rules |
| `observer.json` | observe() primitive configuration |
| `devtools.json` | Console, network, performance, a11y analysis |
| `replay.json` | Session recording & replay |
| `site-memory.json` | Accumulated site patterns |
| `safety-rules.json` | Domain blocklist + element protection |
| `id-registry.json` | ID tracking across tool calls |
| `injection-patterns.json` | Prompt injection detection |
| `tool-router.md` | Smart routing decision tree |
| `custom-tools.json` | Reusable tool templates |

## License

MIT — Built for OpenClaw Agency by Luna 🦉
