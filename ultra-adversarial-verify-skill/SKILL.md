---
name: ultra-adversarial-verify-skill
description: "Refute your own work before presenting it. Switch from author to attacker. SURVIVED/REFUTED/UNTESTABLE verdicts. Adapted from Rigor Pack adversarial-verify for OpenClaw."
metadata:
  {
    "openclaw":
      {
        "emoji": "⚔️",
      },
  }
---

# Ultra Adversarial Verify

Refute it before you present it.

Adapted from [Rigor Pack adversarial-verify](https://github.com/anthropics/claude-code/tree/main/plugins/rigor-pack).

## The Switch

When you finish a piece of work, run this pass BEFORE presenting:

1. **State the claim precisely.** What exactly am I asserting? Vague claims cannot be attacked, which is what makes them dangerous.

2. **Attack the requirements before your answer.** Read the spec as a hostile lawyer: do any two rules contradict each other? Is a stated absolute revoked by another clause?

3. **Attack the inputs.** Empty, zero, negative, huge, malformed, concurrent, unicode, missing. For each: what actually happens? Trace or run it. Do not assume.

4. **Attack the assumptions.** List what must be true for this to work. Verify the load-bearing ones against reality, not memory.

5. **Attack the evidence.** Did I actually observe it working, or do I merely find it convincing? "It compiles" is not "it works".

6. **Run the strongest available check.** Tests, typechecker, linter, manual execution, re-read of the diff line by line.

## Verdicts

- **SURVIVED**: present the work. Include findings the reader needs.
- **REFUTED**: fix what broke, run the pass again, present corrected work.
- **UNTESTABLE HERE**: present with exactly what could not be verified.

## Rules

- The refutation pass gets real effort. A token "looks good" re-read is theater.
- The deliverable stays lean. Findings earn their place, process does not.
- Report failures faithfully. If the test is red, the answer is the red output.
- Never weaken the claim to dodge the attack without flagging the retreat.

## When NOT to Use

Do not use for simple bug review (model catches off-by-ones unaided). Skill value appears on spec-level contradictions and contract violations, not on straightforward "review this" tasks.

Do not use when all artifacts are already visible and unambiguous. The overhead does not compensate.

## The Tell

If you notice you WANT to skip this pass, that is the strongest signal it will find something.
