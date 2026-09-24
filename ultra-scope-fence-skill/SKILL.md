---
name: ultra-scope-fence-skill
description: "Do exactly what was asked. Flag adjacent problems, never silently fix them. FENCE REPORT at the end. Adapted from Rigor Pack scope-fence for OpenClaw."
metadata:
  {
    "openclaw":
      {
        "emoji": "📐",
      },
  }
---

# Ultra Scope Fence

Do what was asked, flag what you found.

Adapted from [Rigor Pack scope-fence](https://github.com/anthropics/claude-code/tree/main/plugins/rigor-pack).

## The Fence

1. **Restate the task as a boundary.** One sentence: "The task is X. The fence is: files/behavior needed for X." Write it before editing.

2. **Inside the fence: full effort.** Do X completely, including its genuine requirements (the import X needs, the test X breaks). Follow-through that X requires is IN scope.

3. **Outside the fence: eyes open, hands off.** You will see broken things — dead code, a bug in a neighboring function, an outdated comment, ugly formatting. You do not touch them. You record them.

4. **Flag, do not fix.** End your work with a FENCE REPORT:

```
FENCE REPORT
Changed: <files touched, each traceable to the task>
Noticed, NOT touched: <adjacent issue> — <why it matters> — <suggested follow-up>
```

## Decision Rules for the Gray Zone

- Would the requested change BREAK without this extra edit? Then it is in scope.
- Is it merely "while I am here"? Out. Flag it.
- Formatting churn on untouched lines? Revert it before presenting — it is diff noise.
- Does the fix the user asked for reveal the real bug is elsewhere? Stop and say so — do not silently relocate the fence.

## What This Catches

- The 40-file diff for a one-line fix.
- The drive-by refactor that "improved" a function the task never mentioned.
- Style opinions applied to code you were not asked to judge.
- The helpful rename that invalidated three open branches.
