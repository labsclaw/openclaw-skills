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

Skill authoring for OpenClaw/OpenCode. Lifecycle: intent → TDD → publication.

## When to Use

Creating skills, capturing workflows, editing/improving skills, fixing non-triggering descriptions, benchmarking, evaluating quality.

## When NOT to Use

Finding existing skills → `ultra-find-skill`. Editing `AGENTS.md`/`GEMINI.md`/`CLAUDE.md`. Project-specific config. One-off solutions.

**Decision:** Reusable across projects? → skill. Project-specific? → config. One-off? → skip.

## Workflow

### Phase 1: Capture Intent

Extract from history: (1) What should it enable? (2) When trigger? (3) Output format? (4) Test?

### Phase 2: Interview & Research

Gather edge cases, I/O formats, success criteria. Check similar skills.

| Type | Description | Example |
|------|-------------|---------|
| **Technique** | Concrete method with steps | TDD workflow |
| **Pattern** | Problem-solving approach | Error handling |
| **Reference** | API docs, syntax guides | Library docs |

### Phase 3: Generate SKILL.md

Templates: `skill-template-basic.md` | `skill-template-full.md` | `skill-template-reference.md`

**Rules:**
1. **Frontmatter** — `name`: 1-64 chars, lowercase+hyphens, matches folder. `description`: ≤1024 chars.
2. **Description** — Start "Use when...", third person, describe PROBLEM not workflow, include trigger terms, NEVER summarize process.
3. **Body** — Title → Installation → Setup → When to Use → When NOT to Use → Instructions → Architecture → Allowed Tools → Usage → Best Practices → Reference → Related Skills → Checklist → License
4. **Size** — ≤500 lines. Heavy content → `references/`.
5. **Progressive disclosure** — SKILL.md = overview; `references/` = deep; `scripts/` = executable.

### Phase 4: Validate

```bash
bash scripts/validate-skill.sh <skill-path>
bash scripts/check-description.sh <skill-path>
```

Scorecard: `references/quality-scorecard.md` — 80-100 ready, 60-79 improve, <60 rework.

### Phase 5: Test (TDD)

**RED** — 2-3 prompts WITHOUT skill. **GREEN** — same WITH skill. **REFACTOR** — close loopholes. Save to `evals/`.

### Phase 6: Publish

1. Description optimizer → 2. Quality ≥ 80/100 → 3. Publish:
   - Local: `cp -r <skill>/ ~/.openclaw/skills/`
   - Git: `git add . && git commit -m "feat(skills): add <skill-name>"`

## Architecture

```
ultra-create-skill/
├── SKILL.md
├── references/   (anatomy, optimizer, testing, persuasion, scorecard)
├── scripts/      (validate, generate, check-description)
├── templates/    (basic, full, reference)
├── evals/        (evals.json)
└── examples/     (knowledge, tool, complex)
```

## Best Practices

1. Fix description first for triggering
2. SKILL.md lean; heavy docs in `references/`
3. One workflow per skill
4. Include input/output examples
5. Model-agnostic — no specific model names
6. Every token competes with context — be concise

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-find-skill` | Search before creating |
| `skill-optimizer` | Post-creation optimization |

## Quality Checklist

- [ ] Valid YAML frontmatter, `name` matches folder
- [ ] `description` starts "Use when..." — 100-500 chars, no workflow summary
- [ ] SKILL.md ≤ 500 lines, all required sections
- [ ] Scripts executable, scorecard ≥ 80/100
- [ ] Tested with 2-3 realistic scenarios

## License

Apache-2.0. Model-agnostic.
