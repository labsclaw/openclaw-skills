# Ultra Memory Skill — Distilled v3

A discipline for memory: load only what's relevant, log only what matters, decay what doesn't earn its place. Skip the ceremony.

---

## What You Get

- **SSC Router** — keyword/tag scoring loads only relevant memory segments per query
- **Health Check** — daily filesystem integrity monitor (no LLM needed)
- **Wiki Architecture** — persistent markdown wiki with Hyper-Extract + qmd + agentmemory
- **Learning Signals** — automatic detection of corrections, preferences, and patterns
- **Tiered Storage** — HOT/WARM/COLD with automatic promotion/demotion rules
- **Self-Reflection** — post-task evaluation protocol for continuous improvement
- **91.4% token savings** per session in benchmarks

---

## Quick Start (5 minutes)

```powershell
# From this skill directory:
.\scripts\setup.ps1
```

This creates the memory structure and copies scripts. Then add the SSC protocol to your AGENTS.md (see `templates/AGENTS-template.md`).

---

## When to Use This Skill

- One project, repeated work, real accumulated state to track.
- Long-running sessions where context drift costs you.
- Workflows that keep producing the same corrections.

## When NOT to Use

| # | Scenario | Why Skip |
|---|----------|----------|
| 1 | **One-shot tasks** — "convert this CSV to JSON" | No memory needed; task is stateless |
| 2 | **Short sessions (< 5 exchanges)** | SSC Router overhead > benefit |
| 3 | **Read-only queries** — "what's in this file?" | Retrieval without decisions = no memory to form |
| 4 | **Exploratory / prototype work** — throwaway spikes | Memory from a spike is noise, not signal |
| 5 | **Conversations with no corrections, no decisions, no preferences** | Nothing to persist; all info is derivable |
| 6 | **When you have < 3 segments in index.json** | Router has nothing to route — use MEMORY.md directly |

**Heuristic:** If the session didn't produce a decision, a correction, or a preference signal, skip memory writing. Silence is better than noise.

---

## Outcomes

- **91.4% token savings** per session — load only relevant segments, never all files
- **0 LLM calls** for memory retrieval — keyword/tag scoring is deterministic
- **Self-correcting** — corrections automatically promote to durable memory after 3 occurrences
- **Staleness-aware** — every fact carries an age grade; old facts are verified before use

---

## SSC Router — The Core Retrieval Engine

Query-time scoring. No LLM. No vector DB. No embedding cost.

**How it works:**
1. Session starts → extract keywords from the current task/context
2. Run SSC Router with those keywords → script scores every segment in `index.json`
3. Score formula: `score = (keyword_hits × 2) + tag_hits + (weight × 0.5)`
4. Return top-K matches → load ONLY those segments
5. Update `accessCount` on matched segments (for promotion/demotion)

**The SSC Router replaces:**
- Loading all daily files (O(L) — the old expensive pattern)
- Manually reading segments
- Guessing what's relevant from MEMORY.md alone

---

## Tiered Storage — HOT / WARM / COLD

Memory gets colder as it ages. Promotion is earned by use.

| Tier | Location | Size Cap | Load Rule |
|------|----------|----------|-----------|
| **HOT** | `memory/segments/` | ≤100 lines | Always loaded via SSC Router |
| **WARM** | `memory/segments/` | ≤200 lines | Loaded on keyword match |
| **COLD** | `memory/archive/` | Unlimited | Loaded on explicit query only |

### Promotion/Demotion

| Condition | Action |
|-----------|--------|
| 3+ accesses in 7 days | Promote to HOT |
| 30 days without access | Demote to WARM |
| 90 days without access | Archive to COLD |
| Any deletion | **Never** — without explicit user confirmation |

---

## Staleness Grading — Date Every Fact

Every persistent entry gets an ISO date and one fact. Undated memory lies.

| Grade | Age | Action |
|-------|-----|--------|
| **Fresh** | < 24h | Trust fully |
| **Current** | 1–7 days | Verify before critical decisions |
| **Aging** | 7–30 days | Re-verify any fact before acting on it |
| **Stale** | 30–90 days | Re-verify, mark as potentially outdated |
| **Historical** | > 90 days | Archive, re-verify on every use |

**Rule:** When a fact from memory contradicts live state (a running service, a file on disk, an API response), the **live state wins**. The fact gets corrected, not just noted.

---

## Memory Decay Formula

```
decay = (0.4 × recency) + (0.3 × frequency) + (0.3 × importance)
```

