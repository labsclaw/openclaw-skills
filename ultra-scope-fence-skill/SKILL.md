---
name: ultra-scope-fence-skill
description: "Keeps implementation within the authorized task while preserving required follow-through. Use when a change exposes adjacent defects, a dirty worktree, broad refactoring opportunities, or other tempting work that was not requested."
license: Apache-2.0
metadata:
  {
    "openclaw":
      {
        "emoji": "📐",
      },
  }
---

# Ultra Scope Fence

Finish the requested outcome completely. Observe adjacent problems without silently adopting them.

## Establish the Fence

Before editing, state:

- the requested outcome;
- the files, systems, and people placed in scope;
- the verification required for that outcome;
- explicit exclusions or authority limits.

## Decision Test

An additional change is inside scope only if the requested outcome would otherwise be incomplete, broken, unsafe, or unverifiable. Convenience, cleanup, stylistic preference, and unrelated modernization stay outside.

If evidence shows the requested fix belongs elsewhere, stop and explain the changed boundary before moving it.

## Working Rules

- Preserve unrelated user changes in a dirty worktree.
- Avoid formatting churn outside the edited lines.
- Record adjacent risks with evidence and impact.
- Ask for authority before destructive, external, or materially broader action.
- Do not use the fence to omit tests, documentation, migration steps, or rollback that the requested change genuinely requires.

## Fence Report

End substantial work with:

```text
CHANGED: <task-linked files or systems>
VERIFIED: <evidence for the requested outcome>
NOT TOUCHED: <adjacent issue, impact, and recommended follow-up>
```
