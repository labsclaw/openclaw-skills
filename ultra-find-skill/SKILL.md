---
name: ultra-find-skill
description: >-
  Use when searching for agent skills, asking "how do I do X", "find a skill
  for X", "is there a skill that can...", exploring what skills exist locally
  or remotely, wanting to extend agent capabilities, needing to discover
  installed or available skills across all platforms and directories, or
  evaluating whether a skill exists before creating one from scratch.
  Trigger terms: find skill, search skill, discover skill, list skills,
  available skills, install skill, skill for, what skills, browse skills,
  skill search, skill discovery, skill catalog, skill registry.
---

# Ultra Find Skill

Skill discovery engine for OpenClaw/OpenCode. Searches local + remote
directories, evaluates results, guides installation.

## Installation

```bash
# OpenClaw (recommended)
cp -r ultra-find-skill/ ~/.openclaw/skills/ultra-find-skill/

# Cross-platform alternatives
cp -r ultra-find-skill/ ~/.agents/skills/ultra-find-skill/
cp -r ultra-find-skill/ <workspace>/.agents/skills/ultra-find-skill/
```

No external dependencies. Works out of the box.

## Setup

No configuration needed. Auto-detects agent platform.

**Optional environment variables:**
- `SKILLS_SEARCH_REMOTE=true` — Enable remote catalog search (default: true)
- `SKILLS_SEARCH_DEPTH=2` — Max directory depth for local scanning (default: 2)

## When to Use

- User asks "how do I do X" / "find a skill for X" / "is there a skill for X"
- User wants to know what skills are installed
- User wants to extend agent capabilities
- Before creating a new skill — check if one exists
- Compare/evaluate multiple skills for same purpose
- Audit or inventory installed skills

## When NOT to Use

- Task is simple — solve directly, skip skill search
- User already knows which skill to invoke
- User wants to CREATE or MODIFY a skill → use `ultra-create-skill`
- General knowledge question unrelated to skills

## How It Works

### Step 1: Evaluate Need

```
Is the task simple/contained?
  → YES: Solve directly. Skip skill search. Tell the user.
  → NO: Is the task complex, multi-domain, or recurring?
    → YES: Proceed to Step 2.
    → UNSURE: Proceed to Step 2, but note this to the user.
```

### Step 2: Search Locally

Scan all known local skill directories in precedence order.
See [references/skill-directories.md](references/skill-directories.md) for paths.

**Search algorithm:**
1. List all skill directories found on the system
2. For each skill found, parse YAML frontmatter (`name`, `description`, `tags`)
3. Match against the user's query using:
   - Exact name match (highest priority)
   - Description keyword match
   - Tag/category match
   - Fuzzy name match (lowest priority)
4. Rank results by relevance score

**Quick local scan command:**
```bash
# List all installed skills with descriptions
for dir in ~/.openclaw/skills/*/; do
  if [ -f "$dir/SKILL.md" ]; then
    name=$(basename "$dir")
    desc=$(grep -A1 "^description:" "$dir/SKILL.md" | tail -1 | sed 's/^  //')
    echo "[$name] $desc"
  fi
done
```

### Step 3: Search Remote (if local insufficient)

See [references/search-strategy.md](references/search-strategy.md) for details.

**Remote sources (priority order):**

| Priority | Source | Method |
|----------|--------|--------|
| 1 | skills.sh leaderboard | Check popular/battle-tested skills first |
| 2 | `npx skills find <query>` | CLI ecosystem search |
| 3 | GitHub topic search | `agent-skills`, `llm-tools`, `ai-agents` |
| 4 | Community catalogs | Antigravity, awesome-lists, curated registries |
| 5 | NPM/PyPI registry | Package keyword search |

### Step 4: Present & Evaluate Results

For each result, present:

```
┌─────────────────────────────────────────────┐
│ 🔍 [skill-name]                             │
│ Description: Brief description here         │
│ Source: local | github | npm | skills.sh     │
│ Score: 85/100 (if evaluated)                │
│ Platform: openclaw, opencode, claude-code    │
│ Install: cp -r ... or npx skills add ...    │
│ ⚠️ Security: [PASS/REVIEW] (pre-install)    │
└─────────────────────────────────────────────┘
```

Run security pre-check before recommending installation.
See [references/security-checklist.md](references/security-checklist.md).

**If nothing found**, suggest:
- Refine the search query with different keywords
- Use `ultra-create-skill` to build a custom skill
- Check if the task can be solved without a skill

## Architecture

```
ultra-find-skill/
├── SKILL.md                    ← Main instructions
├── references/
│   ├── search-strategy.md      ← Deep search algorithms & remote sources
│   ├── skill-directories.md    ← All known paths (cross-platform)
│   ├── evaluation-criteria.md  ← Scoring rubric for discovered skills
│   └── security-checklist.md   ← Pre-install security review steps
├── scripts/
│   ├── scan-local-skills.sh    ← Scan all local directories
│   └── validate-skill-structure.sh ← Validate found skill format
└── examples/
    ├── find-by-domain.md       ← Example: finding by domain
    └── find-and-install.md     ← Example: full discovery flow
```

## Allowed Tools

- `list_dir` — Scan skill directories
- `view_file` — Read SKILL.md frontmatter and content
- `grep_search` — Search within skill files for keywords
- `run_command` — Execute scan scripts, `npx skills find`, Git commands
- `read_url_content` — Fetch remote catalogs and skill content
- `search_web` — Search for skills on GitHub, npm, skills.sh

## Best Practices

1. Search locally first — remote search costs time and tokens
2. Parse frontmatter, don't guess — read actual `name` and `description`
3. Check precedence — higher-priority directory wins on ties
4. Evaluate before installing — use security checklist for remote skills
5. Suggest alternatives if exact skill doesn't exist
6. Report cross-platform findings — mention adaptability
7. Token efficiency — scan frontmatter only, don't load full SKILL.md
8. Cache results — remember previous searches in same session

## Reference

- **[Search Strategy](references/search-strategy.md)** — Remote search algorithms, API endpoints, ranking logic
- **[Skill Directories](references/skill-directories.md)** — All paths across 7 platforms with precedence rules
- **[Evaluation Criteria](references/evaluation-criteria.md)** — Quality scorecard (0-100)
- **[Security Checklist](references/security-checklist.md)** — Pre-installation security review

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-create-skill` | If no suitable skill found, create one from scratch |
| `ecosystem-steward` | The steward's `forge search` does similar but narrower searches |
| `skill-optimizer` | Optimize a found skill's description for better triggering |

## Pre-Flight Checklist

- [ ] What domain/task is the user trying to solve?
- [ ] Is this complex enough to warrant a skill?
- [ ] Platform preference? Local only or remote too?

## License

Apache-2.0. Model-agnostic. Synthesized from 32+ ecosystem sources.
