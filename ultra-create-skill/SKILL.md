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

The definitive skill authoring system for OpenClaw/OpenCode. Guides the
complete lifecycle from intent capture through TDD-based testing to
publication — producing skills that trigger reliably across all agent platforms.

---

## Installation

Copy this skill directory to any supported skills path:

```bash
# OpenClaw (recommended)
cp -r ultra-create-skill/ ~/.openclaw/skills/ultra-create-skill/

# Cross-platform alternatives
cp -r ultra-create-skill/ ~/.agents/skills/ultra-create-skill/
cp -r ultra-create-skill/ <workspace>/.agents/skills/ultra-create-skill/
```

No external dependencies required. Templates and validation scripts included.

---

## Setup

After installation, verify the skill is detected:

```bash
# OpenClaw
openclaw skills list | grep ultra-create

# Or manually check
ls ~/.openclaw/skills/ultra-create-skill/SKILL.md
```

**Available templates** are in `templates/` — the agent reads them on demand.
**Validation scripts** are in `scripts/` — executable without additional setup.

---

## When to Use This Skill

Use this skill when:

- Creating a new skill from scratch for any purpose
- The user says "make this a skill" or "turn this into a skill"
- The user wants to capture a completed workflow as a reusable skill
- Editing or improving an existing skill's content
- A skill exists but isn't triggering when it should (description optimization)
- The user wants to benchmark skill performance (with/without comparison)
- Evaluating an existing skill's quality against best practices
- The user wants a skill template to start from
- The user asks "why isn't my skill working/triggering?"
- Creating a skill that must work across multiple agent platforms
- Reviewing a skill before publishing to a shared repository
- The user wants to test a skill with pressure scenarios

---

## When NOT to Use This Skill

Do NOT use this skill when:

- The user wants to FIND an existing skill (use `ultra-find-skill` instead)
- The user needs to edit `AGENTS.md`, `GEMINI.md`, or `CLAUDE.md` — those are
  always-on project context files, not skills
- The change is project-specific configuration (put in project config, not a skill)
- The practice is a standard, well-documented pattern that doesn't need packaging
- The workflow is a one-off solution that won't be reused

**Decision guide:**
- Will you reference this again across projects? → **Make a skill**
- Is this project-specific? → **Put in project config**
- Is this a one-off? → **Don't make a skill**

---

## Skill Creation Workflow

### Phase 1: Capture Intent

Start by understanding what the user needs. If the current conversation
already contains a workflow to capture (e.g., "turn this into a skill"),
extract answers from conversation history first.

**Four key questions:**

1. **What** should this skill enable the agent to do?
2. **When** should this skill trigger? (specific phrases, contexts, scenarios)
3. **What** is the expected output format?
4. **Should we test?** Skills with objectively verifiable outputs benefit from
   test cases. Subjective skills (writing style, design quality) often don't.

**Adapt communication** to the user's technical level. Pay attention to context
cues — if the user is non-technical, avoid jargon like "assertions" and
"benchmarks" without brief explanations.

### Phase 2: Interview & Research

Before writing anything, gather context:

- Ask about **edge cases** and **failure modes**
- Clarify **input/output formats** with concrete examples
- Define **success criteria** — how do we know the skill worked?
- Check if **similar skills exist** (trigger `ultra-find-skill` search)
- Identify the **skill type**:

| Type | Description | Example |
|------|-------------|---------|
| **Technique** | Concrete method with steps | TDD workflow, code review process |
| **Pattern** | Way of thinking about problems | Error handling strategy |
| **Reference** | API docs, syntax guides | Library documentation |

- Determine **degrees of freedom**:

| Freedom | When to Use | Example |
|---------|-------------|---------|
| **High** | Multiple valid approaches, context-dependent | Code review guidelines |
| **Medium** | Preferred pattern exists, some variation OK | Report generation template |
| **Low** | Operations are fragile, consistency critical | Database migration steps |

### Phase 3: Generate SKILL.md

Use the appropriate template from `templates/`:
- Simple skill → [skill-template-basic.md](templates/skill-template-basic.md)
- Full skill → [skill-template-full.md](templates/skill-template-full.md)
- Reference-heavy → [skill-template-reference.md](templates/skill-template-reference.md)

**Critical rules for SKILL.md:**

