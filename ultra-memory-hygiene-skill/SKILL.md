---
name: ultra-memory-hygiene-skill
description: "Controls what enters persistent agent memory and how stale knowledge is revised. Use when recording decisions, updating durable context, consolidating daily notes, removing duplication, or deciding whether information should persist."
license: Apache-2.0
metadata:
  {
    "openclaw":
      {
        "emoji": "🧹",
      },
  }
---

# Ultra Memory Hygiene

Persistent memory should reduce future uncertainty without becoming a second noisy log.

## Admission Test

Persist an item only when it is durable, useful to a later operator, and expensive or risky to rediscover. Prefer:

- decisions with rationale and rejected alternatives;
- stable constraints and user preferences;
- verified system state that changes future actions;
- recurring failure lessons with a concrete prevention rule;
- pointers to authoritative artifacts when copying them would create drift.

Do not persist secrets, transient execution chatter, easily derived output, duplicate facts, or unresolved guesses.

## Write Format

Each durable entry should answer:

1. What is true or decided?
2. As of when or which revision?
3. Why does it matter?
4. What source can revalidate it?
5. What prior statement does it replace?

Use factual, actionable language. Record causes and constraints instead of vague evaluations.

## Placement

- Daily notes hold raw chronology awaiting consolidation.
- Thematic segments hold durable knowledge by subject.
- Checkpoints hold resolved operational state.
- The memory hub indexes high-value current state and points to detail.

Update the existing source of truth when one exists. Do not create parallel versions of the same fact.

## Staleness

Set revalidation cadence from volatility and consequence. Versions, endpoints, ownership, access, and personnel data age faster than architecture principles or historical decisions. When verification changes a fact, update or retire the old entry rather than appending a contradiction.
