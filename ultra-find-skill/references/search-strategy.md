# Search Strategy — Remote Skill Discovery

> Load this reference when local search doesn't satisfy the user's need.

---

## Remote Sources (Priority Order)

### 1. skills.sh Leaderboard

The [skills.sh](https://skills.sh/) leaderboard ranks skills by total installs,
surfacing the most popular and battle-tested options.

**When to check first**: Always — if a well-known skill exists here, it's
likely the best option.

**Top domains available:**
- Web development (React, Next.js, design)
- Testing and automation
- DevOps and deployment
- Data processing and analysis

### 2. CLI Ecosystem Search

```bash
npx skills find <query>          # Interactive search
npx skills find <query> --json   # Machine-readable output
npx skills add <package>         # Install from GitHub or registry
npx skills check                 # Check for updates
```

### 3. GitHub Topic Search

Search repositories with these topics:
- `agent-skills` — Primary topic for SKILL.md-based skills
- `llm-tools` — Broader LLM tooling
- `ai-agents` — Agent frameworks and skills
- `mcp-tools` — Model Context Protocol tools

**Search query templates:**
```
# GitHub search URL pattern
https://github.com/search?q=topic:agent-skills+<keyword>&type=repositories

# GitHub API
GET https://api.github.com/search/repositories?q=topic:agent-skills+<keyword>&sort=stars
```

**Key repositories to check:**
| Repository | Focus | Skills Count |
|-----------|-------|-------------|
| vercel-labs/skills | CLI framework + reference skills | Core framework |
| vercel-labs/agent-skills | React, Next.js, web design | 5+ skills |
| anthropics/skills | Skill creator, frontend design | 5+ skills |
| sanjay3290/ai-skills | Google Workspace, databases, Azure | 18+ skills |
| uxuiprinciples/agent-skills | UX/UI evaluation (168 principles) | 5 skills |
| LambdaTest/agent-skills | Testing frameworks (46+ skills) | 46+ skills |
| sickn33/antigravity-awesome-skills | Broad engineering skills | 50+ skills |
| MoizIbnYousaf/Ai-Agent-Skills | Skill management + 115 cataloged | 115+ skills |
| obra/superpowers | Meta-skills (writing, testing) | 10+ skills |

### 4. Community Catalogs

**Antigravity Master Catalog:**
```
https://raw.githubusercontent.com/sickn33/antigravity-awesome-skills/main/CATALOG.md
```

Categories: `architecture`, `business`, `data-ai`, `development`, `general`,
`infrastructure`, `security`, `testing`, `workflow`

### 5. Package Registries

**NPM search:**
```bash
npm search agent-skills
npm search --keywords="agent,skill,llm"
```

**PyPI search:**
```bash
pip search agent-skills  # or use pypi.org search
```

---

## Ranking Algorithm

For each discovered skill, calculate a relevance score:

```
final_score = (relevance × 0.4) + (quality × 0.3) + (maintenance × 0.2) + (popularity × 0.1)
```

| Factor | How to Evaluate | Score Range |
|--------|----------------|-------------|
| **Relevance** | How closely name + description match the query | 0-100 |
| **Quality** | Valid SKILL.md, examples present, documentation depth | 0-100 |
| **Maintenance** | Last commit date, open issues, responsiveness | 0-100 |
| **Popularity** | Stars, installs, forks | 0-100 |

---

## Search Query Optimization

**Broaden if no results:**
- "web scraping" → "scraping OR crawling OR extraction"
- "database" → "postgres OR mysql OR sql OR database"

**Narrow if too many results:**
- Add platform filter: "agent-skills openclaw"
- Add domain filter: "testing cypress"
- Add language: "python data-analysis"

---

## Result Presentation Format

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [skill-name]                           Score: 85/100 │
│ Description: Brief description of the skill             │
│ Source: github.com/owner/repo                           │
│ Platform: openclaw, opencode, claude-code               │
│ Last Updated: 2026-05-15 | Stars: 450 | License: MIT   │
│ Install: npx skills add owner/repo --skill skill-name   │
└─────────────────────────────────────────────────────────┘
```
