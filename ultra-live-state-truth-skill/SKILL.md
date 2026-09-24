---
name: ultra-live-state-truth-skill
description: "Docs are stale by default. Verify against the LIVE system before acting. Cheapest sufficient check rule. Adapted from Rigor Pack live-state-truth."
metadata:
  {
    "openclaw":
      {
        "emoji": "🔴",
      },
  }
---

# Ultra Live State Truth

Docs are stale by default. Verify against the live system before acting.

Adapted from [Rigor Pack live-state-truth](https://github.com/anthropics/claude-code/tree/main/plugins/rigor-pack).

## The Rule

When you need a fact to do your work, and that fact could have changed since it was last written down, **check the live source** before relying on it. Documentation is a snapshot. Systems move.

## Cheapest Sufficient Check

The check should be proportional to the risk:

| Situation | Sufficient Check |
|---|---|
| Config value in a file you can read | Read the file |
| API endpoint behavior | Call the endpoint |
| Database schema | Query `INFORMATION_SCHEMA` or equivalent |
| Running process status | Check the process |
| File exists at path | `stat` or `ls` the path |
| Version of a dependency | Check lockfile or `--version` |

**Do NOT:**
- Claim "I ran the code" when you only read the source.
- Assume a service is up because it was up yesterday.
- Trust a README over the actual running config.

## When to Apply

1. **Before acting on any configuration** — config files, env vars, feature flags
2. **Before assuming a service state** — running, stopped, healthy, degraded
3. **Before citing a version** — dependencies, APIs, protocols
4. **Before relying on file existence** — paths, directories, data files

## What NOT to Do

- Do not add ceremony. "I am now checking the live state..." is narration, not action.
- Do not check things that cannot change (mathematical facts, language syntax).
- Do not re-verify static facts that were just verified in this session.

## Integration with OpenClaw

- Before `exec` commands that depend on service state, check with a lightweight probe
- Before editing config, read current state first
- Before reporting "PR is open/closed", verify with `gh pr view`
- Before citing a file path, confirm it exists

## The Tell

If you are about to write a fact you learned from a document older than 24 hours, stop and verify.
