---
name: ultra-memory-skill
description: "Memory discipline for LLM agents — gated retrieval, staleness grading, tiered storage, and anti-forgetting."
---

# Ultra Memory Skill

Zero-cost memory architecture. Every fact has a grade, a tier, and a verification rule. Memory exists to serve the next session, not to be impressive.

## When NOT to Use This Skill

- **One-off tasks** — "read this file and summarize it" doesn't need memory
- **Simple lookups** — if it's in the current context, don't persist it
- **Transient state** — "tests are running now" ages out immediately
- **Derivable facts** — if git, docs, or `ls` gives you the answer in 30s, don't store it
- **Secrets** — passwords, tokens, keys NEVER go in memory
- **This is not a wiki system** — wiki setup is in `scripts/` and a separate reference doc. This skill is about memory discipline.

## Anti-Pattern Hall of Shame

| Pattern | Why It's Bad | Fix |
|---------|-------------|-----|
| Dumping everything into MEMORY.md | One giant file, O(n) reads, everything looks important | Use SSC Router to load only relevant segments |
| Storing "PostgreSQL is version 16" | Derivable from docker-compose in 5s | Don't persist derivable facts |
| Never verifying before acting | Stale port numbers cause cascading failures | Staleness Grading table says "verify live" |
| Creating 50 segments for one project | Router scoring breaks, too many entries | Merge into 2-3 well-tagged segments |
| Logging every user message | Noise drowns signal, corrections.md becomes useless | Log only corrections, preferences, and patterns |
| Storing "fixed the flaky test" | Done work, git log already records it | One-off fixes go in git, not memory |

## The SSC Router

Your session startup is: run the router, load top-K segments, build context. Never load everything.

```powershell
.\memory\ssc-router.ps1 -Query "deploy pipeline auth"
```

**Scoring formula:** `score = (keyword_hits × 2) + tag_hits + (weight × 0.5)`

**Rules:**
1. Run the script — never read segments manually
2. Use the returned top-K, not all segments
3. If the router returns nothing relevant, your memory doesn't have what you need — search live

**Anti-pattern:** "I'll just read all segments to be thorough." → Wastes tokens, loads irrelevant context, model starts ignoring memory entirely.

## Staleness Grading

Grade every fact before acting on it. This is the single most important rule.

| Memory Type | Staleness Risk | Verify Before Acting? |
|---|---|---|
| User preferences | LOW (months) | No |
| Decisions + WHY | LOW (weeks-months) | No — re-read for context |
| Non-obvious constraints | LOW (until refactored) | No — unless constraint may have changed |
| System state (versions, configs) | HIGH (days) | **YES — always verify live** |
| File locations, port numbers | HIGH (any deploy) | **YES — probe before acting** |
| API behavior, endpoint shapes | HIGH (any release) | **YES — test against live** |

**Verification is not "check memory."** Verification means:
- File exists: `Test-Path "path/to/file"`
- Port alive: `Test-NetConnection localhost -Port 3100`
- Endpoint responds: `curl http://localhost:3100/api/health`
- Version correct: check config file, not memory

**Anti-pattern:** "Memory says port 3100, so I'll use 3100." → That was two weeks ago. Probe first.

## When Memory and Live State Disagree

**Live state wins. Always.** No exceptions.

1. Trust the live system, not your memory
2. Report the drift: "memory says X, live state shows Y"
3. Update the memory entry immediately
4. Note vintage: "verified just now" vs "as of last check"

**A contradicted memory left standing bites the next session.**

**Anti-pattern:** "Memory says X but live says Y. I'll use live and mention it later." → "Later" never happens. Fix it now.

## What to Persist (and What Not To)

### Persist
- Decisions and the reasoning behind them
- User preferences that are confirmed (not one-offs)
- Non-obvious constraints ("deploy hook is armed, disarming requires approval")
- Patterns that repeated 3+ times
- Corrections and lessons learned

### Do NOT Persist

| Never Persist | Why | Derivable From |
|---|---|---|
| Secrets | Security risk | Vault, env vars |
| Derivable facts | Duplicated effort | git log, docker-compose, docs |
| One-off fixes | Done work | git log |
| Fast-changing state | Stale in days | Live probe |
| Session-bound context | No future value | Current conversation |

**Rule:** If a future session can derive it from codebase, git, or docs in <30 seconds, do not persist it.

### Entry Format

Every memory entry must have:

```markdown
## [DATE] Topic

**Trigger:** when [condition], remember [fact]
**Why:** [reason this matters — the part that evaporates]
**Tier:** HOT | WARM | COLD
```

**One fact per entry, dated.** Undated facts rot invisibly. "As of 2026-07-02" ages honestly.

## Tiered Storage

| Tier | Location | Size Limit | When Loaded |
|------|----------|------------|-------------|
| HOT | `memory/segments/` (tier: "HOT") | ≤100 lines | Every session via SSC Router |
| WARM | `memory/segments/` (tier: "WARM") | ≤200 lines | On context match |
| COLD | `memory/archive/` | Unlimited | Explicit query only |

### Promotion/Demotion Rules

