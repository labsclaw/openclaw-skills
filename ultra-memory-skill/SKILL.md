---
name: ultra-memory-skill
description: "Memory Caching for LLM Agents â€” zero-cost gated retrieval, auto-maintenance, and hybrid wiki architecture. arXiv 2602.24281."
---

# Ultra Memory Skill (Distilled)

Zero-cost memory architecture for LLM agents. Inspired by [Memory Caching: RNNs with Growing Memory](https://arxiv.org/abs/2602.24281) (Google, 2026).

**Components:** SSC Router (keyword/tag scoring), Health Check, Wiki Architecture (Hyper-Extract + qmd + agentmemory), Learning Signals, Tiered Storage (HOT/WARM/COLD), Self-Reflection. **91.4% token savings** per session.

## Quick Start

```powershell
.\scripts\setup.ps1
```
Then add SSC protocol to AGENTS.md (see `templates/AGENTS-template.md`).

## Learning Signals

**Corrections â†’** `memory/corrections.md`. Catch: "No, that's not right", "Actually it should be", "I prefer X not Y", "Remember I always...", "Stop doing X".
**Preferences â†’** segment or MEMORY.md. Catch: "I like when you", "Always/Never do X/Y", "My style is...".
**Patterns â†’** promote to HOT at 3x (repeated instructions, recurring workflows, user praise).
**Ignore:** one-time, context-specific, hypotheticals.

## Map is not the Territory

Prompts/skills/context = map. Codebase/system/edge cases = territory. Quality drops when agent hits unknown territory.

**Detect unknowns:** command fails unexpectedly, API/behavior differs, framework constraint not in skills, platform-specific behavior, tool mismatch, missing dependency.

| Type | Description | Action |
|------|-------------|--------|
| Known-Known | Agent has skill | Execute directly |
| Known-Unknown | Agent knows it doesn't know | Search â†’ log â†’ update skill |
| Unknown-Unknown | Agent doesn't know | Error â†’ classify â†’ search â†’ log |

**Auto-update trigger:** log to `memory/corrections.md` with `knowledge_gap` category when unknown blocks active goal, affects company ops, recurring (2+), or involves security/production.

```markdown
## [LRN-YYYYMMDD-XXX] knowledge_gap
**Logged**: ISO-8601 | **Priority**: high | **Status**: searching | **Area**: config|infra|backend
**Summary**: Agent lacked knowledge about [topic] | **Type**: known-unknown|unknown-unknown
**Search**: Query="[terms]", Source=[URL], Finding=[...], Confidence=0.0-1.0
**Resolution**: Resolved=timestamp, Updated=[skill/segment], Notes=[what changed]
```

## Tiered Storage

| Tier | Location | Size Limit | Behavior |
|------|----------|------------|----------|
| HOT | `memory/segments/` (tier: "HOT") | â‰¤100 lines | Always loaded |
| WARM | `memory/segments/` (tier: "WARM") | â‰¤200 lines | Load on context match |
| COLD | `memory/archive/` | Unlimited | On explicit query only |

**Promotion/Demotion:** 3x in 7d â†’ HOT. 30d unused â†’ WARM. 90d unused â†’ COLD. Never delete without confirmation.

```json
{
  "id": "s001", "file": "segments/s001-my-topic.md",
  "summary": "One-line description", "keywords": ["topic"], "tags": ["category"],
  "weight": 0.9, "tier": "HOT", "lastAccess": "2026-07-04T14:00:00",
  "accessCount": 5, "created": "2026-06-27"
}
```

## Self-Reflection
After significant work: compare outcome vs intent, identify improvements, check pattern â†’ log to `memory/corrections.md`.
```markdown
CONTEXT: [task type]
REFLECTION: [what I noticed]
LESSON: [what to do differently]
```
Promote to HOT after 3x successful applications.

## Namespace Isolation
- **Project** â†’ tag `project:{name}`. **Domain** (code, writing) â†’ tag `domain:{type}`. **Global** â†’ tag `global`.
- **Priority:** project > domain > global

## Memory Types

| Type | File | Purpose |
|------|------|---------|
| Semantic | `memory/semantic-patterns.json` | Abstract rules reusable across contexts |
| Episodic | `memory/episodic/YYYY-MM-DD-{skill}.json` | Specific experiences |
| Working | `memory/working/current_session.json` | Current session context |
| Procedural | `segments/` (tag `procedural`) | How-to knowledge (skills, workflows) |

**Semantic pattern format:**
```json
{"id":"pat-2026-07-04-001","name":"PowerShell head/tail avoidance","source":"user_feedback","confidence":0.95,"applications":3,"category":"powershell_syntax","pattern":"Use Select-Object instead of head/tail","solution":{"use":"Select-Object -First N"},"target_skills":["ultra-powershell-skill"]}
```

**Episodic:** `{"id":"ep-...","timestamp":"...","skill":"...","situation":"...","root_cause":"...","solution":"...","lesson":"...","confidence":0.0}`
**Working:** `{"session_id":"...","started":"...","active_skills":[],"pending_tasks":[],"context":"..."}`
**Evolution marker:** `<!-- Evolution: YYYY-MM-DD | source: ep-... | skill: ... -->`
**Confidence:** â‰¥0.8 promote, <0.5 review/archive.

## Chunking Strategies

| Strategy | Best For | Chunk Size | Notes |
|----------|----------|------------|-------|
| Fixed-size | General | 256-512 tokens | Baseline |
| Semantic | Quality retrieval | Variable | Splits by meaning |
| Structure-aware | Markdown/docs | Per heading | Respects hierarchy |
| Contextual | Complex docs | 256-512 tokens | Adds doc summary per chunk |
| Code-specific | Source code | 1000 chars | Function/class boundaries |

**Rule:** Chunk for retrieval, not storage.

## Background Memory Formation
Process memories async after conversations: conversation ends → session summary saved → background job (cron/idle) extracts insights → store to semantic/episodic → consolidate similar. Real-time extraction slows conversations; background yields higher quality.

## Memory Consolidation (Like Sleep)
Periodically merge duplicate/similar memories: list all → cluster by similarity (threshold 0.9) → merge clusters (preserve info, delete originals) → update index. **When:** weekly during health check or count exceeds threshold.

## Memory Decay
Score = (0.4 Ã— recency) + (0.3 Ã— frequency) + (0.3 Ã— importance). < 0.3 â†’ COLD. < 0.1 â†’ soft delete (mark only). â‰¥ 0.5 â†’ keep.

## Vector Store Reference
| Store | Scale | Cost | Hybrid | Best For |
|-------|-------|------|--------|----------|
| Pinecone | Billions | High | No | Enterprise |
| Qdrant | 100M+ | Med | Yes | Complex filtering |
| Weaviate | 100M+ | Med | Yes | Knowledge graphs |
| ChromaDB | 1M | Free | No | Prototyping |
| pgvector | 1M | Free | Yes | PostgreSQL |
| agentmemory | âˆž | Free | Yes | Our stack |

## Replay Learnings
Before starting a task: extract keywords â†’ search `corrections.md` + `semantic-patterns.json` â†’ classify by relevance â†’ include error context â†’ flag sessions >20% correction rate.

```markdown
REPLAY BRIEFING: <tarefa>
=======================
Aprendizados passados (ordenados por relevÃ¢ncia):
  1. [Categoria] DescriÃ§Ã£o (aplicado Nx) â€” Erro original: contexto
 HistÃ³rico similar: Data â€” N edits, X correÃ§Ãµes (Y%)
Abordagem sugerida: AÃ§Ã£o baseada no aprendizado #1
```

| SSC Router | Replay Learnings |
|-----------|------------------|
| Busca segments | Busca correÃ§Ãµes |
| Retorna resumo | Retorna contexto do erro |
| Score por keyword | Score por relevÃ¢ncia |
| Conhecimento | Evitar erros |

**Combined:** SessionStart â†’ SSC Router (knowledge) + Replay Learnings (errors) â†’ prepared session.

## Memory Insights & Analytics

**Hot learnings:** corrected 3+ times, never promoted â†’ promote. **Cold learnings:** accessCount=0 for 30+ days â†’ review.

```powershell
# Correction heatmap
Select-String -Path memory\corrections.md -Pattern "^\- \*\*" | Group-Object { $_.Line -replace '.*\*\*(\w+).*','$1' } | Sort-Object Count -Descending | ForEach-Object { Write-Host "  $($_.Name): $($_.Count) corrections" }
# Learning count
(Get-Content memory\semantic-patterns.json -Raw | ConvertFrom-Json).patterns.PSObject.Properties.Count
# Stale detection
(Get-Content memory\index.json -Raw | ConvertFrom-Json).segments | Where-Object { $_.accessCount -eq 0 } | Select-Object id, summary, lastAccess
```

## Wiki Research Patterns

| Flavor | Use | Example |
|--------|-----|--------|
| research | Topic exploration | "agent-memory" |
| paper | Deep dive | "karpathy-llm-wiki" |
| domain | Subject area | "llm-architectures" |
| product/product/tool KB | "openclaw" |
| person | Dossier | "karpathy" |
| project | Internal KB | "ultra-memory" |
| codebase | Repo KB | "paperclip" |

**Source tracking:** Every claim in wiki must cite. If can't, mark `> SPECULATION:`.
```markdown
## sources.md
| id | url | title | hash | fetched_at |
|----|-----|-------|------|------------|
| S001 | https://arxiv.org/abs/2602.24281 | Memory Caching | abc123 | 2026-06-26 |
```

**Convergence detection:** Jaccard overlap < 5% for 3 consecutive pages â†’ halt.
```powershell
function Test-Convergence {
    param([string[]]$recentPages, [double]$threshold = 0.05)
    $words = $recentPages | ForEach-Object { ($_ -split '\W+') | Where-Object { $_.Length -gt 3 } }
    $uniqueWords = $words | Sort-Object -Unique; $totalWords = $words.Count
    if ($totalWords -eq 0) { return $false }
    $overlap = ($uniqueWords | Measure-Object).Count / $totalWords
    return $overlap -lt $threshold
}
```

**Kill-switch:** `touch memory/STOP` â†’ loops check and halt.
**Seed queue:** `pending â†’ active â†’ done|failed`, BFS order (depth ASC, created_at ASC).


### HTML Viewer Concept
Single-file HTML export for sharing wikis: pages + sources + link graph in one file, no external deps, uploadable to S3, in-browser search.

**Research loop:** `.\scripts\research-loop.ps1 -Topic "LLM memory" -MaxPages 3 -BudgetSeconds 300`

## Skill Optimizer
Pipeline: rollout â†’ reflect â†’ aggregate â†’ select â†’ update â†’ evaluate â†’ gate.
```powershell
.\scripts\skill-optimizer.ps1 -DryRun                              # Preview
.\scripts\skill-optimizer.ps1 -SkillPath ".\SKILL.md"               # Apply
.\scripts\skill-optimizer.ps1 -MaxAdds 5 -MaxDeletes 3 -MaxReplaces 4
```
3+ same-category corrections â†’ add. Confidence<0.5 + never applied â†’ delete.

## Installation

### Option A: Minimal
```powershell
.\scripts\setup.ps1
```
Creates: `memory/index.json`, `ssc-router.ps1`, `ssc-health.ps1`, `segments/`, `checkpoints/`, `daily/`, `fixes/`.

### Option B: Complete (SSC + Wiki)
```powershell
.\scripts\setup.ps1 -Wiki -Cron
```
**Requirements:** `uv` (Hyper-Extract), `npm` (qmd + agentmemory).

### Option C: Manual
```powershell
New-Item ... -Path "memory\segments","memory\checkpoints","memory\daily","memory\fixes","memory\archive" -Force
Copy-Item .\scripts\ssc-*.ps1,.\examples\memory\index.json .\memory\
"# Corrections Log\n" | Set-Content .\memory\corrections.md -Encoding UTF8
```
See [MANUAL-INSTALL.md](MANUAL-INSTALL.md).

## Post-Setup: AGENTS.md Protocol
```markdown
### Session Startup Protocol (Gated Retrieval)
1. **Run SSC Router** â€” `powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "<relevant terms>"`
2. Scores by keyword/tag overlap, returns top-K, updates accessCount
3. Generate online memory from segments + MEMORY.md
4. DO NOT load all daily files â€” old O(L) pattern
5. DO NOT read segments manually â€” always use script
```

## Post-Setup: Cron Health Check
```json
{"name":"ssc-health-check","schedule":{"kind":"cron","expr":"0 3 * * *","tz":"America/Sao_Paulo"},"sessionTarget":"isolated","payload":{"kind":"agentTurn","message":"Run: powershell ...memory\\ssc-health.ps1\nIf HEALTHY, respond 'SSC health: OK'. If ATTENTION NEEDED, report issues."},"delivery":{"mode":"announce","channel":"telegram"}}
```

## Scripts Reference

**ssc-router.ps1:** `-Query "project deadline"` (find), `-List`, `-Stats`, `-DryRun` (preview).
**Scoring:** `(keyword_hits Ã— 2) + tag_hits + (weight Ã— 0.5)`

**ssc-health.ps1:** `-Quiet` for report file only; default = full report.

**setup.ps1:** `-Wiki` (SSC+wiki), `-Wiki -Cron` (adds cron), `-Force` (overwrite). Default: minimal.

## Wiki Architecture (Option B Only)

```
wiki/
â”œâ”€â”€ raw/              â† Immutable sources
â”œâ”€â”€ entities/         â† People, orgs, tools
â”œâ”€â”€ concepts/         â† Ideas, patterns
â”œâ”€â”€ sources/          â† Source summaries
â”œâ”€â”€ synthesis/        â† Multi-source analyses
â”œâ”€â”€ comparisons/      â† Side-by-side evals
â”œâ”€â”€ projects/         â† Active project pages
â””â”€â”€ checkpoints/      â† State snapshots
```

**Workflow:** Add sources to `wiki/raw/` â†’ `he parse source.pdf -t general/academic_graph -o ./output/` â†’ `he export obsidian ./output/ -o ./wiki/knowledge-abstracts/` â†’ `qmd collection add wiki --name wiki; qmd embed` â†’ MCP `memory_save`.

**Search:** `qmd search "memory caching"` (BM25), `qmd vsearch "hybrid architecture"` (vector), `qmd query "what is SSC?"` (hybrid).

## Creating Segments

### Manual
1. Create `memory/segments/s00N-topic.md`
2. Add to `memory/index.json`:
```json
{
  "id": "s001", "file": "segments/s001-my-topic.md",
  "summary": "One-line description", "keywords": ["topic"], "tags": ["category"],
  "weight": 0.9, "lastCheckpoint": null, "accessCount": 0, "created": "2026-06-27"
}
```

### Automatic
Agent creates segment + updates index.json when new topic emerges during conversation.

## Testing
Scripts must run from `memory/` directory after `setup.ps1`, NOT from `scripts/`. They use `$PSScriptRoot` to find `index.json`.

```powershell
# Correct
.\scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "test" -DryRun

# Wrong â€” no index.json in scripts/
powershell -ExecutionPolicy Bypass -File scripts\ssc-router.ps1 -Query "test"
```

## Wiki Maintenance
```powershell
.\scripts\wiki-health.ps1           # Full report
.\scripts\wiki-health.ps1 -Quiet     # Summary only
```
**Checks:** orphans, broken links, coverage. Report: `wiki/health-report.md`. Cron: Monday 8am.
**Orphan types:** knowledge-abstracts/, raw/, scripts/ â†’ leave. Standalone .md â†’ add wikilinks.
**Coverage:** â‰¥70% Healthy, 50-70% Acceptable, <50% Fix within 1 week.

## Troubleshooting
| Problem | Solution |
|---------|----------|
| `accessCount` not updating | Check write permissions on `index.json` |
| Encoding errors | Scripts use UTF8 â€” check no BOM |
| `qmd embed` slow first run | Normal â€” downloads 333MB GGUF (cached) |
| agentmemory won't start | Check `iii.exe` in PATH: `~\.local\bin\iii.exe` |
| Stale health check | Run `.\ssc-health.ps1` manually |

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚         Session Startup          â”‚
â”‚  "What do I need to remember?"   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚     SSC Router (ssc-router.ps1)  â”‚
â”‚  Query â†’ keyword/tag â†’ top-K     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”
       â–¼         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚segments â”‚ â”‚MEMORY.mdâ”‚
â”‚HOT/WARM â”‚ â”‚overview â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚
       â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Learning Signals + Self-Reflect â”‚
â”‚ Corrections â†’ log â†’ promote 3x  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
             â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   ssc-health.ps1 (daily cron)    â”‚
â”‚  Verify integrity, report issues â”‚
â”‚  Check tier promotion/demotion   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Logging

**Corrections** â†’ `memory/corrections.md`:
```markdown
# Corrections Log
> Last 50 corrections. Promote after 3x.
- **2026-07-04**: PowerShell syntax â€” Select-Object, not head
## Patterns (3x+)
- [ ] PowerShell: never head/tail
```

**Structured entries** (3 types):
| Type | File | Use Case |
|------|------|----------|
| LRN | `memory/learnings.md` | Corrections, knowledge gaps |
| ERR | `memory/errors.md` | Command failures |
| FEAT | `memory/feature-requests.md` | User-requested features |

```markdown
## [LRN-20260704-001] correction
**Logged**: 2026-07-04T14:00:00-03:00 | **Priority**: high | **Status**: resolved | **Area**: config
### Summary: PowerShell head/tail don't exist on Windows.
### Suggested Action: Use `Select-Object -First N`.
### Metadata
Source: user_feedback | Tags: powershell, syntax | Pattern-Key: powershell.head_tail | Recurrence-Count: 1
### Resolution: **Resolved**: 2026-07-04 | **Section**: ultra-powershell-skill SKILL.md 2.10
```

**Status:** pending â†’ in_progress â†’ resolved | promoted | wont_fix
**Promotion targets:** SOUL.md (behavior), AGENTS.md (workflow), TOOLS.md (gotchas), memory segments (knowledge).
**Recurring:** search for same Pattern-Key first; link entries; promote after 3x.

## References
- **Paper**: [Memory Caching: RNNs with Growing Memory](https://arxiv.org/abs/2602.24281) â€” Behrouz et al. (Google, 2026)
- **Organization**: [LabsClaw](https://github.com/labsclaw)

## License
MIT

