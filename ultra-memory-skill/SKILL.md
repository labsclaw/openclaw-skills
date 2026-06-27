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
- **91.4% token savings** per session in benchmarks

## Quick Start (5 minutes)

```powershell
# From this skill directory:
.\scripts\setup.ps1
```

This creates the memory structure and copies scripts. Then add the SSC protocol to your AGENTS.md (see `templates/AGENTS-template.md`).

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

# 2. Copy scripts
Copy-Item .\scripts\ssc-router.ps1 .\memory\
Copy-Item .\scripts\ssc-health.ps1 .\memory\

# 3. Copy index.json template
Copy-Item .\examples\memory\index.json .\memory\

# 4. Add SSC protocol to AGENTS.md (see templates/AGENTS-template.md)
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
│  s001-*.md   │    │  (overview)  │
│  s002-*.md   │    └──────────────┘
└──────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│        ssc-health.ps1 (daily cron)           │
│  Verify integrity, report anomalies          │
└─────────────────────────────────────────────┘
```

## References

- **Paper**: [Memory Caching: RNNs with Growing Memory](https://arxiv.org/abs/2602.24281) — Behrouz et al. (Google, 2026)
- **Implementation**: Dr. Roger Oliveira + Justus (AI Agent)
- **Organization**: [LabsClaw](https://github.com/labsclaw)

## License

MIT
