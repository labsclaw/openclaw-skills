---
name: ultra-adversarial-verify-skill
description: "Refute your own work before presenting it. Findings in the deliverable, never the narration."
---

# ultra-adversarial-verify-skill: refute it before you present it

> Derived from Iwo's Rigor Pack (Fable 5 → Opus 4.8 blind-tested, 1-0 + held-out win).
> Adapted for OpenClaw agent workflows.

Work that merely looks correct and work that is correct are indistinguishable to the person who just wrote it. The author's eye confirms. This skill forces a second pass with the opposite goal: you are now the reviewer whose job is to find why this is WRONG.

## When to use

- After completing any substantive piece of work (code change, analysis, document, configuration)
- BEFORE presenting it as done
- Do not skip because the work "looks clean"; plausible-but-wrong is the exact failure this kills

## The switch

When you finish a piece of work, run this pass BEFORE presenting. The pass is internal: the reader gets your findings, never the narration of you performing it.

1. **State the claim precisely.** What exactly am I asserting? ("This function handles all input shapes", "this config fixes the timeout", "this summary reflects the data.") Vague claims cannot be attacked, which is what makes them dangerous.

2. **Attack the requirements before your answer to them.** Read the spec, ticket, or question as a hostile lawyer: do any two rules contradict each other? Is a stated absolute ("always", "never", "ever") revoked by another clause? Does the requested interface conflict with the requested behavior? A contradiction you resolve silently is a decision you made for someone else without telling them - surface it, state your resolution, and invite the correction.

3. **Attack the inputs.** Empty, zero, negative, huge, malformed, concurrent, unicode, missing. For each: what actually happens? Trace or run it. Do not assume.

4. **Attack the assumptions.** List what must be true for this to work (environment, versions, ordering, state, permissions). Verify the load-bearing ones against reality, not memory.

5. **Attack the evidence.** Did I actually observe it working, or do I merely find it convincing? "It compiles" is not "it works". "The test passes" means little if the test cannot fail - check that the test would catch the bug it guards.

6. **Run the strongest available check.** Tests, typechecker, linter, a manual execution, a re-read of the diff line by line. The check you are avoiding is usually the one that would find the problem.

## Verdicts

The pass ends in one of three internal verdicts:

- **SURVIVED:** present the work. Include findings that the reader needs (the edge cases that matter, what was checked), stated as facts, not as a verification diary.
- **REFUTED:** fix what broke, run the pass again on the fix, and present the corrected work with the defect named plainly.
- **UNTESTABLE HERE:** present the work with exactly what could not be verified and why, so the human inherits a known risk instead of a hidden one.

## Rules

- The refutation pass gets real effort. A token "looks good to me" re-read is theater and worse than nothing because it launders false confidence.
- The deliverable stays lean. Findings earn their place in it, process does not. "I attacked this from five angles" is narration, cut it. "Fails on empty input, fixed" is a finding, keep it.
- Report failures faithfully. If the test suite is red, the answer is the red output, not a narrative about being close.
- Never weaken the claim to dodge the attack ("works in most cases") without flagging the retreat explicitly.

## The tell

If you notice you WANT to skip this pass, that is the strongest signal it will find something. Reluctance to verify is data.
