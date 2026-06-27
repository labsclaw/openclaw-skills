# Manual Installation — Ultra Memory Skill

Step-by-step guide to set up the complete Memory Caching system without running the automated `setup.ps1` script.

---

## Prerequisites

- **PowerShell** 5.1+ (Windows) or PowerShell 7+ (cross-platform)
- **OpenClaw** installed and configured
- **Workspace directory** at `~/.openclaw/workspace/` (or custom `$OPENCLAW_WORKSPACE`)

For wiki features (optional):
- **Node.js** 18+ (`npm` comes with it)
- **uv** Python package manager (`pip install uv`)

---

## Part 1: Core Memory System (SSC)

### Step 1.1 — Create Directory Structure

```powershell
# Navigate to your workspace
cd ~/.openclaw/workspace

# Create memory directories
New-Item -ItemType Directory -Path "memory" -Force
New-Item -ItemType Directory -Path "memory\segments" -Force
New-Item -ItemType Directory -Path "memory\checkpoints" -Force
New-Item -ItemType Directory -Path "memory\daily" -Force
New-Item -ItemType Directory -Path "memory\fixes" -Force
```

### Step 1.2 — Copy SSC Scripts

Copy these files from the skill to your `memory/` directory:

| Source | Destination |
|--------|-------------|
| `ultra-memory-skill/scripts/ssc-router.ps1` | `memory/ssc-router.ps1` |
| `ultra-memory-skill/scripts/ssc-health.ps1` | `memory/ssc-health.ps1` |

```powershell
# Example (adjust source path to your clone location)
Copy-Item "C:\path\to\openclaw-skills\ultra-memory-skill\scripts\ssc-router.ps1" ".\memory\"
Copy-Item "C:\path\to\openclaw-skills\ultra-memory-skill\scripts\ssc-health.ps1" ".\memory\"
```

### Step 1.3 — Create index.json

Create `memory/index.json` with this content:

```json
{
  "version": "1.0",
  "description": "Sparse Selective Cache (SSC) — Memory Caching",
  "created": "2026-06-27",
  "lastMaintenance": null,
  "segments": [],
  "config": {
    "maxSegmentsPerQuery": 6,
    "minWeightThreshold": 0.3,
    "autoCompressAfterDays": 30,
    "autoMergeSimilarityThreshold": 0.85,
    "maintenanceSchedule": "during-heartbeat"
  }
}
```

### Step 1.4 — Create MEMORY.md

Create `MEMORY.md` in your workspace root:

```markdown
# MEMORY.md — Online Memory (auto-generated)

> **Architecture**: Memory Caching (inspired by arXiv 2602.24281)
> **Last updated**: [today's date]
> **Active segments**: 0

## Relevant Segments (load on demand)

| ID | Segment | Status | Relevance |
|----|---------|--------|-----------|

## Recent Events

## Important Rules

---

> This file is auto-generated from segments in `memory/segments/`.
> Do not edit directly — update segments and run maintenance.
```

### Step 1.5 — Add SSC Protocol to AGENTS.md

Append this section to your existing `AGENTS.md` file:

```markdown
## Memory — MC Architecture (Memory Caching)

> Inspired by *Memory Caching: RNNs with Growing Memory* (arXiv 2602.24281)

You wake up fresh each session. These files are your continuity.

### Session Startup Protocol (Gated Retrieval)

1. **Run SSC Router** — `powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "<relevant terms>"`
2. The script scores segments by keyword/tag overlap, returns top-K, and updates accessCount
3. **Generate online memory** from returned segments + MEMORY.md
4. **DO NOT load all daily files** — that's the old O(L) pattern
5. **DO NOT read segments manually** — always use the script

### Security Rules

- **ONLY load segments in main session** (direct chats with your human)
- **DO NOT load in shared contexts** (Discord, group chats, sessions with other people)
- MEMORY.md is auto-generated from segments — update segments, not MEMORY.md directly

### Write Protocol

- **Daily events** → append to `memory/daily/YYYY-MM-DD.md`
- **Decisions/lessons** → update the relevant segment in `memory/segments/`
- **Resolved events** → create checkpoint in `memory/checkpoints/`
- **New topic emerging** → create new segment with index entry
- **Update `index.json`** whenever segments change
```

### Step 1.6 — Create Your First Segment

Create `memory/segments/s001-example.md`:

```markdown
# s001-example.md

## Summary
One-line description for the router display.

## Keywords
- example
- setup
- infrastructure

## Tags
- infrastructure
- onboarding

## Content

[Your actual memory content here.]

## Linked Events
- Daily: [[2026-06-27]]
```

### Step 1.7 — Update index.json with First Segment

Edit `memory/index.json` and add to the `segments` array:

