<p align="center">
  <h1 align="center">🧠 ultra-memory-skill</h1>
  <p align="center">
    <strong>Memory Caching for LLM Agents</strong><br>
    Zero-cost gated retrieval, auto-maintenance, and health monitoring for persistent agent memory.<br>
    Inspired by <a href="https://arxiv.org/abs/2602.24281">Memory Caching: RNNs with Growing Memory</a> (Google, 2026).
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#scripts">Scripts</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#paper">Paper</a> •
  <a href="#faq">FAQ</a>
</p>

---

## The Problem

LLM agents rediscover knowledge from scratch every session. Memory files grow unbounded. Loading all context costs O(L) tokens per session — and grows linearly with usage.

| Approach | Complexity | Limitation |
|----------|-----------|------------|
| Static files (AGENTS.md) | O(1) | Fixed capacity, goes stale |
| Full log replay | O(L) | Linear token cost, no compression |
| RAG retrieval | O(1) query | Stateless, no knowledge accumulation |
| **SSC (this skill)** | **O(K)** | **K << L, compounding knowledge** |

## The Solution

**Sparse Selective Cache (SSC)** — divide memory into topic segments, score them by relevance at query time, and load only the top-K. Access patterns update weights automatically. Maintenance compresses stale segments.

**Result**: 91.4% token savings per session in our benchmarks.

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
│  ...         │
└──────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│        ssc-health.ps1 (daily cron)           │
│  Verify integrity, report anomalies          │
└─────────────────────────────────────────────┘
```

### Directory Structure

```
memory/
├── index.json              ← SSC Router config + segment metadata
├── ssc-router.ps1          ← Query-time segment scoring
├── ssc-health.ps1          ← Daily health check (filesystem only)
├── segments/               ← Compressed knowledge by topic
│   ├── s001-infra.md
│   ├── s002-project.md
│   └── s003-decisions.md
├── checkpoints/            ← Snapshots at key events
│   └── ckpt-YYYY-MM-DD.md
├── daily/                  ← Raw daily logs (append-only)
│   └── YYYY-MM-DD.md
└── fixes/                  ← Bug fix records
```

## Quick Start

### 1. Initialize

```powershell
$memoryDir = ".\memory"
New-Item -ItemType Directory -Path "$memoryDir\segments" -Force
New-Item -ItemType Directory -Path "$memoryDir\checkpoints" -Force
New-Item -ItemType Directory -Path "$memoryDir\daily" -Force
New-Item -ItemType Directory -Path "$memoryDir\fixes" -Force
```

### 2. Copy Scripts

```powershell
Copy-Item "<skill-path>\scripts\*" "$memoryDir\"
```

### 3. Create index.json

```json
{
  "version": "1.0",
  "description": "SSC Router — Memory Caching",
  "created": "2026-06-27",
  "lastMaintenance": null,
  "segments": [],
  "config": {
    "maxSegmentsPerQuery": 4,
    "minWeightThreshold": 0.3,
    "autoCompressAfterDays": 30,
    "autoMergeSimilarityThreshold": 0.85
  }
}
```

### 4. Add Protocol to AGENTS.md

Copy the session startup section from `templates/AGENTS-template.md`.

### 5. Test

```powershell
.\ssc-router.ps1 -Query "test query"
.\ssc-health.ps1
```

## Scripts

### ssc-router.ps1 — Segment Router

Scores memory segments by keyword/tag overlap with your query. Returns top-K relevant segments and increments access counts.

```powershell
# Query for relevant segments
.\ssc-router.ps1 -Query "project X deadline"

# List all segments
.\ssc-router.ps1 -List

# Show access stats
.\ssc-router.ps1 -Stats

# Dry run (no accessCount update)
.\ssc-router.ps1 -Query "encoding bug" -DryRun
```

**Scoring formula:**
```
score = (keyword_hits × 2) + tag_hits + (weight × 0.5)
```

### ssc-health.ps1 — Health Check

Pure filesystem health check. No LLM required. Runs in <1 second.

```powershell
.\ssc-health.ps1
# → Segments: 4 indexed, 4 healthy
# → Daily logs: 47 files (62.33 KB)
# → Checkpoints: 4
# → Status: HEALTHY
```

**What it monitors:**
- Segment count consistency (index vs files)
- Daily log freshness (warns if >7 days gap)
- Checkpoint count and size
- Total memory size
- Last maintenance date (>30 days = warning)

## Configuration

### index.json Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `segments[].id` | string | — | Unique ID (e.g., "s001") |
| `segments[].file` | string | — | Relative path to segment .md |
| `segments[].summary` | string | — | One-line description |
| `segments[].keywords` | string[] | — | Matched against queries |
| `segments[].tags` | string[] | — | Category tags |
| `segments[].weight` | float | 1.0 | Importance (0.0–1.0) |
| `segments[].accessCount` | int | 0 | Auto-incremented by router |
| `segments[].lastAccess` | ISO | — | Auto-updated by router |
| `config.maxSegmentsPerQuery` | int | 4 | Top-K to return |
| `config.autoCompressAfterDays` | int | 30 | Compression threshold |
| `config.autoMergeSimilarityThreshold` | float | 0.85 | Merge threshold |

### Segment File Format

```markdown
# Segment: s001 — Topic Name

