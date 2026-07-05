---
name: ultra-memory-skill
description: "Memory Caching for LLM Agents — zero-cost gated retrieval, auto-maintenance, and hybrid wiki architecture. arXiv 2602.24281."
---

# Ultra Memory Skill

Zero-cost memory architecture for LLM agents, inspired by [Memory Caching: RNNs with Growing Memory](https://arxiv.org/abs/2602.24281) (Google, 2026).

## What You Get

- **SSC Router** — keyword/tag scoring loads only relevant memory segments per query
- **Health Check** — daily filesystem integrity monitor (no LLM needed)
- **Wiki Architecture** — persistent markdown wiki with Hyper-Extract + qmd + agentmemory
- **Learning Signals** — automatic detection of corrections, preferences, and patterns (inspired by self-improving skill)
- **Tiered Storage** — HOT/WARM/COLD with automatic promotion/demotion rules
- **Self-Reflection** — post-task evaluation protocol for continuous improvement
- **91.4% token savings** per session in benchmarks

## Quick Start (5 minutes)

```powershell
# From this skill directory:
.\scripts\setup.ps1
```

This creates the memory structure and copies scripts. Then add the SSC protocol to your AGENTS.md (see `templates/AGENTS-template.md`).

## Learning Signals (from Self-Improving Skill)

Automatically detect and log these patterns:

### Corrections
Log when user corrects you or points out mistakes:
- "No, that's not right..."
- "Actually, it should be..."
- "You're wrong about..."
- "I prefer X, not Y"
- "Remember that I always..."
- "I told you before..."
- "Stop doing X"
- "Why do you keep..."

**Action:** Add to `memory/corrections.md`, evaluate for segment creation.

### Preference Signals
Log explicit preferences:
- "I like when you..."
- "Always do X for me"
- "Never do Y"
- "My style is..."
- "For [project], use..."

**Action:** Add to relevant segment or MEMORY.md if confirmed.

### Pattern Candidates
Track and promote after 3x:
- Same instruction repeated 3+ times
- Workflow that works well repeatedly
- User praises specific approach

**Action:** After 3x, promote to segment with `tier: "HOT"`.

### Ignore (Don't Log)
- One-time instructions ("do X now")
- Context-specific ("in this file...")
- Hypotheticals ("what if...")

## Map is not the Territory (from Thariq/Anthropic)

Inspired by [A Field Guide to Fable: Finding Your Unknowns](https://x.com/trq212/status/2073100352921215386) (Thariq Shihipar, Anthropic Claude Code team).

**Core principle:** Your prompts, skills, and context are the *map*. The real codebase, system constraints, and edge cases are the *territory*. When the agent hits unknown territory, quality drops.

### Unknown Detection

When the agent encounters any of these, classify as an **unknown**:
- Command fails with unexpected error
- API/behavior differs from learned knowledge
- Framework constraint not in current skills
- Platform-specific behavior (Windows vs Linux)
- Tool version incompatibility
- Missing prerequisite or dependency

### Unknown Classification

| Type | Description | Action |
|------|-------------|--------|
| **Known-Known** | Agent has skill/pattern for this | Execute directly |
| **Known-Unknown** | Agent knows it doesn't know | Search web → log → update skill |
| **Unknown-Unknown** | Agent doesn't know it doesn't know | Error occurs → classify → search → log |

### Web Search Trigger (Auto-Update)

When an unknown is **important for achieving an established objective**:

1. **Log the unknown** to `memory/corrections.md` with category `knowledge_gap`
2. **Search the web** for current information on the topic
3. **Synthesize** findings into actionable knowledge
4. **Update the relevant skill** or create a new segment
5. **Mark as resolved** in corrections.md

**Trigger conditions:**
- Unknown blocks progress on an active goal
- Unknown affects company operations (Paperclip, PRs, deployments)
- Unknown is a recurring pattern (2+ occurrences)
- Unknown involves security, data loss, or production systems

**Search format:**
```markdown
## [LRN-YYYYMMDD-XXX] knowledge_gap

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: searching
**Area**: config | infra | backend

### Summary
Agent lacked knowledge about [topic]

### Unknown Type
known-unknown | unknown-unknown

### Web Search
- Query: "[search terms]"
- Source: [URL]
- Finding: [what was learned]
- Confidence: 0.0-1.0

### Resolution
- **Resolved**: timestamp
- **Updated**: [skill/segment file]
- **Notes**: [what changed]
```

### Practical Example

```
2026-07-04: Agent used `head` in PowerShell → FAILED
  ↓
Classification: Unknown-Unknown (didn't know head doesn't exist in PS)
  ↓
Web Search: "PowerShell Select-Object head alternative"
  ↓
Finding: Use `Select-Object -First N`
  ↓
Action: Updated ultra-powershell-skill SKILL.md section 2.10
  ↓
Result: Never repeat this error
```

## Tiered Storage Architecture

| Tier | Location | Size Limit | Behavior |
|------|----------|------------|----------|
| HOT | `memory/segments/` (tier: "HOT") | ≤100 lines per segment | Always loaded via SSC Router |
| WARM | `memory/segments/` (tier: "WARM") | ≤200 lines per segment | Load on context match |
| COLD | `memory/archive/` | Unlimited | Load on explicit query only |

### Promotion/Demotion Rules

- **3x usage in 7 days** → Promote to HOT
- **30 days unused** → Demote to WARM
- **90 days unused** → Archive to COLD
- **Never delete** without user confirmation

### Segment Tier Field

Add `tier` field to `index.json` entries:

```json
{
  "id": "s001",
  "file": "segments/s001-my-topic.md",
  "summary": "One-line description",
  "keywords": ["topic", "related"],
  "tags": ["category"],
  "weight": 0.9,
  "tier": "HOT",
  "lastAccess": "2026-07-04T14:00:00",
  "accessCount": 5,
  "created": "2026-06-27"
}
```

## Self-Reflection Protocol

After completing significant work, pause and evaluate:

1. **Did it meet expectations?** — Compare outcome vs intent
2. **What could be better?** — Identify improvements for next time
3. **Is this a pattern?** — If yes, log to `memory/corrections.md`

### When to Self-Reflect
- After completing a multi-step task
- After receiving feedback (positive or negative)
- After fixing a bug or mistake
- When you notice your output could be better

### Log Format

```markdown
CONTEXT: [type of task]
REFLECTION: [what I noticed]
LESSON: [what to do differently]
```

### Promotion Rule
Self-reflection entries follow same promotion rules: 3x applied successfully → promote to HOT tier.

## Namespace Isolation

- **Project patterns** → `memory/segments/` with tag `project:{name}`
- **Domain patterns** (code, writing, comms) → `memory/segments/` with tag `domain:{type}`
- **Global preferences** → `memory/segments/` with tag `global`

**Priority:** project > domain > global (most specific wins)

## Multi-Memory Architecture (from charon-fan/agent-playbook)

Inspired by cognitive science research, implement three memory types:

### Semantic Memory
**Location:** `memory/semantic-patterns.json`
**Purpose:** Abstract patterns and rules reusable across contexts
**Format:**
```json
{
  "patterns": {
    "pat-2026-07-04-001": {
      "id": "pat-2026-07-04-001",
      "name": "PowerShell head/tail avoidance",
      "source": "user_feedback",
      "confidence": 0.95,
      "applications": 3,
      "created": "2026-07-04",
      "category": "powershell_syntax",
      "pattern": "Use Select-Object instead of head/tail",
      "problem": "head/tail don't exist in PowerShell",
      "solution": {"use": "Select-Object -First N"},
      "target_skills": ["ultra-powershell-skill"]
    }
  }
}
```

### Episodic Memory
**Location:** `memory/episodic/YYYY-MM-DD-{skill}.json`
**Purpose:** Specific experiences and what happened
**Format:**
```json
{
  "id": "ep-2026-07-04-001",
  "timestamp": "2026-07-04T14:00:00-03:00",
  "skill": "ultra-powershell-skill",
  "situation": "Agent used head in PowerShell pipeline",
  "root_cause": "Bash syntax in PowerShell",
  "solution": "Select-Object -First N",
  "lesson": "Never use head/tail in PowerShell",
  "confidence": 0.95
}
```

### Working Memory
**Location:** `memory/working/current_session.json`
**Purpose:** Current session context
**Format:**
```json
{
  "session_id": "dfde104d-aab7-44b4-8df5-ba71b7104680",
  "started": "2026-07-04T09:59:00-03:00",
  "active_skills": ["ultra-memory-skill"],
  "pending_tasks": ["PR #8084 monitoring"],
  "context": "Paper v0.3 update, self-improving integration"
}
```

### Evolution Markers
Track changes with source attribution:
```markdown
<!-- Evolution: 2026-07-04 | source: ep-2026-07-04-001 | skill: ultra-memory -->
```

### Confidence Tracking
- Each pattern has `confidence` (0.0-1.0)
- Updated based on applications and feedback
- High confidence (≥0.8) → promote to segment
- Low confidence (<0.5) → review or archive

## Procedural Memory (from agent-memory-systems/CoALA)

Third memory type: **how-to knowledge** (rules, skills, workflows).

| Memory Type | CoALA Name | Ultra-Memory Location | Purpose |
|-------------|------------|----------------------|--------|
| Semantic | Semantic | `semantic-patterns.json` | Facts, rules, patterns |
| Episodic | Episodic | `episodic/` | Experiences, events |
| Working | Working | `working/` | Current session context |
| **Procedural** | Procedural | `segments/` (tag: `procedural`) | Skills, workflows, how-to |

**Procedural segment format:**
```json
{
  "id": "s010",
  "file": "segments/s010-powershell-patterns.md",
  "summary": "PowerShell syntax patterns and anti-patterns",
  "tags": ["procedural", "powershell", "syntax"],
  "tier": "HOT",
  "patterns": [
    {"task": "Select first N items", "solution": "Select-Object -First N"},
    {"task": "Redirect stderr", "solution": "2>$null"}
  ]
}
```

## Chunking Strategies (from agent-memory-systems)

When processing documents for memory storage:

| Strategy | Best For | Chunk Size | Notes |
|----------|----------|------------|-------|
| Fixed-size | General use | 256-512 tokens | Baseline, simple |
| Semantic | High-quality retrieval | Variable | Splits by meaning |
| Structure-aware | Markdown/docs | Per heading | Respects hierarchy |
| Contextual | Complex documents | 256-512 tokens | Adds doc summary to each chunk |
| Code-specific | Source code | 1000 chars | Respects function/class boundaries |

**Rule:** Chunk for retrieval, not for storage.

## Background Memory Formation

Process memories asynchronously after conversations:

1. **Conversation ends** → session summary saved
2. **Background job** (cron or idle timeout) → extract insights
3. **Store** to semantic/episodic memory
4. **Consolidate** similar memories

**Why:** Real-time extraction slows conversations. Background processing yields higher quality.

## Memory Consolidation (Like Sleep)

Periodically merge duplicate/similar memories:

```
1. List all memories in namespace
2. Cluster by similarity (threshold: 0.9)
3. For each cluster:
   a. Merge into single memory
   b. Preserve all important info
   c. Delete originals
4. Update index
```

**When:** Weekly during health check, or when memory count exceeds threshold.

## Memory Decay

Not all memories should live forever. Decay based on:

| Factor | Weight | Decay Rule |
|--------|--------|------------|
| Recency | 0.4 | Days since last access |
| Frequency | 0.3 | Times retrieved |
| Importance | 0.3 | Confidence score |

**Decay score** = (0.4 × recency) + (0.3 × frequency) + (0.3 × importance)

- Decay score < 0.3 → archive to COLD
- Decay score < 0.1 → soft delete (mark, don't remove)
- Decay score ≥ 0.5 → keep in current tier

## Vector Store Reference

| Store | Scale | Cost | Hybrid Search | Best For |
|-------|-------|------|---------------|----------|
| Pinecone | Billions | High | No | Enterprise, managed |
| Qdrant | 100M+ | Medium | Yes | Complex filtering |
| Weaviate | 100M+ | Medium | Yes | Knowledge graphs |
| ChromaDB | 1M | Free | No | Prototyping |
| pgvector | 1M | Free | Yes | PostgreSQL users |
| agentmemory | Unlimited | Free | Yes | Our stack (local) |

## Replay Learnings (from rohitg00/pro-workflow)

"Memória muscular" — buscar aprendizados relevantes antes de começar uma tarefa.

### Workflow

1. **Extrair keywords** da descrição da tarefa
   - "auth refactor" → `auth`, `middleware`, `refactor`
   - "deploy pipeline" → `deploy`, `ci`, `pipeline`
2. **Buscar** em `corrections.md` e `semantic-patterns.json`
3. **Classificar** por relevância, não por data
4. **Incluir contexto do erro** — não só o que aprender, mas *por que errou*
5. **Flag** sessões com alta taxa de correção (>20%)

### Output Format

```markdown
REPLAY BRIEFING: <tarefa>
=======================

Aprendizados passados (ordenados por relevância):
  1. [Categoria] Descrição (aplicado Nx)
     Erro original: contexto do que deu errado
  2. [Categoria] Descrição (aplicado Nx)
     Erro original: contexto

Histórico similar:
  - Data: tarefa — N edits, X correções (Y% taxa)
    ^ Taxa alta — revisar padrões antes de começar

Abordagem sugerida:
  - Ação baseada no aprendizado #1
  - Ação baseada no aprendizado #2
```

### Integração com SSC Router

O SSC Router já faz busca por keyword/tag. O Replay Learnings complementa:

| SSC Router | Replay Learnings |
|-----------|------------------|
| Busca segments | Busca correções |
| Retorna resumo | Retorna contexto do erro |
| Score por keyword | Score por relevância |
| Para conhecimento | Para evitar erros |

**Uso combinado:** SessionStart → SSC Router (conhecimento) + Replay Learnings (erros) → sessão preparada.

## Memory Insights & Analytics (from rohitg00/pro-workflow)

Surface patterns from learnings and session history.

### Correction Heatmap

Visual representation of corrections by category:

```
Correction Heatmap (all time)

  ████████████ PowerShell    12 corrections
  ████████     Config        8 corrections
  ██████       Git           6 corrections
  ████         Cron          4 corrections
```

**Hot learnings** (most corrected, least learned):
- Patterns corrected 3+ times but never promoted to segment
- Action: Promote to segment or create dedicated skill

**Cold learnings** (learned but never applied):
- Patterns in segments with accessCount = 0 for 30+ days
- Action: Review relevance, consider archiving

### Learning Analytics

```markdown
Learning Insights (N total)

Top categories:
  Category      N learnings (X%)
  Category      N learnings (X%)

Most applied:
  #ID [Category] Description — N times applied

Stale learnings (never applied):
  #ID [Category] Description — 0 times (N days old)
```

### Productivity Metrics

```markdown
Productivity (last N sessions)
  Avg session: X min
  Avg edits/session: N
  Correction rate: X% (improving|stable|worsening)
  Learning capture: N per session
```

### How to Generate

```powershell
# Correction heatmap from corrections.md
Select-String -Path memory\corrections.md -Pattern "^\- \*\*" | 
  Group-Object { $_.Line -replace '.*\*\*(\w+).*','$1' } | 
  Sort-Object Count -Descending | 
  ForEach-Object { Write-Host "  $($_.Name): $($_.Count) corrections" }

# Learning count from semantic-patterns.json
(Get-Content memory\semantic-patterns.json -Raw | ConvertFrom-Json).patterns.PSObject.Properties.Count

# Stale detection from index.json
(Get-Content memory\index.json -Raw | ConvertFrom-Json).segments | 
  Where-Object { $_.accessCount -eq 0 } | 
  Select-Object id, summary, lastAccess
```

### Integration with Health Check

The weekly `wiki-health-check` cron can also report:
- Correction count since last check
- New patterns added
- Stale patterns (no access in 30+ days)
- Coverage trend (improving/declining)

## Wiki Research Patterns (from rohitg00/pro-workflow)

Advanced wiki management patterns for auto-growing knowledge bases.

### Wiki Flavors

| Flavor | Use For | Example |
|--------|---------|--------|
| research | Ongoing topic exploration | "agent-memory" |
| paper | One-paper deep dive | "karpathy-llm-wiki" |
| domain | Broad subject area | "llm-architectures" |
| product | Product/tool KB | "openclaw" |
| person | Researcher dossier | "karpathy" |
| organization | Company profile | "anthropic" |
| project | Internal project KB | "ultra-memory" |
| codebase | Repo-aware KB | "paperclip" |
| incident | Post-mortem KB | "telegram-outage" |

### Source Tracking (Provenance)

Every claim in the wiki must cite a source:

```markdown
## sources.md
| id | url | title | hash | fetched_at |
|----|-----|-------|------|------------|
| S001 | https://arxiv.org/abs/2602.24281 | Memory Caching | abc123 | 2026-06-26 |
```

**Rule:** No uncited claims in wiki pages. If you can't cite it, mark as `> SPECULATION:`.

### Convergence Detection

Stop auto-research when content stops being novel:

1. After each new page, compute Jaccard overlap with prior 3 pages
2. If < 5% novel content for 3 consecutive pages → halt
3. Report: "Converged after N pages, M unique claims"

**Implementation (free-tier):** Word-level Jaccard, no LLM needed.

```powershell
# Simple convergence check
function Test-Convergence {
    param([string[]]$recentPages, [double]$threshold = 0.05)
    
    $words = $recentPages | ForEach-Object { ($_ -split '\W+') | Where-Object { $_.Length -gt 3 } }
    $uniqueWords = $words | Sort-Object -Unique
    $totalWords = $words.Count
    
    if ($totalWords -eq 0) { return $false }
    
    $overlap = ($uniqueWords | Measure-Object).Count / $totalWords
    return $overlap -lt $threshold
}
```

### Kill-Switch

Graceful halt for any auto-loop:

```powershell
# Stop file
touch ~/.openclaw/workspace/memory/STOP

# Check in any loop
if (Test-Path (Join-Path $memoryDir "STOP")) {
    Write-Host "Kill-switch detected. Halting."
    Remove-Item (Join-Path $memoryDir "STOP")
    break
}
```

### Seed Queue (BFS Research)

Track research topics to explore:

```json
{
  "seeds": [
    {
      "id": "seed-001",
      "query": "memory consolidation in agents",
      "status": "pending",
      "depth": 0,
      "parent_id": null
    }
  ]
}
```

**Status flow:** pending → active → done | failed

**Pop order:** depth ASC, created_at ASC (breadth-first)

### HTML Viewer Concept

Single-file HTML export for sharing wikis:
- Pages + sources + link graph in one file
- No external dependencies
- Uploadable to S3, shareable via URL
- In-browser search

**When:** After auto-research run, before sharing with team.

## Skill Optimizer (from rohitg00/pro-workflow)

Self-improvement loop: the skill learns from accumulated corrections and proposes patches to itself.

**Inspired by:** Microsoft SkillOpt (arXiv:2605.23904) - adapted to free-tier stack.

### Pipeline

```text
rollout      pull corrections from corrections.md
reflect      analyze patterns, propose add/delete/replace patches
aggregate    merge patches across batches
select       apply budget limits (3 adds, 2 deletes, 3 replaces)
update       apply patches to SKILL.md
evaluate     score improvement
gate         accept only if score improves
```

### Usage

```powershell
# Dry run (preview patches without applying)
.\scripts\skill-optimizer.ps1 -DryRun

# Apply patches to SKILL.md
.\scripts\skill-optimizer.ps1 -SkillPath ".\SKILL.md"

# Custom budget
.\scripts\skill-optimizer.ps1 -MaxAdds 5 -MaxDeletes 3 -MaxReplaces 4
```

### What It Does

1. **Finds repeated patterns** (3+ corrections in same category) -> proposes to add rule
2. **Finds stale patterns** (confidence < 0.5, never applied) -> proposes to delete
3. **Logs runs** to `optimization-history.json` for tracking

### Example Output

```
>> Stage 1: Rollout - Extracting corrections
   [OK] Found 7 correction entries

>> Stage 2: Reflect - Analyzing corrections for patterns
   [OK] Categories found: powershell, config, git
   [OK] Patches proposed: 2

>> Stage 6: Evaluate - Scoring improvement
   [OK] Score: 7 -> 9 (+28.6%)

>> Stage 7: Gate - Decision
   [OK] ACCEPTED - 2 patches applied
```

### Integration with Cron

Run weekly via cron to keep skills evolving:
```json
{
  "name": "skill-optimizer-weekly",
  "schedule": { "kind": "cron", "expr": "0 3 * * 0", "tz": "America/Sao_Paulo" },
  "payload": { "kind": "agentTurn", "message": "Run skill optimizer on ultra-memory-skill" }
}
```

## Full Installation

### Option A: Minimal (SSC Only)

Just the router and health check — no wiki dependencies:

```powershell
.\scripts\setup.ps1
```

What you get:
- `memory/index.json` — SSC router config
- `memory/ssc-router.ps1` — query-time segment scoring
- `memory/ssc-health.ps1` — daily health check
- `memory/segments/`, `checkpoints/`, `daily/`, `fixes/` directories

### Option B: Complete (SSC + Wiki)

Full hybrid architecture with knowledge extraction and vector search:

```powershell
.\scripts\setup.ps1 -Wiki -Cron
```

This additionally installs:
- **Hyper-Extract** — automated knowledge extraction (80+ templates)
- **qmd** — hybrid search engine (BM25 + Vector + Reranking)
- **agentmemory** — vector store with triple-stream retrieval
- Wiki directory structure (entities, concepts, sources, synthesis)
- qmd index initialization
- agentmemory initialization

**Requirements for Option B:**
- `uv` (for Hyper-Extract): `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`
- `npm` (for qmd + agentmemory): comes with Node.js

### Option C: Manual

If you prefer step-by-step:

```powershell
# 1. Create directories
New-Item -ItemType Directory -Path ".\memory\segments" -Force
New-Item -ItemType Directory -Path ".\memory\checkpoints" -Force
New-Item -ItemType Directory -Path ".\memory\daily" -Force
New-Item -ItemType Directory -Path ".\memory\fixes" -Force
New-Item -ItemType Directory -Path ".\memory\archive" -Force

# 2. Copy scripts
Copy-Item .\scripts\ssc-router.ps1 .\memory\
Copy-Item .\scripts\ssc-health.ps1 .\memory\
Copy-Item .\scripts\ssc-promote.ps1 .\memory\  # Tier promotion/demotion

# 3. Copy index.json template
Copy-Item .\examples\memory\index.json .\memory\

# 4. Create corrections.md
"# Corrections Log\n\n> Last 50 corrections. Promote to segment after 3x pattern.\n" | Set-Content .\memory\corrections.md -Encoding UTF8

# 5. Add SSC protocol to AGENTS.md (see templates/AGENTS-template.md)
```

For complete step-by-step instructions, see [MANUAL-INSTALL.md](MANUAL-INSTALL.md).

## Post-Setup: AGENTS.md Protocol

After setup, add this to your AGENTS.md (copy from `templates/AGENTS-template.md`):

```markdown
### Session Startup Protocol (Gated Retrieval)

1. **Run SSC Router** — `powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "<relevant terms>"`
2. The script scores segments by keyword/tag overlap, returns top-K, and updates accessCount
3. **Generate online memory** from returned segments + MEMORY.md
4. **DO NOT load all daily files** — that's the old O(L) pattern
5. **DO NOT read segments manually** — always use the script
```

## Post-Setup: Cron Health Check

Add a daily cron job for automated health monitoring:

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: powershell -ExecutionPolicy Bypass -File <workspace>\\memory\\ssc-health.ps1\nIf HEALTHY, respond 'SSC health: OK'. If ATTENTION NEEDED, report issues."
  },
  "delivery": { "mode": "announce", "channel": "telegram" }
}
```

## Scripts Reference

### ssc-router.ps1 — Query Memory

```powershell
.\ssc-router.ps1 -Query "project deadline"    # Find relevant segments
.\ssc-router.ps1 -List                         # List all segments
.\ssc-router.ps1 -Stats                        # Show access counts
.\ssc-router.ps1 -Query "test" -DryRun         # Preview without updating counts
```

**Scoring:** `score = (keyword_hits × 2) + tag_hits + (weight × 0.5)`

### ssc-health.ps1 — Health Check

```powershell
.\ssc-health.ps1                               # Full health report
.\ssc-health.ps1 -Quiet                        # Report file only
```

**Monitors:** segment count consistency, daily log freshness, checkpoint integrity, total size, last maintenance date.

### setup.ps1 — Full Setup

```powershell
.\setup.ps1                                    # Minimal (SSC only)
.\setup.ps1 -Wiki                              # SSC + wiki ecosystem
.\setup.ps1 -Wiki -Cron                        # SSC + wiki + cron config
.\setup.ps1 -Force                             # Overwrite existing files
```

## Wiki Architecture (Option B)

If you installed with `-Wiki`, you also get:

### Directory Structure

```
wiki/
├── raw/                   ← Immutable source documents
├── entities/              ← People, organizations, tools
├── concepts/              ← Ideas, patterns, techniques
├── sources/               ← Summaries of ingested sources
├── synthesis/             ← Multi-source analyses
├── comparisons/           ← Side-by-side evaluations
├── projects/              ← Active project pages
└── checkpoints/           ← Wiki state snapshots
```

### Workflow

1. **Add sources** to `wiki/raw/` (PDFs, articles, notes)
2. **Extract knowledge**: `he parse source.pdf -t general/academic_graph -o ./output/`
3. **Export to wiki**: `he export obsidian ./output/ -o ./wiki/knowledge-abstracts/`
4. **Index for search**: `qmd collection add wiki --name wiki; qmd embed`
5. **Import to agentmemory**: via MCP `memory_save` for vector retrieval

### Search Commands

```powershell
qmd search "memory caching"           # BM25 keyword search
qmd vsearch "hybrid architecture"     # Vector semantic search
qmd query "what is SSC?"              # Hybrid (BM25 + Vector + LLM reranking)
```

## Creating Segments

### Manual

1. Create `memory/segments/s00N-topic.md` (use format from `examples/`)
2. Add entry to `memory/index.json`:

```json
{
  "id": "s001",
  "file": "segments/s001-my-topic.md",
  "summary": "One-line description for router display",
  "keywords": ["topic", "related", "terms"],
  "tags": ["category", "type"],
  "weight": 0.9,
  "lastCheckpoint": null,
  "accessCount": 0,
  "created": "2026-06-27"
}
```

### Automatic

When a new topic emerges during conversation, the agent creates the segment and updates index.json. The router picks it up on next query.

## Testing

**IMPORTANT:** Scripts must be tested from the `memory/` directory after running `setup.ps1`, NOT from the `scripts/` directory.

The scripts use `$PSScriptRoot` to find `index.json` in the same directory. When copied to `memory/` by `setup.ps1`, the `index.json` is also there.

### Correct test flow

```powershell
# 1. Run setup first (creates memory/ structure)
.\scripts\setup.ps1

# 2. Test from memory/ directory
powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "test" -DryRun
powershell -ExecutionPolicy Bypass -File memory\ssc-health.ps1
```

### Wrong test flow (will fail)

```powershell
# This will fail — no index.json in scripts/ directory
powershell -ExecutionPolicy Bypass -File scripts\ssc-router.ps1 -Query "test"
```

## Wiki Maintenance

### Health Check Script

Automated graph connectivity monitor:

```powershell
.\scripts\wiki-health.ps1              # Full report
.\scripts\wiki-health.ps1 -Quiet        # Summary only
```

**Checks:**
- Orphan files (no wikilinks in/out)
- Broken links in index.md
- Link coverage percentage
- Saves report to `wiki/health-report.md`

**Cron:** Runs every Monday at 8am (`wiki-health-check`).
- Reports orphan count, coverage %, broken links
- Alerts Dr. Roger if coverage drops below 50%

### Orphan File Types

| Type | Action | Why |
|------|--------|-----|
| `knowledge-abstracts/**` | Leave as-is | Hyper-Extract output, not wiki nodes |
| `raw/**` | Leave as-is | Immutable source documents |
| `scripts/**` | Leave as-is | Tooling, not knowledge nodes |
| Standalone `.md` | Add wikilinks | Should connect to wiki graph |

### Manual Cleanup Procedure

1. Run health check to identify orphans
2. For each orphan, determine if it should:
   - **Link out**: Add `## Related` section with `[[wikilinks]]`
   - **Be linked**: Add entry to `index.md`
   - **Stay orphan**: Document why (e.g., raw source, internal output)
3. For broken links: create missing file or remove link
4. Re-run health check to confirm improvement

### Coverage Targets

| Coverage | Status | Action |
|----------|--------|--------|
| ≥70% | Healthy | No action needed |
| 50-70% | Acceptable | Review orphans quarterly |
| <50% | Needs attention | Clean up within 1 week |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `accessCount` not updating | Script needs write access to `index.json` — check permissions |
| Encoding errors on Windows | Scripts use `-Encoding UTF8` — ensure files aren't BOM-encoded |
| `qmd embed` slow first run | Normal — downloads 333MB GGUF model, cached after first run |
| agentmemory won't start | Check if `iii.exe` is in PATH: `~\.local\bin\iii.exe` |
| Health check reports stale data | Run `.\ssc-health.ps1` manually to see current state |

## Architecture

```
┌─────────────────────────────────────────────┐
│              Session Startup                 │
│  "What do I need to remember right now?"     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           SSC Router (ssc-router.ps1)        │
│  Query → keyword/tag scoring → top-K match   │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  segments/   │    │  MEMORY.md   │
│  HOT/WARM    │    │  (overview)  │
│  s001-*.md   │    └──────────────┘
└──────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│     Learning Signals + Self-Reflection       │
│  Detect corrections → log → promote 3x      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│        ssc-health.ps1 (daily cron)           │
│  Verify integrity, report anomalies          │
│  Check tier promotion/demotion rules         │
└─────────────────────────────────────────────┘
```

## Corrections Log Format

`memory/corrections.md` — last 50 corrections:

```markdown
# Corrections Log

> Last 50 corrections. Promote to segment after 3x pattern.

## Recent

- **2026-07-04**: User corrected PowerShell syntax — use Select-Object, not head
- **2026-07-04**: User corrected cron frequency — 1x/day, not 1x/hour

## Patterns (3x+)

- [ ] PowerShell: never use head/tail — use Select-Object
- [ ] Always check mergeStateStatus before reporting PR ready
```

## Structured Logging (from pskoett/self-improving-agent)

For detailed tracking, use structured entry format:

### Entry Types

| Type | File | Use Case |
|------|------|----------|
| LRN | `memory/learnings.md` | Corrections, knowledge gaps, best practices |
| ERR | `memory/errors.md` | Command failures, exceptions |
| FEAT | `memory/feature-requests.md` | User-requested capabilities |

### Entry Format

```markdown
## [LRN-20260704-001] correction

**Logged**: 2026-07-04T14:00:00-03:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
PowerShell head/tail commands don't exist on Windows.

### Details
Agent used `head -20` in PowerShell pipeline. Failed with command not found.

### Suggested Action
Use `Select-Object -First N` instead of `head`.

### Metadata
- Source: user_feedback
- Tags: powershell, syntax
- Pattern-Key: powershell.head_tail
- Recurrence-Count: 1
- First-Seen: 2026-07-04

### Resolution
- **Resolved**: 2026-07-04T14:01:00-03:00
- **Section**: ultra-powershell-skill SKILL.md 2.10
- **Notes**: Added GitHub CLI PowerShell patterns section
```

### Status Values

- `pending` — not yet addressed
- `in_progress` — being worked on
- `resolved` — fixed
- `promoted` — elevated to segment or workspace file
- `wont_fix` — decided not to address

### Promotion Rules

When a learning proves broadly applicable:
1. Distill into concise rule
2. Add to appropriate segment or workspace file
3. Update status: `pending` → `promoted`
4. Add promotion target

**Promotion targets:**
- Behavioral patterns → SOUL.md
- Workflow improvements → AGENTS.md
- Tool gotchas → TOOLS.md
- Knowledge → memory segments

### Recurring Pattern Detection

- Search first: check if similar entry exists
- Link entries: add `See Also` reference
- Bump priority if recurring
- After 3x with same Pattern-Key → promote to segment

## References

- **Paper**: [Memory Caching: RNNs with Growing Memory](https://arxiv.org/abs/2602.24281) — Behrouz et al. (Google, 2026)
- **Implementation**: Dr. Roger Oliveira + Justus (AI Agent)
- **Organization**: [LabsClaw](https://github.com/labsclaw)

## License

MIT
