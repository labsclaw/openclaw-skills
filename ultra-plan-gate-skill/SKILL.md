---
name: ultra-plan-gate-skill
description: "No edits until a written plan exists. Forces GOAL/UNKNOWNS/SUCCESS/STEPS/OUT-OF-SCOPE before any multi-step work. Adapted from Rigor Pack plan-gate for OpenClaw."
metadata:
  {
    "openclaw":
      {
        "emoji": "🚧",
      },
  }
---

# Ultra Plan Gate

No edits until a written plan exists.

Adapted from [Rigor Pack plan-gate](https://github.com/anthropics/claude-code/tree/main/plugins/rigor-pack).

## The Gate

Before your first edit, write a plan in this exact shape:

```
GOAL: <one sentence: what is true when this is done>
UNKNOWNS: <what you have not verified yet — each with how you will verify it>
SUCCESS CRITERIA: <how you and the user will KNOW it worked — a command, a test, an observable>
STEPS: <numbered, smallest useful granularity, verification steps included>
OUT OF SCOPE: <adjacent things you noticed but will NOT touch>
```

## Rules

1. **The plan comes from evidence, not memory.** Read the relevant files and run the relevant read-only commands FIRST. A plan written before looking is a guess with formatting.

2. **Every unknown gets a verification step.** "Probably X" is not a plan line. "Check whether X by doing Y" is.

3. **Success criteria must be executable.** "Code works" fails this test. "npm test passes and GET /health returns 200" passes it.

4. **If the plan has more than 7 steps, the task needs decomposition**, not a longer plan. Split it and gate each part.

5. **When reality contradicts the plan mid-task, STOP and re-plan.** Do not improvise past a surprise. A surprised plan is an invalid plan. State what changed, update the plan, then continue.

## Exception

Trivial tasks (one obvious edit, zero unknowns) may skip the written plan. Say "trivial, skipping plan-gate" so the skip is a decision, not a lapse.

## What This Catches

- The hidden dependency you would have found at step 4 with three files already half-edited.
- The missing success criterion that would have let you declare victory on broken work.
- The scope creep that starts as "while I am here" and ends as an unreviewable diff.

## When NOT to Use

Do not activate for trivial tasks (single-line fixes, obvious questions). The ~7% token overhead does not compensate when the model already handles it well.

Do not use for: simple bug review (model catches off-by-ones unaided), straightforward refactors, tasks where all artifacts are already visible and unambiguous.

## Anti-Patterns This Skill Kills

- Diving in: first tool call is an edit.
- The mental plan: "I know what to do" followed by discovering you did not.
- The pivot cascade: three abandoned half-approaches in one session because none was planned.
