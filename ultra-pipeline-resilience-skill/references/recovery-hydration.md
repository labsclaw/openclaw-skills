# Recovery Hydration Deep Dive

## The Problem

When a session crashes mid-pipeline, the new session has zero context. It needs to:
1. Know a pipeline was running
2. Know where it stopped
3. Know what was already produced
4. Know what comes next

## The Solution: Handoff + State File

### Handoff Payload (max 500 tokens)

The handoff is written at the end of each step. It contains ONLY what the next step needs:

```json
{
  "next_step": "validate",
  "context": "320 records fetched from 3 APIs. 8 missing timestamps. Schema: v2.1.",
  "artifacts": ["output/raw_320.json", "config/schema_v2.1.json"],
  "config": {"drop_incomplete": false, "validate_schema": true}
}
```

**What is NOT in the handoff:**
- Full conversation history
- Debug logs
- Raw API responses
- Previous step outputs (reference via `artifacts`)

### Recovery Prompt (new session)

When resuming, the new session constructs its own context:

```
Resuming pipeline {id} from state file.

Last completed: {prev_step} — {summary}
Next step: {next_step}

Context from handoff:
- {context}
- Artifacts: {artifacts}
- Config: {config}

Proceed with {next_step}.
```

This prompt is ~400-500 tokens — enough context to continue, not enough to blow the token budget.

### Token Budget Comparison

| Approach | Tokens | Risk |
|----------|--------|------|
| Full history injection | ~10,000-50,000 | Budget overflow, context pollution |
| State file only | ~200-300 | Missing critical context |
| Handoff + state file (this skill) | ~400-500 | Optimal balance |

## Tiering Strategy

Different pipeline steps need different model capabilities:

| Step Type | Model Tier | Examples |
|-----------|-----------|----------|
| Planning / Recovery prompt | Tier 2 (fast/cheap) | gpt-4o-mini, gemini-flash |
| Code execution / Analysis | Tier 1 (strong reasoning) | gpt-4o, claude-opus |
| Status check / Cron | Tier 2 (fast/cheap) | gpt-4o-mini |
| Error triage | Tier 1 (strong reasoning) | gpt-4o, claude-opus |

## Atomic Writes (crash-safe)

### Windows
```python
import tempfile, os
fd, tmp = tempfile.mkstemp(suffix='.tmp', dir=dir)
with os.fdopen(fd, 'w') as f:
    json.dump(data, f, indent=2)
os.replace(tmp, target)  # atomic on NTFS
```

### Linux/macOS
```python
import tempfile, os
fd, tmp = tempfile.mkstemp(suffix='.tmp', dir=dir)
with os.fdopen(fd, 'w') as f:
    json.dump(data, f, indent=2)
os.rename(tmp, target)  # atomic on same filesystem
```

### Why Not SQLite?
- Adds dependency
- Requires WAL mode for concurrent reads
- Harder to debug (can't just `cat` the file)
- JSON is sufficient for single-writer state files

## Zombie Detection

A step is "zombie" if:
- `elapsed > timeout × 1.5`
- No heartbeat received in `timeout × 2`

### Recovery
1. Increment `retries`
2. If `retries < max_retries`: spawn new session for same step
3. If `retries >= max_retries`: mark pipeline as `failed`, alert

## Context: Isolated vs Fork

| Context | When | Why |
|---------|------|-----|
| `isolated` | Normal pipeline steps | Clean state, no history pollution |
| `fork` | Need conversation context | Rare — only for human-in-the-loop approvals |

**Default: `isolated`** — leaf sub-agents don't need parent conversation history.

## Rules Injection

Use `attachAs` to inject domain-specific rules into sub-agents:

```python
# Quantitative pipeline step
"attachAs": {
    "mountPath": ".agent_context/rules-quantmind.md",
    "content": open("memory/rules/rules-quantmind.md").read()
}

# Health squad step
"attachAs": {
    "mountPath": ".agent_context/rules-health-squad.md",
    "content": open("memory/rules/rules-health-squad.md").read()
}

# Default fallback (any domain)
"attachAs": {
    "mountPath": ".agent_context/rules-default.md",
    "content": open("memory/rules/rules-default.md").read()
}
```

**Rule:** Only inject domain-specific rules. Security/general rules are wasted tokens on leaf sub-agents that lack tools to violate them.
