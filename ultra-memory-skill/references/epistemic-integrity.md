# Epistemic integrity layer

## Review qualification, 2026-11-09

This reference preserves Robin's original proposal and source-candidate description below, not a deployment certificate. There are **seven**, not six, metadata fields. The authoritative operational procedure is [evidence-gate.md](evidence-gate.md). In particular:

- Human certification is not universal permission to act or proof of current truth; observed live-source facts are usable without certifying every memory, and certified facts can expire or conflict.
- Select an explicit workspace/index, never the ancestor with most segments. Use `--strict`; warn-mode exit zero is not a trustworthy gate. E0 is enforced in the CLI, not in exported `lintIndex()`.
- The original counts below describe the collaborator's workspace at the cited date, not Justus's current index. No bulk certification has been performed.
- Rebuild-preservation tests validate the candidate script only. Existing installed/deployed rebuild scripts must pass their own preservation test before index metadata can be relied on. Never replace a newer multi-collection rebuild with this older two-collection implementation.
- `tier` is numeric in the live ranker; a string `HOT` is not a compatible cache-priority representation. Use a separate cache marker. Do not reset correction history to regain certification; create a new attested version.
- The current router already returns zero matches for unrelated tokens. Partial matches, not unconditional top-K, are the concern. The optional evidence helper checks exact source bytes and structured facets but cannot establish semantic entailment or completeness of the provided claims.

Added 2026-11-08. Answers the question the SSC architecture did not answer: **can I trust this fact?**

The original design optimised *retrieval* — where is the information, how do I find it, when do I promote it. It never encoded *how well-attested* a fact is. A decision the owner made and an agent's guess entered `index.json` with identical weight and identical standing. This layer fixes that.

## The six fields

Added to `index.json` segment entries. The index had 11 fields; these are 12-18.

| Field | Type | Values | Meaning |
|---|---|---|---|
| `confidence` | string | `certified` \| `observed` \| `inferred` | How well-attested the fact is |
| `certifiedBy` | string | — | Who attested it (required when `certified`) |
| `certifiedAt` | ISO-8601 | — | When the attestation happened (required when `certified`) |
| `supersedes` | id[] | — | Facts this entry replaces |
| `supersededBy` | id[] | — | Facts that replace this entry |
| `lastUsedIn` | taskId[] | — | Receipts: which tasks consumed this entry |
| `correctionCount` | integer | ≥ 0 | Corrections applied after certification |

### The three confidence levels

**`certified`** — a human approved it. Only these may drive a decision without a re-check. Requires `certifiedBy` and `certifiedAt`, and `correctionCount == 0` (a correction invalidates the attestation).

**`observed`** — verified against a live source during the session. Usable, but the source can drift. Re-verify before a costly decision.

**`inferred`** — the agent's own conclusion, a guess, or a legacy entry with no attestation. **Never** present as established fact. Usable as a hypothesis only.

Legacy entries without a `confidence` field are treated as `inferred` until certified. Absence of attestation is not attestation.

## The linter is the enforcement

A rule written only in prose is a suggestion. `scripts/ssc-memory-lint.cjs` turns the fields into an executable check.

```bash
node scripts/ssc-memory-lint.cjs            # warn mode — advisory, exit 0
node scripts/ssc-memory-lint.cjs --strict   # exit 1 on blocking errors (cron/CI)
node scripts/ssc-memory-lint.cjs --json     # machine-readable
node scripts/ssc-memory-lint.cjs --index <path>   # explicit index.json
```

### Checks

**Errors** (blocking under `--strict`):

| Code | Condition |
|---|---|
| E0 | Index has 0 segments — refuses to report "clean" |
| E1 | Duplicate segment id |
| E2 | Segment file referenced but missing, or no `file` field |
| E3 | Same file referenced by two entries |
| E4 | `supersedes`/`supersededBy` points to an unknown id |
| E5 | Supersession is not reciprocal (A supersedes B but B does not list A) |
| E6 | `confidence` outside the enum |
| E7 | `certified` without `certifiedBy` or without `certifiedAt` |

**Warnings** (advisory):

| Code | Condition |
|---|---|
| W1 | No `confidence` field (legacy entry) |
| W2 | `accessCount > 0` but no `lastUsedIn` receipts — usage with no trace |
| W3 | `certified` but `correctionCount > 0` — certification may be stale |
| W4 | `tier: HOT` and last updated more than 90 days ago |

