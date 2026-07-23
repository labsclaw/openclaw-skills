# Ultra Memory Skill — Installation Checklist

> **Complete step-by-step guide.** Follow every section in order. Check each item off as you go.
> Tested on: Windows 11, PowerShell 7.6.0, Node.js 24.17.0, Python 3.12

---

## ⚡ Prerequisites

- [ ] **PowerShell 7+** installed (`pwsh --version` → 7.x)
  - Download: https://github.com/PowerShell/PowerShell/releases
  - Why: PS 5.1 has Unicode/emoji bugs, missing operators (`&&`, `??`), `ConvertFrom-Json -Depth` unavailable
- [ ] **Node.js** installed (`node --version` → 18+)
- [ ] **Python 3** installed (`python --version` → 3.10+)
- [ ] **pip** available (`pip --version`)
- [ ] **npm** available (`npm --version`)
- [ ] **OpenClaw workspace** exists at `~/.openclaw/workspace/`
- [ ] **OpenClaw gateway** running (`openclaw gateway status`)

---

## 📁 Phase 1: Memory Structure (REQUIRED)

These create the core memory architecture. **Do not skip.**

### 1.1 Copy SSC Scripts

```powershell
$memoryDir = "$env:USERPROFILE\.openclaw\workspace\memory"
New-Item -ItemType Directory -Path $memoryDir -Force | Out-Null

Copy-Item "skills/ultra-memory-skill/scripts/ssc-router.ps1" "$memoryDir\ssc-router.ps1" -Force
Copy-Item "skills/ultra-memory-skill/scripts/ssc-health.ps1" "$memoryDir\ssc-health.ps1" -Force
```

- [ ] `memory/ssc-router.ps1` exists
- [ ] `memory/ssc-health.ps1` exists

### 1.2 Create Memory Directories

```powershell
$dirs = @("segments","checkpoints","daily","fixes","archive","semantic","episodic","working")
foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path "$memoryDir\$d" -Force | Out-Null
}
```

- [ ] `memory/segments/` exists
- [ ] `memory/checkpoints/` exists
- [ ] `memory/daily/` exists
- [ ] `memory/fixes/` exists
- [ ] `memory/archive/` exists
- [ ] `memory/semantic/` exists
- [ ] `memory/episodic/` exists
- [ ] `memory/working/` exists

### 1.3 Create Required Files

```powershell
# corrections.md (required by skill-optimizer.ps1)
Set-Content -Path "$memoryDir\corrections.md" -Value @"
# Corrections Log
> Last 50 corrections. Promote to segment after 3x pattern.
## Recent
## Patterns (3x+)
## Promoted to Segments
"@ -Encoding UTF8

# index.json (SSC Router config)
$index = @{
    version = "1.0"
    description = "Sparse Selective Cache (SSC)"
    created = (Get-Date -Format "yyyy-MM-dd")
    lastMaintenance = $null
    segments = @()
    config = @{
        maxSegmentsPerQuery = 6
        minWeightThreshold = 0.3
        autoCompressAfterDays = 30
        autoMergeSimilarityThreshold = 0.85
        maintenanceSchedule = "during-heartbeat"
    }
}
$index | ConvertTo-Json -Depth 10 | Set-Content "$memoryDir\index.json" -Encoding UTF8
```

- [ ] `memory/corrections.md` exists
- [ ] `memory/index.json` exists and is valid JSON

### 1.4 Verify Phase 1

```powershell
# Test SSC Router
pwsh -ExecutionPolicy Bypass -File "$memoryDir\ssc-router.ps1" -List
pwsh -ExecutionPolicy Bypass -File "$memoryDir\ssc-router.ps1" -Stats

# Test Health Check
pwsh -ExecutionPolicy Bypass -File "$memoryDir\ssc-health.ps1"
```

- [ ] SSC Router runs without errors
- [ ] SSC Health Check runs and generates report

---

## 📄 Phase 2: AGENTS.md Integration (REQUIRED)

### 2.1 Add SSC Protocol

Add this section to your `AGENTS.md` file (after the existing memory section):

```markdown
---

## Memory - SSC Architecture (Sparse Selective Cache)

> Inspired by Memory Caching: RNNs with Growing Memory (arXiv 2602.24281)

### Session Startup Protocol (Gated Retrieval)

1. Run SSC Router: `pwsh -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "<relevant terms>"`
2. Script scores segments by keyword/tag overlap, returns top-K, updates accessCount
3. Generate online memory from returned segments + MEMORY.md
4. DO NOT load all daily files - use the script for consistent scoring and tracking

### Write Protocol

- Daily events: append to `memory/daily/YYYY-MM-DD.md`
- Decisions/lessons: update relevant segment in `memory/segments/`
- Resolved events: create checkpoint in `memory/checkpoints/`
- New topic: create new segment with index entry in `memory/index.json`

### Auto-Improve (Memory Maintenance)

During heartbeats, run maintenance:
- Compress segments not accessed in 30+ days
- Merge segments with similarity > 0.85
- Split segments > 5KB
- Update index based on access patterns

### Security Rules

- ONLY load segments in main session (direct chats)
- DO NOT load in shared contexts (Discord, group chats)
- MEMORY.md is auto-generated - update segments, not MEMORY.md directly
```

