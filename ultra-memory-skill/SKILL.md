---
name: ultra-memory-skill
description: "Memory discipline for LLM agents — verify before trust, grade staleness, route surgically, never dump."
---

# Memory Discipline

Every memory has a grade, a tier, and a verification rule. Memory serves the next session, not the current ego.

---

## When NOT to Use This Skill

You don't need memory for:
- **One-off tasks.** "Summarize this file" — do it, done.
- **Derivable facts.** If `git log`, `docker-compose`, or `ls` gives the answer in 30 seconds, don't store it.
- **Transient state.** "Tests are running now" is stale before you write it.
- **Secrets.** Passwords, tokens, keys — never in memory.
- **This is not a wiki system.** Wiki setup lives in `scripts/`. This skill is about memory discipline only.

**Test:** Can you answer the question by running one command right now? If yes, don't persist it.

---

## Anti-Patterns (What Failure Looks Like)

| What You Do | Why It Hurts | What to Do Instead |
|---|---|---|
| Dump everything into MEMORY.md | O(n) reads, everything looks important, nothing is | Use the SSC Router — load only top-K segments |
| Store "PostgreSQL is version 16" | Derivable from docker-compose in 5s | Skip it |
| Trust memory without checking | Stale port numbers cause cascading failures | Verify live (see verification protocol) |
| Create 50 segments for one project | Router scoring breaks, too many entries | Merge into 2-3 well-tagged segments |
| Log every user message | Noise drowns signal | Log only corrections, preferences, patterns |
| Store "fixed the flaky test" | Done work, git log already records it | One-off fixes go in git, not memory |
| Say "I'll check later" when memory and live disagree | "Later" never happens, next session hits the same trap | Fix it now — update memory immediately |

---

## The SSC Router: Load Surgically

Your session startup: run the router, load top-K, build context. Never load everything.

```powershell
.\memory\ssc-router.ps1 -Query "deploy pipeline auth"
```

**Scoring:** `(keyword_hits × 2) + tag_hits + (weight × 0.5)`

**Rules:**
1. Run the script — never read segments manually.
2. Use the returned top-K, not all segments.
3. If the router returns nothing relevant, your memory doesn't have what you need — search live.

**Verification:** Run the router. If output is empty, your memory is incomplete. That's fine — go search live.

**Anti-pattern:** "I'll just read all segments to be thorough." → Wastes tokens, loads irrelevant context, model starts ignoring memory entirely.

---

## Staleness Grading: The One Rule That Matters

Grade every fact before acting on it. If you skip one rule, skip this one last.

| Memory Type | Staleness Risk | Verify Before Acting? |
|---|---|---|
| User preferences | LOW (months) | No |
| Decisions + WHY | LOW (weeks-months) | No — re-read for context |
| Non-obvious constraints | LOW (until refactored) | No — unless constraint may have changed |
| System state (versions, configs) | HIGH (days) | **YES — always verify live** |
| File locations, port numbers | HIGH (any deploy) | **YES — probe before acting** |
| API behavior, endpoint shapes | HIGH (any release) | **YES — test against live** |

### Verification Protocol (Not "Check Memory")

Verification means touching the real system. Not re-reading what you wrote.

| What to Verify | How | Example |
|---|---|---|
| File exists | `Test-Path "path/to/file"` | Must return `True` |
| Port alive | `Test-NetConnection localhost -Port 3100` | Must return `TcpTestSucceeded: True` |
| Endpoint responds | `curl http://localhost:3100/api/health` | Must return 200 |
| Version correct | Read config file, not memory | Compare actual vs remembered |
| Service running | `Get-Process` or `pm2 list` | Must show the process |

**Verification is a checklist, not a feeling.** If you can't run the check, say "unverified" — don't guess.

**Anti-pattern:** "Memory says port 3100, so I'll use 3100." → That was two weeks ago. Probe first.

---

## Memory vs Live: Live Always Wins

