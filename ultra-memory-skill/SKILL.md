# SKILL.md — ultra-memory-skill

## What This Skill Does

Memory Caching for LLM Agents — a zero-cost implementation of the SSC (Sparse Selective Cache) architecture from arXiv 2602.24281. Provides gated retrieval, auto-maintenance, and health monitoring for persistent agent memory.

## Quick Start

### 1. Initialize Memory Structure

```powershell
# From your workspace root
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

### 3. Create Initial index.json

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
    "autoMergeSimilarityThreshold": 0.85,
    "maintenanceSchedule": "during-heartbeat"
  }
}
```

### 4. Add to AGENTS.md

Copy the memory protocol section from `templates/AGENTS-template.md` into your workspace's AGENTS.md.

## Scripts

### ssc-router.ps1 — Segment Router

Scores memory segments by keyword/tag overlap with your query. Returns top-K relevant segments and updates access counts.

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

### ssc-health.ps1 — Health Check

Pure filesystem health check. No LLM required. Verifies segment integrity, daily log continuity, and index consistency.

```powershell
# Run health check
.\ssc-health.ps1

# Quiet mode (report file only)
.\ssc-health.ps1 -Quiet
```

## Configuration

### index.json Fields

| Field | Type | Description |
|-------|------|-------------|
| `segments[].id` | string | Unique identifier (e.g., "s001") |
| `segments[].file` | string | Relative path to segment .md file |
| `segments[].summary` | string | One-line description (used in listing) |
| `segments[].keywords` | string[] | Matched against queries for scoring |
| `segments[].tags` | string[] | Category tags (also matched) |
| `segments[].weight` | float | Importance weight (0.0–1.0) |
| `segments[].accessCount` | int | Auto-incremented by router |
| `segments[].lastAccess` | ISO timestamp | Auto-updated by router |
| `config.maxSegmentsPerQuery` | int | Top-K segments to return |
| `config.autoCompressAfterDays` | int | Days before segment compression |

### Scoring Formula

```
score = (keyword_hits × 2) + tag_hits + (weight × 0.5)
```

Keywords are matched via regex against the query string. Tags provide additional signal. Weight ensures important segments surface even with fewer keyword matches.

## Cron Setup (Optional)

For automated health checks:

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: powershell -ExecutionPolicy Bypass -File <path>\\memory\\ssc-health.ps1\nIf HEALTHY, respond 'SSC health: OK'. If ATTENTION NEEDED, report issues."
  }
}
```

## Creating Segments

### Manual Creation

1. Create `memory/segments/s00N-topic.md` following the template in `examples/`
2. Add entry to `memory/index.json` with id, file, summary, keywords, tags, weight

### Automatic via Agent

When a new topic emerges during conversation:

1. Agent creates the segment file
2. Agent adds entry to index.json
3. Router picks it up on next query

## Maintenance

### What the Health Check Monitors

- Segment count consistency (index vs files)
- Daily log freshness (warns if >7 days gap)
- Checkpoint count and size
- Total memory size
- Last maintenance date (>30 days = warning)

### What Needs Manual Intervention

- Segment compression (>30 days unused)
- Segment splitting (>5KB files)
- Merge of similar segments (similarity >0.85)
- Index weight rebalancing

## Dependencies

**None.** This skill is self-contained PowerShell scripts + JSON config. No external repos, no npm packages, no API keys required.

## Paper Reference

- **Title**: Memory Caching: RNNs with Growing Memory
- **Authors**: Behrouz et al. (Google)
- **arXiv**: 2602.24281
- **Implementation**: SSC variant with gated retrieval via keyword/tag scoring

## License

MIT