## Resumo
One-line summary for router display.

## Conteúdo

### Subtopic A (YYYY-MM-DD)
- Key finding or decision
- Context and impact

### Subtopic B (YYYY-MM-DD)
- Another point
- Cross-references

## Checkpoint
- `ckpt-YYYY-MM-DD` — Description

## Tags
tag1, tag2, tag3

## Último checkpoint: YYYY-MM-DD
```

## Cron Setup

For automated daily health checks (OpenClaw cron):

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: powershell -ExecutionPolicy Bypass -File <path>\\memory\\ssc-health.ps1\nIf HEALTHY, respond 'SSC health: OK'. If ATTENTION NEEDED, report issues."
  },
  "delivery": { "mode": "announce", "channel": "telegram" }
}
```

## Benchmarks

Measured on our production workspace (4 segments, 47 daily logs):

| Metric | Before SSC | After SSC | Savings |
|--------|-----------|-----------|---------|
| Tokens per session startup | ~13,036 | ~1,120 | **91.4%** |
| Files loaded | 47 daily logs | 3 segments + MEMORY.md | **93.6%** |
| Query latency | N/A (manual) | <1s (script) | — |
| Health check | Manual inspection | <1s automated | — |

## Paper

### Memory Caching: RNNs with Growing Memory

- **Authors**: Behrouz et al. (Google)
- **arXiv**: [2602.24281](https://arxiv.org/abs/2602.24281)
- **Key insight**: RNNs don't fail because they're recurrent — they fail because memory is fixed. Caching checkpoints + selective gating = effectively growing memory without O(L²) Transformer cost.

**Our implementation uses the SSC (Sparse Selective Cache) variant:**
- Segments = memory checkpoints
- Keyword/tag scoring = gating mechanism
- Top-K retrieval = sparse selective activation
- Access count tracking = weight updates

### Full Paper

Our complete research paper documenting the hybrid memory architecture is available at `paper/sections/paper-draft.md` in the [openclaw-x-integration](https://github.com/labsclaw/openclaw-x-integration) workspace.

## FAQ

**Q: Do I need any external dependencies?**
A: No. Pure PowerShell + JSON. No npm, no Python, no API keys.

**Q: What LLM frameworks does this work with?**
A: Any framework that reads files from a workspace. We built this for OpenClaw but the protocol is framework-agnostic. Copy the AGENTS.md template and adjust the file reading commands.

**Q: How many segments should I have?**
A: Start with 3-5. The router returns top-K (default 4). More segments = better granularity but higher index maintenance. We recommend splitting when a segment exceeds 5KB.

**Q: When should I create a new segment?**
A: When a distinct topic accumulates enough context that it deserves its own compressed summary. Signals: repeated references to the same concepts, decisions that affect only that topic, or a natural "chapter" in your project history.

**Q: Can I use this with other memory tools (Mem0, Zep, etc.)?**
A: Yes. SSC is a retrieval layer, not a replacement. Use it alongside vector stores, knowledge graphs, or other memory systems. The scripts produce segment content that can be fed into any downstream system.

**Q: What about shared/group sessions?**
A: Security rule: only load segments in main sessions (direct 1:1 chats). Never load in shared contexts. The router doesn't enforce this — it's a protocol your agent follows.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Test your changes with both scripts
4. Submit a PR with before/after benchmark data

## License

MIT

## Credits

- **Paper**: "Memory Caching: RNNs with Growing Memory" — Behrouz et al. (Google), [arXiv 2602.24281](https://arxiv.org/abs/2602.24281)
- **Implementation**: Dr. Roger Oliveira (@SmartNewbieBR) + Justus (AI Agent)
- **Organization**: [LabsClaw](https://github.com/labsclaw)
