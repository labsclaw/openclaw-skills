---
name: ultra-memory-hygiene-skill
description: "What deserves to persist, how to write for survival, when to re-verify. Complements OpenClaw memory architecture (segments/daily/checkpoints). Adapted from Rigor Pack memory-hygiene."
metadata:
  {
    "openclaw":
      {
        "emoji": "🧹",
      },
  }
---

# Ultra Memory Hygiene

What deserves to persist, how to write for survival, when to re-verify.

Adapted from [Rigor Pack memory-hygiene](https://github.com/anthropics/claude-code/tree/main/plugins/rigor-pack).

## Three Filters Before Writing

Before committing anything to persistent memory, ask:

1. **Will this matter in 48 hours?** If no, skip it. Daily noise is not memory.
2. **Is this already stored somewhere?** If yes, update in place. Duplication rots.
3. **Can someone act on this without asking me?** If no, rewrite until they can.

## How to Write for Survival

### One fact per entry, dated
Every persistent note gets a date and says one thing. "As of 2026-07-02" ages honestly. Undated memory is unreliable memory.

### Decisions, not events
- Bad: "Discussed the API design and decided to use REST"
- Good: "API: REST over GraphQL (reason: team knows REST, no graph schema needed)"

### Include the rejection
- What was considered and WHY it was rejected matters more than what was chosen.
- "Chose X over Y because Z" survives context loss. "Chose X" does not.

### Prefer facts over interpretations
- Bad: "The deployment was problematic"
- Good: "Deploy failed: rollback took 12 minutes, caused by missing env var DATABASE_URL"

## What NOT to Persist

- Derivable facts (git history, docker-compose output, file contents you can re-read)
- One-off fixes without the WHY
- Passwords, tokens, temporary credentials
- Narrative of process ("I then checked...")

## When to Re-Verify

| Content Type | Re-verify After | How |
|---|---|---|
| Version numbers | 7 days | Check actual files/configs |
| API endpoints | 30 days | Test the endpoint |
| File paths | 14 days | Confirm file exists |
| Decisions | When context changes | Re-read the decision record |
| Person/role info | 90 days | Confirm still accurate |

## Integration with OpenClaw Memory

- **daily/** → Raw events. Fold into segments every 7 days.
- **segments/** → Thematic knowledge. Re-verify quarterly.
- **checkpoints/** → Resolved states. Archive after 90 days.
- **hot.md** → Session context. Reset every session.
- **MEMORY.md** → Derived working memory. Update when segments change.

## Anti-Patterns

- **Diary mode**: Writing what happened instead of what matters.
- **Fear-of-forgetting**: Storing everything "just in case." Rotates out real signal.
- **Duplicate sources**: Same fact in 3 places, each slightly different.
- **Stale authority**: Citing a source you haven't checked in months.