| Score | Fate |
|-------|------|
| < 0.1 | Soft-delete (mark, don't remove) |
| < 0.3 | Archive to COLD |
| ≥ 0.5 | Keep in current tier |

Recency = days since last access. Frequency = retrieval count. Importance = confidence score (0.0–1.0).

---

## What to Persist

**One fact per entry, dated.** Every persistent note carries an ISO date. Undated memory is unreliable.

### Keep:
- **Decisions, not events.** "API: REST over GraphQL (team knows REST, no graph schema needed)" — not "we discussed the API."
- **The rejection.** What was considered and WHY it was rejected. "Chose X over Y because Z" survives context loss.
- **Facts over interpretations.** "Deploy failed: rollback took 12 min, caused by missing DATABASE_URL" — not "deployment was problematic."

### Don't persist:
- Derivable facts (git history, docker-compose output, file contents you can re-read)
- One-off fixes without the WHY
- Passwords, tokens, temporary credentials
- Narrative of process ("I then checked...")
- Redundant copies of the same fact

---

## Learning Signals

Automatically detect and log these patterns. No LLM needed — signal detection is text-matching.

### Corrections (Log to `memory/corrections.md`)
Detect when user says:
- "No, that's not right..."
- "Actually, it should be..."
- "You're wrong about..."
- "I prefer X, not Y"
- "Stop doing X" / "Why do you keep..."

### Preferences (Log to relevant segment)
Detect when user says:
- "I like when you..."
- "Always do X for me" / "Never do Y"
- "My style is..." / "For [project], use..."

### Pattern Candidates (Track, promote after 3x)
- Same instruction repeated 3+ times → promote to segment with `tier: "HOT"`
- Workflow praised 3+ times → promote to segment
- Correction in same category 3+ times → promote to segment

### Ignore:
- One-time instructions ("do X now")
- Context-specific ("in this file...")
- Hypotheticals ("what if...")

---

## Self-Reflection Protocol

After completing significant work, pause and evaluate:

**When:** After a multi-step task, after feedback (positive or negative), after fixing a bug, when output could be better.

**Format:**
```
CONTEXT:  [type of task]
REFLECTION: [what I noticed]
LESSON:   [what to do differently]
```

**Promotion:** Self-reflection entries follow the same 3x rule — applied successfully 3 times → promote to HOT tier.

---

## Replay Briefings — Before You Start a Task

1. Extract keywords from the task.
2. Search `corrections.md` and relevant segments by relevance, not date.
3. Include the original error context, not just the rule.
4. Flag sessions with >20% correction rate before proceeding.

Output as `REPLAY BRIEFING: <task>` with ranked past learnings + suggested approach.

---

## Map is not the Territory — Unknown Detection

Your prompts, skills, and context are the *map*. The real codebase, system constraints, and edge cases are the *territory*. When the agent hits unknown territory, quality drops.

### Classification

| Type | Meaning | Action |
|------|---------|--------|
| **Known-Known** | You have a pattern for this | Execute directly |
| **Known-Unknown** | You know you don't know | Search web → log → update skill |
| **Unknown-Unknown** | You don't know you don't know | Error occurs → classify → search → log |

### Triggers
- Command fails with unexpected error
- API/behavior differs from learned knowledge
- Framework constraint not in current skills
- Platform-specific behavior (Windows vs Linux)
- Tool version incompatibility

### Auto-Update Protocol
When an unknown is **important for an active objective**:

1. Log to `memory/corrections.md` with category `knowledge_gap`
2. Search the web for current information
3. Synthesize into actionable knowledge
4. Update the relevant skill or segment
5. Mark as resolved

**Trigger conditions:** Unknown blocks goal progress, affects company operations, is recurring (2+ occurrences), or involves security/data loss.

---

## Namespace Priority

When a pattern applies to multiple contexts, the most specific wins:

| Scope | Tag | Priority |
|-------|-----|----------|
| Project-specific | `project:{name}` | **Highest** |
| Domain-specific | `domain:{type}` | Medium |
| Global | `global` | Lowest |

**Example:** A PowerShell rule in `project:paperclip` overrides a global PowerShell rule.

---

## Promotion Cheat-Sheet

| Trigger | Target |
|---------|--------|
| Correction pattern 3× in same category | Promote to HOT segment |
| New project-specific rule established | `segments/{project}*.md` |
| Global preference confirmed | `MEMORY.md` or `global` segment |
| Behavior change accepted by user | `SOUL.md` |
| Workflow gotcha surfaced | `TOOLS.md` |
| Long-lived decision with rejection context | Namespace segment w/ date prefix |

---

## Anti-Patterns: Hall of Shame

| # | Anti-Pattern | Why It Fails | Fix |
|---|-------------|--------------|-----|
| 1 | **Loading all daily files** | O(L) token cost; most are irrelevant | SSC Router loads only top-K matches |
| 2 | **Undated facts** | Can't assess staleness without a date | Every entry gets an ISO timestamp: "As of 2026-07-02" |
| 3 | **Storing derivable facts** | Duplicates source of truth; gets stale silently | Re-derive from the source (git log, config files, running state) |
| 4 | **Narrative entries** ("I then checked X, found Y, was confused") | Waste tokens on process, not knowledge | One fact per entry: what was decided and why |
| 5 | **Guessing staleness instead of checking live state** | Memory says service is on port 3000; it moved to 3100 last week | `Test-NetConnection` or `Test-Path` before acting on aged facts |
| 6 | **Storing corrections without promoting them** | Same mistake repeats because lesson stayed in `corrections.md` | After 3x same correction → promote to permanent segment or skill |
| 7 | **Never archiving** | Memory grows unbounded; retrieval degrades | 90-day rule: unused → COLD archive |
| 8 | **Creating segments manually without the router** | Segment exists but router doesn't know about it | Always update `index.json` when creating a segment |
| 9 | **Trusting old facts without re-verification** | "We decided X" from 60 days ago — the world changed | Apply staleness grade: Aging → re-verify every fact |
| 10 | **Treating inferred knowledge as extracted fact** | LLM guessed a pattern; it's not ground truth | Tag origin: EXTRACTED (from source) vs INFERRED (resolved, speculative) |
| 11 | **Deleting without confirmation** | Decay ≠ destruction | Mark, archive, then ask |
| 12 | **Tier mismatches** | HOT content never read, COLD content reloaded every session | Run the health check; fix the tiers |

---

## Verification: What "Live State Wins" Actually Means

Abstract principles need concrete commands. Here's how to verify before trusting memory:

```powershell
# File existence (does a referenced file still exist?)
Test-Path "C:\Users\ClawLabs\.openclaw\workspace\SOUL.md"

# Service reachability (is a service on the port memory claims?)
Test-NetConnection -ComputerName 127.0.0.1 -Port 3100   # Paperclip

# Config value (does the live config match what memory says?)
Get-Content "C:\Users\ClawLabs\.openclaw\config.yaml" | Select-String "model:"

# Process existence (is a process memory mentions still running?)
Get-Process -Name "node" -ErrorAction SilentlyContinue

# API response (does the endpoint still return what we expect?)
curl -s http://127.0.0.1:3100/health
```

If any of these contradict memory, **correct the memory entry immediately.** Do not add a footnote. Do not note "appears to have changed." Replace the stale fact with the live state and add a date.

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/setup.ps1` | Creates memory structure, copies scripts | `.\scripts\setup.ps1` |
| `scripts/ssc-router.ps1` | Query-time memory retrieval | `.\scripts\ssc-router.ps1 -Query "keyword" -DryRun` |
| `scripts/ssc-health.ps1` | Daily health check | `.\scripts\ssc-health.ps1` |
| `scripts/skill-optimizer.ps1` | Analyzes and patches skills | `.\scripts\skill-optimizer.ps1 -DryRun` |
| `scripts/research-loop.ps1` | BFS research with kill-switch | `.\scripts\research-loop.ps1 -Topic "query"` |

---

## Full Installation

### Option A: Minimal (SSC Only)
```powershell
.\scripts\setup.ps1
```

### Option B: Complete (SSC + Wiki)
```powershell
.\scripts\setup.ps1 -Wiki -Cron
```

### Option C: Manual
1. Create directories: `memory/segments/`, `memory/archive/`, `memory/checkpoints/`, `memory/daily/`
2. Copy scripts from `scripts/` to `memory/`
3. Copy `index.json` template
4. Create `corrections.md`
5. Add SSC protocol to AGENTS.md (see `templates/AGENTS-template.md`)

---

## Annual Maintenance

**Weekly (via cron):**
- Tier audit (HOT → WARM, COLD archive).
- Stale detection (no access in 30+ days → review).
- Convergence scan: same pattern logged in 2+ categories → unify.

**On session end:**
- Update `hot.md` with: last topic, decisions, next steps (under 500 words).
- Append to `memory/daily/YYYY-MM-DD.md`.
- Mark `.done` if a long task completed.

---

## Quick Reference

| What | Where | Format |
|------|-------|--------|
| Decisions + patterns | `memory/segments/s00N-*.md` | One fact per entry, dated |
| Corrections + mistakes | `memory/corrections.md` | Timestamped, last 50 |
| Current session state | `memory/hot.md` | Under 500 words |
| Archived (COLD) memory | `memory/archive/` | Unlimited |
| Resolved states | `memory/checkpoints/` | Snapshot, dated |
| Daily log | `memory/daily/YYYY-MM-DD.md` | Append-only |
| Segment router index | `memory/index.json` | All segments + metadata |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `accessCount` not updating | Script needs write access to `index.json` - check permissions |
| Encoding errors on Windows | Scripts use `-Encoding UTF8` - ensure files aren't BOM-encoded |
| `qmd embed` slow first run | Normal - downloads 333MB GGUF model, cached after first run |
| agentmemory won't start | Check if `iii.exe` is in PATH: `~\.local\bin\iii.exe` |
| Health check reports stale data | Run `.\ssc-health.ps1` manually to see current state |

---

**TL;DR discipline:** Date every fact. One fact per entry. Tier by usage. Load by relevance, not default. Map ≠ territory — live wins. Wait for 3× before promoting. Decay, don't delete.
