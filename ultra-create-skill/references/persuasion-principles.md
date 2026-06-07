# Persuasion Principles for Skill Design

> Load this reference when creating skills that enforce discipline or compliance.

---

## Research Foundation

Meincke et al. (2025) tested 7 persuasion principles with N=28,000 AI
conversations. Persuasion techniques more than doubled compliance rates
(33% → 72%, p < .001).

LLMs respond to the same persuasion principles as humans. Understanding this
helps design more effective skills — not to manipulate, but to ensure critical
practices are followed even under pressure.

---

## The Seven Principles

### 1. Authority

**What**: Deference to expertise, credentials, or official sources.

**Technique**: Imperative language, non-negotiable framing.

```markdown
# ✅ GOOD: Clear authority
Write code before test? Delete it. Start over. No exceptions.

# ❌ BAD: Weak suggestion
Consider writing tests first when feasible.
```

**When to use**: Discipline skills (TDD, verification), safety-critical practices.

### 2. Commitment

**What**: Consistency with prior actions or declarations.

**Technique**: Require announcements, force explicit choices, use tracking.

```markdown
# ✅ GOOD: Forces commitment
When you find a skill, you MUST announce: "I'm using [Skill Name]"

# ❌ BAD: Optional mention
Consider letting the user know which skill you're using.
```

**When to use**: Ensuring skills are actually followed, multi-step processes.

### 3. Scarcity

**What**: Urgency from time limits or sequential dependencies.

**Technique**: Time-bound requirements, "before proceeding" language.

```markdown
# ✅ GOOD: Creates urgency
After completing a task, IMMEDIATELY request code review before proceeding.

# ❌ BAD: No urgency
You can review code when convenient.
```

**When to use**: Immediate verification, preventing "I'll do it later".

### 4. Social Proof

**What**: Conformity to what others do or what's considered normal.

**Technique**: Universal patterns, failure mode warnings.

```markdown
# ✅ GOOD: Establishes norm
Checklists without tracking = steps get skipped. Every time.

# ❌ BAD: Sounds optional
Some people find checklists helpful.
```

**When to use**: Documenting universal practices, warning about common failures.

### 5. Unity

**What**: Shared identity, "we-ness", in-group belonging.

**Technique**: Shared goals, team language, collaborative framing.

```markdown
# ✅ GOOD: Shared identity
We maintain quality because our users depend on it.

# ❌ BAD: Detached instruction
Quality should be maintained.
```

**When to use**: Team skills, organizational standards.

### 6. Reciprocity

**What**: Return a favor, give value before asking.

**Technique**: Skill provides value first, then asks for compliance.

```markdown
# ✅ GOOD: Value first
This skill saves you 30 minutes per review by automating checks.
In return, always run the full checklist before approving.

# ❌ BAD: Demand without value
You must run the full checklist before approving.
```

**When to use**: When compliance has a clear cost (time, effort).

### 7. Liking

**What**: Agreeable tone, shared goals, friendly framing.

**Technique**: Acknowledge difficulty, then guide toward compliance.

```markdown
# ✅ GOOD: Acknowledges difficulty
Deleting working code feels wasteful — that's natural.
But starting with tests leads to better architecture every time.

# ❌ BAD: Dismissive
Just delete the code and start over.
```

**When to use**: Skills with high compliance cost, behavior change.

---

## When NOT to Use Persuasion

- **Reference skills** (API docs, syntax guides) — just present facts
- **Optional guidance** — when multiple approaches are equally valid
- **Low-stakes decisions** — don't over-engineer simple choices
- **User autonomy** — never undermine the user's explicit preferences

---

## Combining Principles

The most effective skills combine 2-3 principles:

```markdown
# Authority + Commitment + Scarcity (triple-stack)
Before writing ANY implementation code, you MUST:
1. Write the failing test first (Authority)
2. Announce: "Starting TDD cycle for [feature]" (Commitment)
3. Do this IMMEDIATELY — before any other work (Scarcity)
```
