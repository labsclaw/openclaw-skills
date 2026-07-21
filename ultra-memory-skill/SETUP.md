# Ultra Memory Skill - Complete Setup Guide

## Quick Start (5 minutes)

```powershell
cd skills/ultra-memory-skill/scripts
.\setup.ps1 -Force
```

## Full Installation

### 1. Copy Scripts Manually (if setup.ps1 has path bug)

```powershell
Copy-Item "scripts/ssc-router.ps1" "C:\Users\renat\.openclaw\workspace\memory\"
Copy-Item "scripts/ssc-health.ps1" "C:\Users\renat\.openclaw\workspace\memory\"
```

### 2. Create Wiki Directory Structure

```powershell
 = @("wiki","wiki/raw","wiki/entities","wiki/concepts","wiki/sources","wiki/synthesis","wiki/comparisons","wiki/projects","wiki/checkpoints")
foreach ( in ) { New-Item -ItemType Directory -Path "C:\Users\renat\.openclaw\workspace\" -Force }
```

### 3. Install Wiki Ecosystem (optional)

```bash
# Hyper-Extract (Python)
pip install hyperextract

# qmd (Node.js)
npm install -g @tobilu/qmd

# agentmemory (Node.js)
npm install -g @agentmemory/agentmemory
```

After install:
```bash
cd ~/.openclaw/workspace
qmd init
qmd collection add wiki --name wiki
npx @agentmemory/agentmemory init
```

### 4. Add SSC Protocol to AGENTS.md

Add this section to your AGENTS.md:

```markdown
## Memory - SSC Architecture (Sparse Selective Cache)

### Session Startup Protocol (Gated Retrieval)

1. Run SSC Router: pwsh -ExecutionPolicy Bypass -File memory/ssc-router.ps1 -Query "relevant terms"
2. Script scores segments by keyword/tag overlap, returns top-K
3. Generate online memory from returned segments + MEMORY.md

### Write Protocol

- Daily events: append to memory/daily/YYYY-MM-DD.md
- Decisions/lessons: update segment in memory/segments/
- Resolved events: checkpoint in memory/checkpoints/
- New topic: create segment with index entry in memory/index.json

### Auto-Improve

During heartbeats, run maintenance:
- Compress segments not accessed in 30+ days
- Merge segments with similarity > 0.85
- Split segments > 5KB
```

### 5. Configure Daily Health Check Cron

Add this cron job in OpenClaw:

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "lightContext": true,
    "message": "Run SSC health check: pwsh -ExecutionPolicy Bypass -File memory/ssc-health.ps1"
  },
  "delivery": { "mode": "none" }
}
```

### 6. Verify Installation

```powershell
# Test router
pwsh -ExecutionPolicy Bypass -File memory/ssc-router.ps1 -List
pwsh -ExecutionPolicy Bypass -File memory/ssc-router.ps1 -Stats

# Test health check
pwsh -ExecutionPolicy Bypass -File memory/ssc-health.ps1

# Test skill optimizer
pwsh -ExecutionPolicy Bypass -File skills/ultra-memory-skill/scripts/skill-optimizer.ps1
```

## Known Issues

- setup.ps1 line 78: doubled scripts/ path (see PR #10)
- skill-optimizer.ps1: requires memory/corrections.md to exist
- Wiki tools (Hyper-Extract, qmd, agentmemory) need manual install
- Setup.ps1 emojis may not render on PowerShell 5.1

## Bug Fixes

### PR #10: Doubled scripts/ path in setup.ps1
Line 73: `Join-Path  "scripts" ` → `Join-Path  `