| Trigger | Action |
|---------|--------|
| 3× usage in 7 days | Promote to HOT |
| 30 days unused | Demote to WARM |
| 90 days unused | Archive to COLD |
| User confirmation required | Never delete without asking |

**Anti-pattern:** Creating everything as HOT. → If everything is HOT, nothing is HOT. The router can't distinguish importance.

## Learning Signals

Detect and act on these patterns during conversation:

### Corrections
**Trigger:** User says "no," "actually," "wrong," "I prefer," "stop doing," "I told you before."
**Action:** Log to `memory/corrections.md`. Evaluate for segment creation after 3×.
**Anti-pattern:** Ignoring corrections because "it only happened once." → Corrections that happen once will happen again. Log it.

### Preferences
**Trigger:** User says "always do X," "never do Y," "my style is..."
**Action:** Log to relevant segment or MEMORY.md. Confirm on next mention.
**Anti-pattern:** Persisting a preference the user stated once in passing. → Wait for confirmation or repeat mention.

### Pattern Candidates
**Trigger:** Same instruction repeated 3×, workflow works well repeatedly, user praises approach.
**Action:** After 3×, promote to segment with `tier: "HOT"`.
**Anti-pattern:** Promoting after 1×. → One occurrence is coincidence. Three is a pattern.

## Self-Reflection Protocol

After significant work, evaluate:

1. **Did it meet expectations?** Compare outcome vs intent.
2. **What could be better?** Identify one improvement.
3. **Is this a pattern?** If yes, log to `memory/corrections.md`.

**When to reflect:** After multi-step tasks, after feedback, after fixing mistakes.

```markdown
CONTEXT: [type of task]
REFLECTION: [what I noticed]
LESSON: [what to do differently]
```

**Promotion:** Self-reflection entries follow same 3× rule → promote to HOT.

## Namespace Isolation

- **Project patterns** → tag `project:{name}`
- **Domain patterns** → tag `domain:{type}`
- **Global preferences** → tag `global`
- **Priority:** project > domain > global (most specific wins)

## Map is Not the Territory

Your prompts and context are the map. The real system is the territory. When you hit unknown territory:

1. Classify the unknown (known-unknown? unknown-unknown?)
2. Search the web if it blocks progress
3. Log to `memory/corrections.md` as `knowledge_gap`
4. Update the relevant skill or segment

**Trigger conditions for web search:** Unknown blocks an active goal, affects company operations, is a recurring pattern (2×+), or involves security/production.

## Background Memory Formation

Extract insights after conversations, not during:

1. Conversation ends → session summary saved
2. Background job → extract insights to semantic/episodic memory
3. Consolidate similar memories (similarity threshold: 0.9)

**Why:** Real-time extraction slows conversations. Background processing yields higher quality.

## Memory Decay

Not all memories should live forever. Decay score:

```
score = (0.4 × recency) + (0.3 × frequency) + (0.3 × importance)
```

| Score | Action |
|-------|--------|
| ≥ 0.5 | Keep in current tier |
| < 0.3 | Archive to COLD |
| < 0.1 | Soft delete (mark, don't remove) |

## Replay Learnings

Before starting a task, pull relevant past errors:

1. Extract keywords from task description
2. Search `corrections.md` and `semantic-patterns.json`
3. Include error context — not just what to do, but *why it went wrong*
4. Flag sessions with >20% correction rate

**Integration with SSC Router:** Router returns knowledge. Replay returns error context. Use both.

## Multi-Memory Types

| Type | Location | Purpose |
|------|----------|---------|
| Semantic | `memory/semantic-patterns.json` | Abstract patterns, rules |
| Episodic | `memory/episodic/` | Specific experiences |
| Working | `memory/working/` | Current session context |
| Procedural | `memory/segments/` (tag: `procedural`) | Skills, workflows, how-to |

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

## Health Check

Run daily via cron:

```powershell
.\memory\ssc-health.ps1
```

**Monitors:** segment count, daily log freshness, checkpoint integrity, total size, tier promotion/demotion.

**Anti-pattern:** "I'll do a health check eventually." → Set up the cron job. Forget to check = problems accumulate silently.

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `ssc-router.ps1` | Query memory by keyword/tag | `-Query "term"` |
| `ssc-health.ps1` | Daily integrity check | No args |
| `setup.ps1` | Initial setup | `-Wiki` flag for full install |
| `ssc-promote.ps1` | Tier promotion/demotion | Manual or cron |

## Quick Start

```powershell
.\scripts\setup.ps1                          # Minimal (SSC only)
.\scripts\setup.ps1 -Wiki                    # Full with wiki
```

Then add the SSC protocol to AGENTS.md (see `templates/AGENTS-template.md`).

## Cron Health Check

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *", "tz": "America/Sao_Paulo" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: powershell -ExecutionPolicy Bypass -File <workspace>\\memory\\ssc-health.ps1"
  },
  "delivery": { "mode": "announce", "channel": "telegram" }
}
```

## References

- **Paper:** [Memory Caching: RNNs with Growing Memory](https://arxiv.org/abs/2602.24281) — Behrouz et al. (Google, 2026)
- **Implementation:** Dr. Roger Oliveira + Justus (AI Agent)
- **Organization:** [LabsClaw](https://github.com/labsclaw)

## License

MIT
