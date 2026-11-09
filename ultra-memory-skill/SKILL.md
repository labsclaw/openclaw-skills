---
name: ultra-memory-skill
description: "Segmented Structured Context (SSC) memory architecture for LLM agents. Gated zero-cost retrieval, index routing, and hybrid wiki caching."
license: MIT
---

# Ultra Memory Skill (SSC Core)

Standardized memory architecture for long-running autonomous agents. Implements Progressive Disclosure: loads only the required segment into context on demand.

## Core Principles
1. **Never Assume Missing Context:** Always query the SSC Router (`node scripts/ssc-router.cjs query "<query>"`) before declaring unknown state. Search relevance is not factual support.
2. **Decisions & Facts Over Raw Logs:** Store structured decisions, reasons, and verifiable state changes. Do not dump raw transcripts.
3. **Strict Hierarchy:**
   - `MEMORY.md`: Core active index and high-value facts (< 150 lines).
   - `memory/segments/sXXX-*.md`: Domain-specific durable knowledge.
   - `memory/daily/YYYY-MM-DD.md`: Ephemeral session worklogs.

## Quick Lookup Matrix

| Operation | Action / Script | Reference File |
| :--- | :--- | :--- |
| Query memory / Search topic | `node scripts/ssc-router.cjs query "<term>"` | `references/ssc-architecture.md` |
| Codebase knowledge graph | `graphify query/path/explain` | `references/graphify-integration.md` |
| Create new memory segment | Write `memory/segments/sXXX.md` + update `index.json` | `references/ssc-architecture.md` |
| **Audit memory integrity** | `node scripts/ssc-memory-lint.cjs --strict --index /absolute/workspace/memory/index.json` | `references/epistemic-integrity.md` |
| **Check factual support and coverage** | Verify source, currency, conflicts and required facets | `references/evidence-gate.md` |
| **Run optional evidence gate / isolated pilot** | `scripts/ssc-evidence.cjs` / `tests/test-evidence.cjs` | `references/evidence-gate.md` |

## Epistemic Integrity (added 2026-11-08)

Retrieval tells you *where* a candidate is. Seven metadata fields help inspect its history; metadata alone does not establish truth:

`confidence` (`certified` | `observed` | `inferred`) · `certifiedBy` · `certifiedAt` · `supersedes` · `supersededBy` · `lastUsedIn` · `correctionCount`

**Three rules that matter more than the fields:**

1. **`certified` requires a human attestation.** Directly verified sources may be `observed` without a general human approval gate. Conclusions are `inferred`; legacy metadata is unverified until checked. Verify each relevant claim, not every sentence by inheritance from a segment label.
2. **Frequency is not evidence.** HOT is cache priority, never certification. Before promotion, check source, currency, corrections and supersession. A seven-day usage rule requires timestamped task receipts; cumulative `accessCount` cannot prove it. Historical corrections remain recorded even after a new valid attestation.
3. **Fail closed for decision support.** Use the linter with `--strict` and an explicit index path. Its default warn mode can return exit 0 despite errors. An empty index is unverified, never evidence of trustworthy memory.

```bash
node scripts/ssc-memory-lint.cjs            # warn mode, exit 0
node scripts/ssc-memory-lint.cjs --strict   # exit 1 on blocking errors
node scripts/ssc-memory-lint.cjs --json     # machine-readable
```

Checks E0-E7 (blocking under `--strict`) and W1-W4 (advisory) are documented in `references/epistemic-integrity.md`. Its E0 empty-index check is CLI-only; importing `lintIndex()` alone does not enforce E0. Never choose a workspace because it has more segments.

For operational use, follow `references/evidence-gate.md`: declare required facets, resolve scoped aliases, inspect successors and conflicts, verify exact source bytes and return evidence receipts or explicit gaps. The optional helper enforces this contract on declared structured claims, not free-text understanding or corpus completeness. Do not overwrite a newer runtime router/rebuild with bundled older copies; test and synchronize exact files with backups. Before storing metadata in an existing index, test that the deployed rebuild preserves it; the PR's fix does not prove deployment. Separate claims JSON files used by the optional gate are not rewritten by the router/rebuild. Do not auto-certify legacy entries.

## Worklog Routine
For multi-step complex tasks, initialize and append via:
```bash
node scripts/worklog.cjs init "<task-title>"
node scripts/worklog.cjs append "<step-outcome>"
node scripts/worklog.cjs archive
```