- [ ] SSC Protocol section added to AGENTS.md
- [ ] Session Startup Protocol includes ssc-router.ps1 command
- [ ] Write Protocol documents daily/segments/checkpoints workflow

---

## 🔧 Phase 3: Wiki Ecosystem (OPTIONAL but recommended)

> **Skip if you don't need persistent wiki/semantic memory.**
> These tools enable Hyper-Extract (citations), qmd (markdown indexing), and agentmemory (persistent AI memory).

### 3.1 Install Hyper-Extract

```bash
pip install hyperextract
```

- [ ] `he --version` returns a version number
- [ ] On Windows: binary is at `Scripts/he.exe` in Python scripts dir

### 3.2 Install qmd

```bash
npm install -g @tobilu/qmd
```

- [ ] `qmd --version` returns a version number

### 3.3 Install iii Engine (required by agentmemory)

> **Windows only.** Linux/Mac: auto-installed by agentmemory.

1. Download: https://github.com/iii-hq/iii/releases/download/iii%2Fv0.11.2/iii-x86_64-pc-windows-msvc.zip
2. Extract `iii.exe` to a directory on PATH (e.g., `$env:USERPROFILE\.local\bin\`)
3. Add to PATH: `[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:USERPROFILE\.local\bin", "User")`

```bash
iii --version
```

- [ ] `iii.exe` downloaded and extracted
- [ ] `iii --version` returns `0.11.2`
- [ ] Added to Windows PATH permanently

### 3.4 Install agentmemory

```bash
npm install -g @agentmemory/agentmemory
```

- [ ] `agentmemory --version` returns a version number

### 3.5 Initialize Wiki Structure

```powershell
$workspace = "$env:USERPROFILE\.openclaw\workspace"
$wikiDirs = @("wiki","wiki/raw","wiki/entities","wiki/concepts","wiki/sources","wiki/synthesis","wiki/comparisons","wiki/projects","wiki/checkpoints")
foreach ($d in $wikiDirs) {
    New-Item -ItemType Directory -Path "$workspace\$d" -Force | Out-Null
}
```

- [ ] `wiki/` directory exists with all 9 subdirectories

### 3.6 Initialize qmd

```bash
cd ~/.openclaw/workspace
qmd init
qmd collection add wiki --name wiki
```

- [ ] `qmd init` completes successfully
- [ ] `qmd collection add wiki` creates wiki collection
- [ ] `qmd status` shows the wiki collection

### 3.7 Initialize agentmemory

```bash
agentmemory init
```

Then configure the API key in `~/.agentmemory/.env`:

```bash
# Uncomment and set your LLM provider key (pick ONE):
GEMINI_API_KEY=your-key-here
# OR
OPENAI_API_KEY=your-key-here
# OR
ANTHROPIC_API_KEY=your-key-here
```

Start the daemon:
```bash
agentmemory
# (runs on http://localhost:3111, viewer at http://localhost:3113)
```

- [ ] `~/.agentmemory/.env` exists with API key configured
- [ ] `agentmemory doctor` shows `no-llm-provider-key ✓ (found: GEMINI_API_KEY)`
- [ ] `agentmemory` starts and shows "REST API http://localhost:3111"

---

## ⏰ Phase 4: Cron Jobs (REQUIRED)

### 4.1 SSC Health Check (Daily)

Add via OpenClaw cron or manually:

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "lightContext": true,
    "message": "Run SSC health check: pwsh -ExecutionPolicy Bypass -File memory\\ssc-health.ps1. If issues found, summarize. If OK, respond HEARTBEAT_OK."
  },
  "delivery": { "mode": "none" }
}
```

- [ ] `ssc-health-check` cron job created and enabled
- [ ] Scheduled for 03:00 daily (or your preferred time)

### 4.2 Pipeline Zombie Check (Every 30min) — RECOMMENDED

```json
{
  "name": "pipeline-zombie-check",
  "schedule": { "kind": "cron", "expr": "*/30 * * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "lightContext": true,
    "message": "Check for zombie pipelines and stuck sub-agents:\n1. Read all JSON files in memory/pipelines/ (exclude check_zombie*, macro-regime*)\n2. For each file with status != 'failed' and steps running/pending > 2h: mark failed\n3. Check subagents list - alert if running > 30min\n4. If all OK: HEARTBEAT_OK"
  },
  "delivery": { "mode": "announce", "channel": "telegram", "to": "<YOUR_CHAT_ID>" }
}
```

- [ ] `pipeline-zombie-check` cron created (or skip if not using pipelines)

---

## 🧪 Phase 5: Verification

Run ALL of these. Every check must pass.

### 5.1 Scripts

```powershell
# SSC Router
pwsh -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -List
pwsh -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Stats
pwsh -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "health protocol"