No exceptions. No "I'll update it later."

1. Trust the live system, not your memory.
2. Report the drift: "memory says X, live state shows Y."
3. Update the memory entry immediately.
4. Note vintage: "verified 2026-07-09" vs "as of last check."

**Anti-pattern:** "Memory says X but live says Y. I'll use live and mention it later." → "Later" never happens. Fix it now or the next session hits the same trap.

---

## What to Persist (and What Not To)

### Persist

- Decisions and the reasoning behind them (the WHY — that's what evaporates)
- User preferences that are confirmed (not one-offs)
- Non-obvious constraints ("deploy hook is armed, disarming requires approval")
- Patterns that repeated 3+ times
- Corrections and lessons learned

### Never Persist

| What | Why Not | Where It Already Lives |
|---|---|---|
| Secrets | Security risk | Vault, env vars |
| Derivable facts | Duplicated effort | git log, docker-compose, docs |
| One-off fixes | Done work | git log |
| Fast-changing state | Stale in days | Live probe |
| Session-bound context | No future value | Current conversation |

**The 30-second test:** Can a future session derive this from codebase, git, or docs in <30 seconds? If yes, don't persist it.

### Entry Format

Every memory entry must have:

```markdown
## [DATE] Topic

**Trigger:** when [condition], remember [fact]
**Why:** [reason this matters — the part that evaporates]
**Tier:** HOT | WARM | COLD
```

**One fact per entry, dated.** Undated facts rot invisibly. "As of 2026-07-02" ages honestly.

---

## Tiered Storage

| Tier | Location | Size Limit | When Loaded |
|---|---|---|---|
| HOT | `memory/segments/` (tier: "HOT") | ≤100 lines | Every session via SSC Router |
| WARM | `memory/segments/` (tier: "WARM") | ≤200 lines | On context match |
| COLD | `memory/archive/` | Unlimited | Explicit query only |

**Promotion/Demotion Rules:**

| Trigger | Action |
|---|---|
| 3× usage in 7 days | Promote to HOT |
| 30 days unused | Demote to WARM |
| 90 days unused | Archive to COLD |
| User confirmation required | Never delete without asking |

**Verification:** If you have >20 HOT segments, something is wrong. Most memory should be WARM or COLD.

**Anti-pattern:** Creating everything as HOT → If everything is HOT, nothing is HOT. The router can't distinguish importance.

---

## Learning Signals: Detect and Act

### Corrections
**Trigger:** User says "no," "actually," "wrong," "I prefer," "stop doing," "I told you before."
**Action:** Log to `memory/corrections.md`. After 3 occurrences, evaluate for segment creation.
**Anti-pattern:** "It only happened once." → Corrections that happen once will happen again. Log it.

### Preferences
**Trigger:** User says "always do X," "never do Y," "my style is..."
**Action:** Log to relevant segment. Confirm on next mention before persisting.
**Anti-pattern:** Persisting a preference stated once in passing → Wait for confirmation or repeat mention.

### Pattern Candidates
**Trigger:** Same instruction repeated 3×, workflow works well repeatedly, user praises approach.
**Action:** After 3×, promote to segment with `tier: "HOT"`.
**Anti-pattern:** Promoting after 1× → One occurrence is coincidence. Three is a pattern.

---

## Self-Reflection Protocol

After significant work, ask three questions:

1. **Did it meet expectations?** Compare outcome vs intent.
2. **What could be better?** One improvement — not ten.
3. **Is this a pattern?** If yes, log to `memory/corrections.md`.

**Format:**
```markdown
CONTEXT: [type of task]
REFLECTION: [what I noticed]
LESSON: [what to do differently]
```

**When to reflect:** After multi-step tasks, after feedback, after fixing mistakes.

**Promotion:** Self-reflection entries follow the same 3× rule → promote to HOT.

---

## Namespace Isolation

Tag memory to avoid cross-contamination:

- **Project patterns** → `project:{name}`
- **Domain patterns** → `domain:{type}`
- **Global preferences** → `global`

**Priority:** project > domain > global (most specific wins).

---

## Map Is Not the Territory

Your prompts and context are the map. The real system is the territory.

When you hit unknown territory:
1. Classify: known-unknown or unknown-unknown?
2. Search the web if it blocks progress.
3. Log to `memory/corrections.md` as `knowledge_gap`.
4. Update the relevant skill or segment.

**Trigger for web search:** Unknown blocks an active goal, affects company operations, is a recurring pattern (2×+), or involves security/production.

---

## Multi-Memory Types

| Type | Location | Purpose |
|------|----------|---------|
| Semantic | `memory/semantic-patterns.json` | Abstract patterns, rules |
| Episodic | `memory/episodic/` | Specific experiences |
| Working | `memory/working/` | Current session context |
| Procedural | `memory/segments/` (tag: `procedural`) | Skills, workflows, how-to |

## Memory Decay

Not all memories live forever. Compute a decay score:

```
score = (0.4 × recency) + (0.3 × frequency) + (0.3 × importance)
```

| Score | Action |
|---|---|
| ≥ 0.5 | Keep in current tier |
| < 0.3 | Archive to COLD |
| < 0.1 | Soft delete (mark, don't remove) |

**Verification:** Run the health check weekly. If total memory size grows >20% month-over-month, decay isn't working.

---

## Replay Learnings: Learn from Past Mistakes

Before starting a task, pull relevant past errors:

1. Extract keywords from task description.
2. Search `corrections.md` and relevant segments.
3. Include error context — not just what to do, but *why it went wrong*.
4. Flag sessions with >20% correction rate.

**Integration:** SSC Router returns knowledge. Replay returns error context. Use both.

---

## Plan Gate for Complex Memory Operations

When a memory task is non-trivial (multi-segment creation, bulk migration, tier restructuring), use this format before executing:

```markdown
## Plan Gate: [task name]

### GOAL
What we're trying to achieve.

### UNKNOWNS
What we don't know yet. If unknowns block execution, resolve them first.

### SUCCESS CRITERIA
How we know it's done. Measurable, specific.

### STEPS
1. ...
2. ...

### OUT OF SCOPE
What we're explicitly NOT doing.
```

**Rule:** If you can't fill in SUCCESS CRITERIA, the task is too vague. Break it down.

---

## Health Check

Run weekly (or set up a cron):

```powershell
.\memory\ssc-health.ps1
```

**Monitors:** segment count, daily log freshness, checkpoint integrity, total size, tier promotion/demotion.

**Cron config:**

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: powershell -ExecutionPolicy Bypass -File <workspace>\\memory\\ssc-health.ps1. If HEALTHY, respond OK. If ATTENTION NEEDED, report issues."
  },
  "delivery": { "mode": "announce", "channel": "telegram" }
}
```

**Anti-pattern:** "I'll do a health check eventually." → Set up the cron job. Forget to check = problems accumulate silently.

---

## Quick Start

```powershell
.\scripts\setup.ps1                          # Minimal (SSC only)
.\scripts\setup.ps1 -Wiki                    # Full with wiki
```

Then add the SSC protocol to AGENTS.md (see `templates/AGENTS-template.md`).

## Scripts Reference

| Script | Purpose |
|---|---|
| `ssc-router.ps1` | Query memory by keyword/tag — run this, not manual reads |
| `ssc-health.ps1` | Daily integrity check |
| `setup.ps1` | Initial setup (`-Wiki` for full install) |
| `ssc-promote.ps1` | Tier promotion/demotion |

## References

- **Paper:** [Memory Caching: RNNs with Growing Memory](https://arxiv.org/abs/2602.24281) — Behrouz et al. (Google, 2026)
- **Implementation:** Dr. Roger Oliveira + Justus (AI Agent)
- **Organization:** [LabsClaw](https://github.com/labsclaw)

## License

MIT
