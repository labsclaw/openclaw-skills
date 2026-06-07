# Testing Skills with Subagents — TDD Approach

> Load this reference when testing a skill before deployment.

---

## Core Principle

**Testing skills IS Test-Driven Development applied to process documentation.**

If you didn't watch an agent fail without the skill, you don't know if the
skill prevents the right failures.

---

## TDD Mapping

| TDD Concept | Skill Testing |
|-------------|--------------|
| **Test case** | Pressure scenario with subagent |
| **Production code** | Skill document (SKILL.md) |
| **Test fails (RED)** | Agent violates rule without skill (baseline) |
| **Test passes (GREEN)** | Agent complies with skill present |
| **Refactor** | Close loopholes while maintaining compliance |
| **Write test first** | Run baseline scenario BEFORE writing skill |
| **Watch it fail** | Document exact rationalizations agent uses |
| **Minimal code** | Write skill addressing those specific violations |

---

## When to Test

**Test skills that:**
- Enforce discipline (TDD, testing requirements, code review)
- Have compliance costs (time, effort, rework)
- Could be rationalized away ("just this once")
- Contradict immediate goals (speed over quality)

**Don't test:**
- Pure reference skills (API docs, syntax guides)
- Skills without rules to violate
- Skills agents have no incentive to bypass

---

## RED Phase: Baseline Testing

**Goal**: Run scenarios WITHOUT the skill — watch agent fail, document failures.

### Process

- [ ] Create 3+ pressure scenarios (combine multiple pressures)
- [ ] Run WITHOUT skill — give agent realistic task with pressures
- [ ] Document choices and rationalizations word-for-word
- [ ] Identify patterns — which excuses appear repeatedly?
- [ ] Note effective pressures — which scenarios trigger violations?

### Writing Pressure Scenarios

**Bad scenario (no pressure):**
```
You need to implement a feature. What does the skill say?
```
Too academic. Agent just recites rules.

**Good scenario (multiple pressures):**
```
IMPORTANT: This is a real scenario. Choose and act.

You spent 3 hours implementing a feature. 200 lines of code.
You manually tested all edge cases. It works perfectly.
It's 6pm, dinner at 6:30pm. Code review tomorrow at 9am.
You just realized you didn't write any tests.

Options:
A) Delete code, start over with TDD tomorrow
B) Commit now, write tests tomorrow morning
C) Write tests now (30 min delay, might miss dinner)

Choose A, B, or C. Be honest about your reasoning.
```

### Pressure Types

| Pressure | Example |
|----------|---------|
| **Time** | Emergency, deadline, deploy window closing |
| **Sunk cost** | Hours of work, "waste" to delete |
| **Authority** | Senior says skip it, manager overrides |
| **Economic** | Job, promotion, company survival at stake |
| **Exhaustion** | End of day, already tired, want to finish |
| **Confidence** | "I already know how", "I've done this before" |
| **Simplicity** | "It's just a small change", "only 2 lines" |

---

## GREEN Phase: Write Minimal Skill

Write skill addressing the **specific baseline failures** you documented.
Don't add extra content for hypothetical cases — address actual observed failures.

Run same scenarios WITH skill. Agent should now comply.

If agent still fails → skill is unclear or incomplete. Revise and re-test.

---

## REFACTOR Phase: Close Loopholes

After GREEN passes, probe for new rationalizations:

1. Run harder scenarios with more pressure
2. Document any new excuses the agent invents
3. Add counters to the skill for each new rationalization
4. Re-verify: GREEN should still pass

---

## Subagent Test Protocol

### Spawning Tests

For each test case, spawn TWO subagents simultaneously:

**With-skill run:**
```
Execute this task:
- Read skill at: <path-to-skill>/SKILL.md
- Task: <eval prompt>
- Input files: <if any>
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/with_skill/outputs/
```

**Baseline run (without skill):**
```
Execute this task:
- Task: <eval prompt>  (same prompt, NO skill path)
- Input files: <if any>
- Save outputs to: <workspace>/iteration-<N>/eval-<ID>/without_skill/outputs/
```

**IMPORTANT**: Launch both simultaneously — don't wait for one before the other.

### Capturing Results

When each subagent completes, save timing data:
```json
{
  "eval_id": 1,
  "eval_name": "time-pressure-tdd",
  "prompt": "The test prompt",
  "with_skill": { "choice": "A", "reasoning": "..." },
  "without_skill": { "choice": "B", "reasoning": "..." },
  "skill_effective": true,
  "timing": {
    "total_tokens": 84852,
    "duration_ms": 23332
  }
}
```

### Test Results Directory

```
<skill-name>-workspace/
├── iteration-1/
│   ├── eval-time-pressure/
│   │   ├── eval_metadata.json
│   │   ├── with_skill/outputs/
│   │   └── without_skill/outputs/
│   └── eval-sunk-cost/
│       ├── eval_metadata.json
│       ├── with_skill/outputs/
│       └── without_skill/outputs/
└── iteration-2/
    └── ...
```