# SSC Health Check
pwsh -ExecutionPolicy Bypass -File memory\ssc-health.ps1
# → Should generate memory/health-last-report.md

# Skill Optimizer (needs corrections.md to exist)
pwsh -ExecutionPolicy Bypass -File skills\ultra-memory-skill\scripts\skill-optimizer.ps1
# → Should run 7 stages (may say "NO PATCHES" if no corrections yet)
```

- [ ] SSC Router: `-List` shows segments (may be empty on fresh install)
- [ ] SSC Router: `-Stats` shows config
- [ ] SSC Router: `-Query` returns results without errors
- [ ] SSC Health Check: generates `health-last-report.md`
- [ ] Skill Optimizer: runs 7 stages without crashing

### 5.2 Wiki Tools

```powershell
he --version        # Hyper-Extract
qmd --version       # qmd
agentmemory --version  # agentmemory
iii --version       # iii engine (Windows)
qmd status          # Check wiki collection
```

- [ ] All version commands return numbers
- [ ] `qmd status` shows wiki collection

### 5.3 Cron Jobs

```powershell
# Via OpenClaw CLI or API
openclaw cron list
# Should show: ssc-health-check, pipeline-zombie-check (if configured)
```

- [ ] `ssc-health-check` appears in cron list
- [ ] Next run time is set correctly

### 5.4 File Structure

```powershell
$workspace = "$env:USERPROFILE\.openclaw\workspace"
$checks = @(
    "memory\ssc-router.ps1",
    "memory\ssc-health.ps1",
    "memory\index.json",
    "memory\corrections.md",
    "memory\segments",
    "memory\checkpoints",
    "memory\daily",
    "memory\fixes",
    "memory\archive",
    "memory\semantic",
    "memory\episodic",
    "memory\working",
    "wiki",
    "wiki\raw",
    "wiki\entities",
    "wiki\concepts",
    "wiki\sources",
    "wiki\synthesis",
    "wiki\comparisons",
    "wiki\projects",
    "wiki\checkpoints"
)
foreach ($c in $checks) {
    $full = Join-Path $workspace $c
    if (Test-Path $full) { Write-Host "[OK] $c" -ForegroundColor Green }
    else { Write-Host "[X] $c MISSING" -ForegroundColor Red }
}
```

- [ ] All 21 checks pass (green)

---

## 🐛 Known Issues & Fixes

### setup.ps1: Doubled `scripts/` path (PR #10)

**Problem:** `setup.ps1` line 78 uses `Join-Path $ScriptDir "scripts" $script` but `$PSScriptRoot` already points to `scripts/`, creating `scripts/scripts/ssc-router.ps1`.

**Fix:** Change line 78 from:
```powershell
$src = Join-Path $ScriptDir "scripts" $script
```
to:
```powershell
$src = Join-Path $ScriptDir $script
```

**Workaround:** Copy scripts manually (Phase 1.1 above).

### skill-optimizer.ps1: Requires corrections.md

**Problem:** Script fails with "Corrections file not found" if `memory/corrections.md` doesn't exist.

**Fix:** Create `memory/corrections.md` before running (Phase 1.3 above).

### iii engine: Windows PATH not persistent

**Problem:** `iii.exe` extracted to `$env:USERPROFILE\.local\bin\` but not on PATH.

**Fix:** Run: `[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:USERPROFILE\.local\bin", "User")`
Then restart terminal.

### PowerShell 5.1: Unicode/emoji broken

**Problem:** `setup.ps1` emojis show as `???` or `??` on PS 5.1.

**Fix:** Use PowerShell 7+ (`pwsh`). PS 5.1 has no `&&`, `??`, ternary, or proper UTF-8.

---

## 📋 Quick Reference

| Component | Command | Expected Result |
|-----------|---------|-----------------|
| SSC Router | `pwsh -File memory\ssc-router.ps1 -List` | Lists segments |
| SSC Router | `pwsh -File memory\ssc-router.ps1 -Stats` | Shows stats |
| SSC Health | `pwsh -File memory\ssc-health.ps1` | Generates report |
| Skill Optimizer | `pwsh -File skills\ultra-memory-skill\scripts\skill-optimizer.ps1` | 7 stages |
| Hyper-Extract | `he --version` | Version number |
| qmd | `qmd --version` | Version number |
| agentmemory | `agentmemory --version` | Version number |
| iii engine | `iii --version` | `0.11.2` |
| qmd status | `qmd status` | Shows collections |
| Cron check | `openclaw cron list` | Shows ssc-health-check |