1. **Frontmatter** — Follow [agentskills.io specification](https://agentskills.io/specification):
   - `name`: 1-64 chars, lowercase + hyphens, MUST match folder name
   - `description`: Max 1024 chars, the most critical field for triggering
   - See [templates/frontmatter-reference.yaml](templates/frontmatter-reference.yaml) for all fields

2. **Description writing** — THE most important part. See [references/description-optimizer.md](references/description-optimizer.md):
   - Start with "Use when..." — focus on triggering conditions
   - Write in third person
   - Describe the PROBLEM, not the workflow
   - Include trigger terms the agent would search for
   - Be slightly "pushy" to combat under-triggering
   - **NEVER** summarize the skill's process in the description

3. **Body structure** — Include ALL of these sections:
   - `# Title` → `## Installation` → `## Setup` → `## When to Use`
   - `## When NOT to Use` → `## Instructions/How It Works`
   - `## Architecture` → `## Allowed Tools` → `## Usage/Examples`
   - `## Best Practices` → `## Reference` → `## Related Skills`
   - `## Checklist` → `## License` → `## Contributing` → `## About`

4. **Size limits** — Keep SKILL.md under **500 lines**. If approaching this
   limit, move content to `references/` with clear pointers. For large
   reference files (>300 lines), include a table of contents.

5. **Progressive disclosure** — See [references/progressive-disclosure.md](references/progressive-disclosure.md):
   - SKILL.md = overview + navigation (loaded on trigger)
   - `references/` = deep content (loaded on demand)
   - `scripts/` = executable code (executed, not loaded into context)

6. **Writing style** — Use imperative form. Explain WHY things matter instead
   of heavy-handed "MUSTs". Use theory of mind — make the skill general, not
   narrow to specific examples.

### Phase 4: Validate

Run structural and quality checks:

1. **Structure check**: `bash scripts/validate-skill.sh <skill-path>`
   - SKILL.md exists with valid YAML frontmatter
   - `name` field matches folder name
   - `description` field is non-empty and ≤ 1024 chars
   - Line count ≤ 500

2. **Description check**: `bash scripts/check-description.sh <skill-path>`
   - Starts with "Use when..." or similar trigger phrase
   - Written in third person
   - Does NOT summarize the workflow
   - Includes at least 3 trigger terms
   - Length between 100-500 characters (sweet spot)

3. **Quality scorecard**: See [references/quality-scorecard.md](references/quality-scorecard.md)
   - Score 80-100 → Ready for publication
   - Score 60-79 → Needs improvement in specific areas
   - Score below 60 → Significant rework needed

### Phase 5: Test (TDD Approach)

For skills that enforce rules or processes, use TDD-based testing.
See [references/testing-with-subagents.md](references/testing-with-subagents.md).

**RED phase** — Run pressure scenarios WITHOUT the skill:
- Create 2-3 realistic test prompts (scenarios a real user would face)
- Run them without the skill as baseline
- Document exact failures and rationalizations the agent uses

**GREEN phase** — Run same scenarios WITH the skill:
- The skill should address the specific failures observed
- If the agent still fails, the skill is unclear — revise

**REFACTOR phase** — Close loopholes:
- Find new rationalizations the agent invents
- Add counters to the skill
- Re-verify compliance

**Spawn with-skill and baseline runs simultaneously** — don't wait for one
before starting the other. Use subagents for parallel execution.

Save test results to `evals/` with timing data (`total_tokens`, `duration_ms`).

### Phase 6: Optimize & Publish

1. **Run description optimizer** — See [references/description-optimizer.md](references/description-optimizer.md)
2. **Apply persuasion principles** (if applicable) — See [references/persuasion-principles.md](references/persuasion-principles.md)
3. **Final quality check** — Target score ≥ 80/100
4. **Publish**:
   - Local install: `cp -r <skill>/ ~/.openclaw/skills/`
   - Git: `git add . && git commit -m "feat(skills): add <skill-name>"`
   - Remote: `npx skills publish` or push to GitHub

---

## Architecture

```
ultra-create-skill/
├── SKILL.md                         ← You are here (main instructions)
├── references/
│   ├── skill-anatomy.md             ← Complete SKILL.md structure guide
│   ├── description-optimizer.md     ← How to write triggering descriptions
│   ├── testing-with-subagents.md    ← TDD testing with pressure scenarios
│   ├── persuasion-principles.md     ← Compliance techniques for discipline skills
│   ├── progressive-disclosure.md    ← Content organization patterns
│   ├── quality-scorecard.md         ← 0-100 scoring rubric
│   └── cross-platform-compat.md    ← Making skills work everywhere
├── scripts/
│   ├── validate-skill.sh            ← Structural validation
│   ├── generate-skeleton.sh         ← Generate skill skeleton interactively
│   └── check-description.sh         ← Validate description quality
├── templates/
│   ├── skill-template-basic.md      ← Minimal SKILL.md template
│   ├── skill-template-full.md       ← Complete template with all sections
│   ├── skill-template-reference.md  ← Template for reference-heavy skills
│   └── frontmatter-reference.yaml  ← All valid frontmatter fields
├── evals/
│   └── evals.json                   ← Test case schema and examples
└── examples/
    ├── create-knowledge-skill.md    ← Example: pure instruction skill
    ├── create-tool-skill.md         ← Example: skill with scripts
    └── create-complex-skill.md      ← Example: multi-domain with references
```

---

## Allowed Tools

This skill may use the following tools during execution:

- `write_to_file` — Create SKILL.md and supporting files
- `view_file` — Read templates, references, and existing skills
- `read_file` — Inspect existing skill content for editing
- `run_command` — Execute validation scripts, Git commands
- `grep_search` — Search existing skills for patterns
- `invoke_subagent` — Spawn test runners for TDD evaluation
- `list_dir` — Inspect skill directory structure

---

## Best Practices

1. **Description is everything** — If a skill isn't triggering, fix the
   description first. It's the primary routing mechanism.
2. **Test with pressure** — Skills that enforce discipline MUST be pressure-tested
3. **Progressive disclosure** — Keep SKILL.md lean; heavy docs go in `references/`
4. **One workflow per skill** — Don't create Swiss-army-knife skills
5. **Examples are critical** — Include input/output examples so agents know
   what success looks like
6. **Model-agnostic always** — Never reference specific model names or providers
7. **Name = folder** — The `name` field must match the parent directory name
8. **Start simple** — Basic SKILL.md first, then add scripts and references
9. **Token budget** — Every token in your SKILL.md competes with conversation
   context. Be concise. Challenge every paragraph: "Does the agent need this?"

---

## Reference

For detailed information, see:

- **[Skill Anatomy](references/skill-anatomy.md)** — Complete structural guide for SKILL.md files
- **[Description Optimizer](references/description-optimizer.md)** — CSO techniques for reliable triggering
- **[Testing Guide](references/testing-with-subagents.md)** — TDD approach with subagent pressure testing
- **[Persuasion Principles](references/persuasion-principles.md)** — Research-backed compliance techniques
- **[Progressive Disclosure](references/progressive-disclosure.md)** — Content organization patterns
- **[Quality Scorecard](references/quality-scorecard.md)** — 0-100 scoring rubric for skill evaluation
- **[Cross-Platform Compatibility](references/cross-platform-compat.md)** — Making skills work everywhere

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-find-skill` | Search for existing skills before creating new ones |
| `ecosystem-steward` | The steward's `forge compile` creates skills from multiple sources |
| `skill-optimizer` | Post-creation optimization for activation and reliability |
| `workflow-skill-creator` | Distills completed workflows into skills (narrower scope) |

---

## Quality Checklist

Before publishing a skill, verify:

- [ ] `SKILL.md` exists with valid YAML frontmatter
- [ ] `name` matches folder name (lowercase, hyphens only)
- [ ] `description` starts with "Use when..." and doesn't summarize workflow
- [ ] `description` is between 100-500 characters
- [ ] SKILL.md body ≤ 500 lines
- [ ] All required sections present (Installation through About)
- [ ] No references to specific model names or providers
- [ ] Examples included (inline or in `examples/`)
- [ ] Heavy content moved to `references/` (not bloating SKILL.md)
- [ ] Scripts are executable and tested
- [ ] Quality scorecard score ≥ 80/100
- [ ] Security review passed (no injection patterns, no secrets)
- [ ] Tested with at least 2-3 realistic scenarios

---

## License

Apache-2.0. This skill is part of the OpenClaw ecosystem.

---

## Contributing

To improve this skill:

1. Fork the repository containing this skill
2. Edit files following the structure in `## Architecture`
3. Test changes by asking the agent to create various types of skills
4. Validate generated skills pass the quality scorecard
5. Submit a pull request with a clear description of improvements

**Areas for contribution:**
- Add new templates for emerging skill patterns
- Improve validation scripts with more checks
- Add examples for new skill types
- Enhance the quality scorecard with new criteria
- Add support for new agent platforms in cross-platform docs

---

## About

**ultra-create-skill** was built by synthesizing the best patterns from 32+
skill ecosystem sources including Anthropic's skill-creator, Vercel's skill
framework, obra/superpowers writing-skills (TDD approach), agentskills.io
specification, mcollina's skill-optimizer, and platform documentation from
OpenClaw, OpenCode, Claude Code, Codex CLI, and Gemini CLI.

Built for the OpenClaw community. Model-agnostic — works with any LLM.
