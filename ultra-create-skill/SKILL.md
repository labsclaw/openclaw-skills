---
name: ultra-create-skill
description: >-
  Use when creating new skills from scratch, editing or improving existing
  skills, optimizing skill descriptions for better triggering, measuring skill
  performance with benchmarks, turning completed workflows into reusable skills,
  or evaluating skill quality against best practices. Also use when users say
  "make this a skill", "create a skill", "package this workflow", "improve this
  skill", "optimize this skill", "why isn't my skill triggering", or want to
  review skill quality.
  Trigger terms: create skill, new skill, write skill, build skill, skill from
  scratch, improve skill, optimize skill, edit skill, skill template, skill
  quality, skill description, package workflow, turn into skill, make skill,
  skill not triggering, skill benchmark, test skill, skill evaluation.
---

# Ultra Create Skill

Skill authoring system for OpenClaw/OpenCode. Lifecycle: intent capture → TDD testing → publication.

## Installation

```bash
cp -r ultra-create-skill/ ~/.openclaw/skills/ultra-create-skill/
cp -r ultra-create-skill/ ~/.agents/skills/ultra-create-skill/
```

## Setup

```bash
openclaw skills list | grep ultra-create
ls ~/.openclaw/skills/ultra-create-skill/SKILL.md
```

Templates in `templates/`, validation in `scripts/`.

## When to Use

Creating new skills, "make this a skill", capturing workflows, editing/improving skills, fixing non-triggering descriptions, benchmarking, evaluating quality, cross-platform skills, pre-publish review.

## When NOT to Use

Finding existing skills → `ultra-find-skill`. Editing `AGENTS.md`/`GEMINI.md`/`CLAUDE.md` (always-on context, not skills). Project-specific config. One-off solutions.

**Decision:** Reusable across projects? → skill. Project-specific? → config. One-off? → skip.

## Workflow

### Phase 1: Capture Intent

If conversation has a workflow to capture, extract from history. Four questions: (1) What should it enable? (2) When trigger? (3) Output format? (4) Should we test?

### Phase 2: Interview & Research

Gather edge cases, I/O formats with examples, success criteria. Check similar skills (`ultra-find-skill`).

| Type | Description | Example |
|------|-------------|---------|
| **Technique** | Concrete method with steps | TDD workflow |
| **Pattern** | Problem-solving approach | Error handling |
| **Reference** | API docs, syntax guides | Library docs |

| Freedom | When | Example |
|---------|------|---------|
| **High** | Multiple valid approaches | Code review |
| **Medium** | Preferred pattern, some variation | Report generation |
| **Low** | Fragile ops, consistency critical | DB migration |

### Phase 3: Generate SKILL.md

Templates: `skill-template-basic.md` | `skill-template-full.md` | `skill-template-reference.md`

**Rules:**
1. **Frontmatter** — `name`: 1-64 chars, lowercase+hyphens, matches folder. `description`: ≤1024 chars.
2. **Description** — Start "Use when...", third person, describe PROBLEM not workflow, include trigger terms, NEVER summarize process.
3. **Body sections** — Title → Installation → Setup → When to Use → When NOT to Use → Instructions → Architecture → Allowed Tools → Usage/Examples → Best Practices → Reference → Related Skills → Checklist → License → Contributing → About
4. **Size** — ≤500 lines. Heavy content → `references/`.
5. **Progressive disclosure** — SKILL.md = overview; `references/` = deep; `scripts/` = executable.

### Phase 4: Validate

```bash
bash scripts/validate-skill.sh <skill-path>     # structure, frontmatter, size
bash scripts/check-description.sh <skill-path>  # trigger phrase, 3rd person, no workflow summary
```

Scorecard: [references/quality-scorecard.md](references/quality-scorecard.md) — 80-100 ready, 60-79 improve, <60 rework.

### Phase 5: Test (TDD)

**RED** — 2-3 prompts WITHOUT skill. Document failures. **GREEN** — same WITH skill. **REFACTOR** — close loopholes, add counters, re-verify. Spawn with-skill and baseline simultaneously via subagents. Save to `evals/`.

### Phase 6: Publish

1. [Description optimizer](references/description-optimizer.md) → 2. [Persuasion principles](references/persuasion-principles.md) → 3. Quality ≥ 80/100 → 4. Publish:
   - Local: `cp -r <skill>/ ~/.openclaw/skills/`
   - Git: `git add . && git commit -m "feat(skills): add <skill-name>"`
   - Remote: `npx skills publish`

## Architecture

```
ultra-create-skill/
├── SKILL.md
├── references/   (skill-anatomy, description-optimizer, testing, persuasion,
│                  progressive-disclosure, quality-scorecard, cross-platform-compat)
├── scripts/      (validate-skill.sh, generate-skeleton.sh, check-description.sh)
├── templates/    (basic, full, reference, frontmatter-reference.yaml)
├── evals/        (evals.json)
└── examples/     (knowledge, tool, complex)
```

## Best Practices

1. Fix description first for triggering
2. Discipline skills must be pressure-tested
3. SKILL.md lean; heavy docs in `references/`
4. One workflow per skill
5. Include input/output examples
6. Model-agnostic — no specific model names
7. `name` must match parent directory
8. Start simple, add scripts/references later
9. Every token competes with context — be concise

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-find-skill` | Search before creating |
| `ecosystem-steward` | Creates from multiple sources |
| `skill-optimizer` | Post-creation optimization |
| `workflow-skill-creator` | Narrower scope — workflows only |

## Quality Checklist

- [ ] SKILL.md with valid YAML frontmatter
- [ ] `name` matches folder (lowercase, hyphens)
- [ ] `description` starts "Use when..." — no workflow summary, 100-500 chars
- [ ] SKILL.md ≤ 500 lines, all required sections present
- [ ] No model names, examples included, heavy content in `references/`
- [ ] Scripts executable, scorecard ≥ 80/100, security passed
- [ ] Tested with 2-3 realistic scenarios

## License

Apache-2.0. Model-agnostic — works with any LLM.
