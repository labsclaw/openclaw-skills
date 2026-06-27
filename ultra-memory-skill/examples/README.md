# Examples — Ultra Memory Skill

This directory contains complete examples for setting up the Memory Caching system from scratch.

## Quick Reference

| File | What it is |
|------|------------|
| `memory/index.json` | SSC router config template |
| `memory/segments/s001-example.md` | Segment format template |
| `memory/checkpoints/ckpt-2026-06-27.md` | Checkpoint format template |

## Manual Installation (Step-by-Step)

If the setup.ps1 script isn't available or you prefer manual setup:

### Step 1: Create Directory Structure

```powershell
# In your workspace root
New-Item -ItemType Directory -Path ".\memory\segments" -Force
New-Item -ItemType Directory -Path ".\memory\checkpoints" -Force
New-Item -ItemType Directory -Path ".\memory\daily" -Force
New-Item -ItemType Directory -Path ".\memory\fixes" -Force
```

### Step 2: Copy Scripts

```powershell
# Copy scripts from the skill to your memory directory
Copy-Item "C:\path\to\ultra-memory-skill\scripts\ssc-router.ps1" ".\memory\"
Copy-Item "C:\path\to\ultra-memory-skill\scripts\ssc-health.ps1" ".\memory\"
```

### Step 3: Initialize index.json

```powershell
Copy-Item "C:\path\to\ultra-memory-skill\examples\memory\index.json" ".\memory\"
```

### Step 4: Add AGENTS.md Protocol

Copy `templates/AGENTS-template.md` to your workspace root as `AGENTS.md`, or add the Session Startup Protocol section:

```markdown
### Session Startup Protocol (Gated Retrieval)

1. **Run SSC Router** — `powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "<relevant terms>"`
2. The script scores segments by keyword/tag overlap, returns top-K, and updates accessCount
3. **Generate online memory** from returned segments + MEMORY.md
4. DO NOT load all daily files — that's the old O(L) pattern
5. DO NOT read segments manually — always use the script
```

### Step 5: Create Your First Segment

```powershell
# Use the template
Copy-Item ".\examples\memory\segments\s001-example.md" ".\memory\segments\s001-your-topic.md"
```

Edit the file and update `index.json` to add the segment entry.

### Step 6: (Optional) Wiki Setup

```powershell
# Install tools
uv tool install hyperextract
npm install -g @tobilu/qmd
npm install -g @agentmemory/agentmemory

# Create wiki structure
New-Item -ItemType Directory -Path ".\wiki\raw" -Force
New-Item -ItemType Directory -Path ".\wiki\entities" -Force
New-Item -ItemType Directory -Path ".\wiki\concepts" -Force
New-Item -ItemType Directory -Path ".\wiki\sources" -Force
New-Item -ItemType Directory -Path ".\wiki\synthesis" -Force
New-Item -ItemType Directory -Path ".\wiki\comparisons" -Force
New-Item -ItemType Directory -Path ".\wiki\projects" -Force
New-Item -ItemType Directory -Path ".\wiki\checkpoints" -Force

# Initialize
qmd init
qmd collection add wiki --name wiki
npx @agentmemory/agentmemory init
```

## Segment Format

See `memory/segments/s001-example.md` for the complete format:

```markdown
# s001-example.md

## Summary
One-line description for the router display.

## Keywords
- infra
- setup
- config

## Tags
- infrastructure
- onboarding

## Content

[Your actual memory content here. Keep it concise — this is the "compressed" version.]

## Linked Events
- Daily: [[2026-06-27]]
- Checkpoint: [[ckpt-2026-06-27]]
```

## Checkpoint Format

See `memory/checkpoints/ckpt-2026-06-27.md`:

```markdown
# Checkpoint 2026-06-27

## State
Brief description of resolved state.

## Segments Captured
- s001: Summary of what was captured
- s002: Summary of what was captured

## Wiki Pages
- pages created, updated, or consolidated

## Metrics
- Total size: ~X KB
- Segments: N
- Daily logs: N
- Access counts: N accesses
```

## Cron Job Configuration

For OpenClaw, add this job via `/cron add`:

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

## Verification

After setup, verify:

```powershell
# Test router
.\memory\ssc-router.ps1 -List

# Test health check
.\memory\ssc-health.ps1

# Create test segment
# Edit: memory/segments/s001-test.md
# Update: memory/index.json
# Re-run router, verify top-K returns your segment
```