```json
{
  "id": "s001",
  "file": "segments/s001-example.md",
  "summary": "One-line description for router display",
  "keywords": ["example", "setup", "infrastructure"],
  "tags": ["infrastructure", "onboarding"],
  "weight": 0.9,
  "lastCheckpoint": null,
  "accessCount": 0,
  "created": "2026-06-27"
}
```

### Step 1.8 — Verify

```powershell
# List segments
powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -List

# Run health check
powershell -ExecutionPolicy Bypass -File memory\ssc-health.ps1
```

---

## Part 2: Wiki Ecosystem (Optional)

### Step 2.1 — Install Tools

```powershell
# Hyper-Extract (knowledge extraction)
uv tool install hyperextract

# qmd (hybrid search: BM25 + Vector + Reranking)
npm install -g @tobilu/qmd

# agentmemory (vector store with triple-stream retrieval)
npm install -g @agentmemory/agentmemory
```

### Step 2.2 — Create Wiki Directory Structure

```powershell
cd ~/.openclaw/workspace

New-Item -ItemType Directory -Path "wiki\raw" -Force
New-Item -ItemType Directory -Path "wiki\entities" -Force
New-Item -ItemType Directory -Path "wiki\concepts" -Force
New-Item -ItemType Directory -Path "wiki\sources" -Force
New-Item -ItemType Directory -Path "wiki\synthesis" -Force
New-Item -ItemType Directory -Path "wiki\comparisons" -Force
New-Item -ItemType Directory -Path "wiki\projects" -Force
New-Item -ItemType Directory -Path "wiki\checkpoints" -Force
```

### Step 2.3 — Initialize qmd

```powershell
cd ~/.openclaw/workspace

qmd init
qmd collection add wiki --name wiki
```

### Step 2.4 — Initialize agentmemory

```powershell
npx @agentmemory/agentmemory init
```

### Step 2.5 — Add Wiki Context to qmd

```powershell
qmd context add qmd://wiki "knowledge base for all projects and research"
```

### Step 2.6 — Verify Wiki

```powershell
# Check qmd collections
qmd collection list

# Test search
qmd search "test"
```

---

## Part 3: Cron Health Check

### Step 3.1 — Create Cron Job in OpenClaw

Run this command in OpenClaw:

```
/cron add {
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

Replace `<workspace>` with your actual workspace path (e.g., `C:\Users\you\.openclaw\workspace`).

---

## Part 4: Verification Checklist

- [ ] `memory/` directory exists
- [ ] `memory/segments/` directory exists
- [ ] `memory/checkpoints/` directory exists
- [ ] `memory/daily/` directory exists
- [ ] `memory/fixes/` directory exists
- [ ] `memory/index.json` exists and is valid JSON
- [ ] `memory/ssc-router.ps1` exists and runs
- [ ] `memory/ssc-health.ps1` exists and runs
- [ ] `MEMORY.md` exists in workspace root
- [ ] AGENTS.md has the SSC Protocol section
- [ ] First segment created and indexed
- [ ] `ssc-router.ps1 -List` returns your segment
- [ ] `ssc-health.ps1` returns HEALTHY
- [ ] (Optional) Wiki directories created
- [ ] (Optional) qmd and agentmemory initialized
- [ ] (Optional) Cron job configured

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `accessCount` not updating | Check write permissions on `memory/index.json` |
| Encoding errors on Windows | Ensure files are UTF-8 (not BOM). Re-save with `-Encoding UTF8` |
| `qmd embed` slow first run | Normal — downloads 333MB GGUF model, cached after first run |
| `qmd init` fails | Check Node.js version: `node --version` (needs 18+) |
| `uv tool install` fails | Install uv first: `pip install uv` |
| Health check reports stale data | Create your first checkpoint manually or run maintenance |
| Router returns nothing | Add segments to `index.json` and create the files |
| PowerShell policy error | Use `-ExecutionPolicy Bypass` prefix |

---

## Full Manual Workflow

After installation, here's the complete lifecycle:

```
1. New topic emerges → Create segment + update index.json
2. Session start → ssc-router.ps1 -Query "topic" → loads top-K
3. Session ends → MEMORY.md auto-regenerated from segments
4. Resolved event → Create checkpoint, update segment
5. Daily → Append raw events to memory/daily/YYYY-MM-DD.md
6. Weekly → Run maintenance: compress, merge, split segments
7. Daily 3am → Cron runs ssc-health.ps1 → reports if issues
```

---

## Next Steps

1. Start creating segments for your projects and decisions
2. Configure Hyper-Extract for automated knowledge extraction
3. Set up wiki search for cross-project knowledge
4. Review and merge segments during weekly maintenance

---

*For questions or issues, see the main [README.md](../README.md) or open an issue on [GitHub](https://github.com/labsclaw/openclaw-skills/issues).*
