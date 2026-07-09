---
name: ultra-find-skill
description: >-
  Use when searching for agent skills, asking "how do I do X", "find a skill
  for X", or discovering installed/available skills across platforms. Trigger:
  find skill, search skill, discover skill, list skills, available skills,
  skill for, what skills, browse skills, skill search, skill catalog.
---

# Ultra Find Skill

Skill discovery engine. Searches local + remote directories, evaluates results, guides installation.

## Installation

```bash
cp -r ultra-find-skill/ ~/.openclaw/skills/ultra-find-skill/
cp -r ultra-find-skill/ ~/.agents/skills/ultra-find-skill/
```

No dependencies.

## When to Use

- User asks "how do I do X" / "find a skill for X"
- User wants to know what skills are installed
- Before creating a new skill — check if exists
- Compare/evaluate multiple skills
- Audit installed skills

## When NOT to Use

- Task is simple — solve directly
- User already knows which skill
- Use `ultra-create-skill` to CREATE/MODIFY

## Search Algorithm

1. List all skill directories on system
2. Parse YAML frontmatter (`name`, `description`, `tags`) for each skill
3. Match using: exact name > description keywords > tags > fuzzy name
4. Rank by relevance score

**Local scan:**
```bash
for dir in ~/.openclaw/skills/*/; do
  if [ -f "$dir/SKILL.md" ]; then
    name=$(basename "$dir")
    desc=$(grep -A1 "^description:" "$dir/SKILL.md" | tail -1 | sed 's/^  //')
    echo "[$name] $desc"
  fi
done
```

**Remote sources (priority):**

| Priority | Source | Method |
|----------|--------|--------|
| 1 | skills.sh leaderboard | Popular skills first |
| 2 | `npx skills find <query>` | CLI ecosystem |
| 3 | GitHub topic search | `agent-skills`, `llm-tools`, `ai-agents` |
| 4 | Community catalogs | Antigravity, awesome-lists |
| 5 | NPM/PyPI registry | Package keyword search |

## Result Format

```
🔍 [skill-name]
Description: Brief here
Source: local | github | npm | skills.sh
Score: 85/100
Platform: openclaw, opencode, claude-code
Install: cp -r ... or npx skills add ...
⚠️ Security: [PASS/REVIEW]
```

## Architecture

```
ultra-find-skill/
├── SKILL.md
├── references/
│   ├── search-strategy.md
│   ├── skill-directories.md
│   ├── evaluation-criteria.md
│   └── security-checklist.md
├── scripts/
│   ├── scan-local-skills.sh
│   └── validate-skill-structure.sh
└── examples/
    ├── find-by-domain.md
    └── find-and-install.md
```

## Allowed Tools

- `list_dir` — Scan skill directories
- `view_file` — Read SKILL.md frontmatter
- `grep_search` — Search skills for keywords
- `run_command` — Execute scan scripts, `npx skills find`
- `read_url_content` — Fetch remote catalogs
- `search_web` — Search GitHub/npm for skills

## Best Practices

1. Search locally first — remote costs time/tokens
2. Parse frontmatter, don't guess
3. Check precedence — higher-priority directory wins
4. Evaluate before installing — use security checklist
5. Suggest alternatives if no exact match
6. Token efficiency — frontmatter only, not full SKILL.md

## Reference

- [Search Strategy](references/search-strategy.md)
- [Skill Directories](references/skill-directories.md)
- [Evaluation Criteria](references/evaluation-criteria.md)
- [Security Checklist](references/security-checklist.md)

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `ultra-create-skill` | If no skill found, create one |
| `ecosystem-steward` | Narrower `forge search` |
| `skill-optimizer` | Optimize skill description |

## Pre-Flight Checklist

- [ ] Domain/task user solving?
- [ ] Complex enough for skill?
- [ ] Local or remote search?

## License

Apache-2.0.