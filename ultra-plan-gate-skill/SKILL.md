---
name: ultra-plan-gate-skill
description: "Requires an evidence-based written plan before multi-step edits. Use when work spans several files, has meaningful unknowns, changes external state, or needs explicit success criteria and scope control."
license: Apache-2.0
metadata:
  {
    "openclaw":
      {
        "emoji": "🚧",
      },
  }
---

# Ultra Plan Gate

Do not start a multi-step mutation until the task has a verifiable execution contract.

## Pre-Edit Gate

Inspect the relevant files and current state, then write:

```text
GOAL: <the observable end state>
UNKNOWNS: <open facts and the read-only check for each>
SUCCESS CRITERIA: <commands, tests, or observations that prove completion>
STEPS: <ordered implementation and verification steps>
OUT OF SCOPE: <adjacent work intentionally excluded>
```

## Rules

1. Evidence comes before planning. A plan based only on memory is a hypothesis.
2. Every material unknown needs a named way to resolve it.
3. Success criteria must be observable and proportionate to risk.
4. Keep the plan small enough to review. Split work that needs more than seven major steps.
5. Include rollback or recovery when a mutation can disrupt service or lose data.
6. If reality contradicts the plan, stop the mutation, update the affected assumptions and steps, then continue.
7. Treat user changes as scope changes. Reconcile them with unfinished work instead of silently discarding either one.

## Completion Gate

Before declaring completion:

- map each success criterion to evidence;
- identify any criterion that was not exercised;
- confirm out-of-scope items were not changed;
- state remaining blockers or follow-up work.

Skip the written gate only for a single obvious action with no meaningful unknowns or external risk.