### Why E0 exists

During implementation the linter's `findWorkspace()` walked up the directory tree and stopped at the first `memory/index.json` it found — which was an **empty** index one level up. Result: *"Clean — no integrity issues found"* on a zero-segment index.

That is the exact failure mode this layer exists to prevent: **success reported on unverified data**. Fixed two ways:

1. collect every candidate `memory/index.json` going up the tree and pick the one with the most segments
2. fail closed — 0 segments is an error, never "clean"

A wrong path that reports success is worse than a failure that names itself.

## Corrected promotion gate

The original rule was `3x usage in 7 days → Promote to HOT`. That is a **defect**, not a policy: usage measures retrieval, not correctness. A wrong fact pulled three times is indistinguishable from a right one — and repeating a wrong fact is the most efficient way to make it permanent.

All four conditions are now required:

| Condition | Why |
|---|---|
| `accessCount >= 3` within 7 days | It is actually being reached |
| `confidence` is `certified` or `observed` | A human attested it, or it was verified |
| `correctionCount == 0` since certification | Corrections invalidate the attestation |
| No unresolved `supersededBy` | Serving a superseded fact is worse than serving nothing |

If any condition fails, the segment stays where it is and the gap is reported. `accessCount` without `lastUsedIn` receipts (W2) does not count toward promotion — usage with no trace is unverifiable.

## Rebuild must preserve the layer

`scripts/ssc-rebuild.cjs` regenerates `index.json` from the segment files on disk. Before the fix it rebuilt each entry from scratch and **dropped unknown fields**, so every rebuild silently erased certification, supersession history, and receipts.

This is data loss, not cosmetics: the router would keep serving facts whose provenance had just been deleted. Fixed by spreading the epistemic fields through when present. Regression test: `tests/test-memory-lint.cjs` Suite 6 runs the rebuild in a child process against a temp workspace and asserts all six fields survive. The test fails if the fix is removed — verified.

## What the router already does (and what it does not)

The zero-match gate **already exists**: `ssc-router.cjs` only scores an entry when `bm25Score > 0 || keywordHits > 0 || tagHits > 0`. A nonsense query returns `Top 0 of 0`. Verified empirically 2026-11-08.

The real gap is different: **a single common word saturates the top-K.** Measured against 73 segments:

| Query | Matches |
|---|---|
| `config` | 48 |
| `memory` | 53 |
| `pipeline` | 32 |
| `skill` | 27 |

The gate stops *zero* matches but not *weak* matches. A query with one generic token returns a confident-looking top-5 built on noise. Mitigation: pass multiple specific terms, or set `--top=N` deliberately. A score threshold is **not** implemented — if added, measure it rather than assume.

## Explicit zero weight must survive

`resolveEntryWeight()` and `resolveTierMultiplier()` exist because `entry.weight || 1.0` collapses a deliberate `0` into the default `1.0`. A segment weighted 0 means "do not boost", not "use the default". Same for `config.tier1Weight`. Both are exported and unit-tested.

## Current state (2026-11-08)

```
74 segments · 1 certified · 0 observed · 0 inferred · 73 legacy · 0 errors
```

The 73 legacy entries are W1 warnings only — nothing blocking. `--strict` exits 0. Migrating them to the new fields is the remaining work; until then the layer exists but is mostly unused.

## Pending work

1. **Migrate the 73 legacy segments** to `confidence`. Without this the layer is structure without content.
2. **Wire `correctionCount`** into the correction flow. The Corrections Log exists but is disconnected from the segment that caused the correction. This closes the loop.
3. **Score threshold in the router** — not implemented; the current mitigation is textual.
4. **`E0` has no isolated unit test** — covered by integration (the real index has segments) and verified empirically during the `crew/memory` bug, but not as a standalone case.

## Provenance

Adapted from [NVIDIA/auto-ontology](https://github.com/NVIDIA/auto-ontology) (Apache-2.0): the certified-definition cycle, "fail closed" query validation, and the "a successful execution does not prove the question was answered" principle. The stack was deliberately not adopted — our memory is Markdown + JSON on disk, not Next.js/FastAPI/Postgres.
