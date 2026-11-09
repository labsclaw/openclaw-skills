---
name: ultra-memory-skill
description: "Segmented Structured Context (SSC) memory architecture for LLM agents. Gated zero-cost retrieval, index routing, and hybrid wiki caching."
license: MIT
---

# Ultra Memory Skill (SSC Core)

Standardized memory architecture for long-running autonomous agents. Implements Progressive Disclosure: loads only the required segment into context on demand.

## Core Principles
1. **Never Assume Missing Context:** Always query the SSC Router (`node scripts/ssc-router.cjs "<query>"`) before declaring unknown state.
2. **Decisions & Facts Over Raw Logs:** Store structured decisions, reasons, and verifiable state changes. Do not dump raw transcripts.
3. **Strict Hierarchy:**
   - `MEMORY.md`: Core active index and high-value facts (< 150 lines).
   - `memory/segments/sXXX-*.md`: Domain-specific durable knowledge.
   - `memory/daily/YYYY-MM-DD.md`: Ephemeral session worklogs.

## Quick Lookup Matrix

| Operation | Action / Script | Reference File |
| :--- | :--- | :--- |
| Query memory / Search topic | `node scripts/ssc-router.cjs "<term>"` | `references/ssc-architecture.md` |
| Codebase knowledge graph | `graphify query/path/explain` | `references/graphify-integration.md` |
| Create new memory segment | Write `memory/segments/sXXX.md` + update `index.json` | `references/ssc-architecture.md` |
| **Audit memory integrity** | `node scripts/ssc-memory-lint.cjs` | `references/epistemic-integrity.md` |
| **Check if a fact is trustworthy** | Read its `confidence` field | `references/epistemic-integrity.md` |

## Epistemic Integrity (added 2026-11-08)

Retrieval tells you *where* a fact is. It does not tell you whether to trust it. Six fields in `index.json` fix that:

`confidence` (`certified` | `observed` | `inferred`) · `certifiedBy` · `certifiedAt` · `supersedes` · `supersededBy` · `lastUsedIn` · `correctionCount`

**Three rules that matter more than the fields:**

1. **`certified` requires a human.** An agent's conclusion is `inferred` until someone attests it. Absence of attestation is not attestation — legacy entries without a `confidence` field are treated as `inferred`.
2. **Frequency is not evidence.** Promotion to HOT requires `accessCount >= 3` **and** `confidence` certified/observed **and** `correctionCount == 0` **and** no unresolved `supersededBy`. Usage measures retrieval, not correctness; a wrong fact pulled three times looks identical to a right one.
3. **Fail closed.** An index with 0 segments is an **error**, never "clean". A wrong path that reports success is worse than a failure that names itself.

```bash
node scripts/ssc-memory-lint.cjs            # warn mode, exit 0
node scripts/ssc-memory-lint.cjs --strict   # exit 1 on blocking errors
node scripts/ssc-memory-lint.cjs --json     # machine-readable
```

Checks E0-E7 (blocking) and W1-W4 (advisory) are documented in `references/epistemic-integrity.md`, along with the corrected promotion gate, the rebuild-preservation fix, and what the router already does versus what it does not.

## Worklog Routine
For multi-step complex tasks, initialize and append via:
```bash
node scripts/worklog.cjs init "<task-title>"
node scripts/worklog.cjs append "<step-outcome>"
node scripts/worklog.cjs archive
```
