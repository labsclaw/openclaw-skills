---
name: ultra-memory-skill
description: "Segmented Structured Context (SSC) memory architecture for LLM agents. Gated zero-cost retrieval, index routing, and hybrid wiki caching."
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

## Worklog Routine
For multi-step complex tasks, initialize and append via:
```bash
node scripts/worklog.cjs init "<task-title>"
node scripts/worklog.cjs append "<step-outcome>"
node scripts/worklog.cjs archive
```
