---
name: ultra-models-skill
description: "Audit model catalogs, dead entries, provider health, fallbacks, and routing with dated evidence."
license: Apache-2.0
---

# Model Catalog Operations

Compare configured model catalogs with current provider evidence. Keep credentials out of prompts, logs, commands, and reports.

## Choose the operation

| Request | Operation | Completion criterion |
| --- | --- | --- |
| Find dead or new models | Audit catalog | Every provider is healthy, unavailable, or unauthenticated, and every difference has evidence. |
| Repair a catalog | Audit, inspect references, patch confirmed differences | Catalog, aliases, and fallback chains agree after validation. |
| Diagnose routing | Inspect provider and local bridge health | The failing boundary and a supported recovery are identified. |
| Recommend allocation | Build a current capability map | The recommendation names its evidence date and provider limits. |
| Restrict visible providers in chat / UI | Configure model policy allowlist | Channel pickers and `/models` show only approved providers without unexpected built-in models. |

## Procedure

1. Define the provider and catalog in scope. Finish when unrelated providers and paid-model decisions are excluded.
2. Read `references/model-catalog-operations.md` only for the relevant command and evidence format. Finish when the smallest applicable operation is selected.
3. Run the operation read-only first. Finish when provider failures are separated from missing model IDs.
4. Classify a model as dead only when an authenticated live catalog excludes it. Preserve entries for unavailable or unauthenticated providers.
5. Before a repair, inspect aliases, fallback chains, and policies for each affected ID. Finish when every downstream reference is accounted for.
6. When restricting provider visibility in chat commands (`/models`) or channel UI pickers (Telegram, Discord, Control UI), configure `agents.defaults.modelPolicy.allow` with provider prefix wildcards (`provider/*`). Do not rely on `models.mode: "replace"` alone, as native built-in provider catalogs remain discoverable unless explicitly restricted by policy.
7. Apply the smallest reversible change only when the user authorized mutation. Re-run the audit and finish when catalogs match with no orphan aliases or broken fallbacks.
8. Report counts, dated evidence, unresolved providers, and any rollback artifact. Never include credential values.

## Guardrails

- Do not infer provider availability from a failed local bridge.
- Do not remove paid or out-of-scope entries during a free-model audit.
- Do not execute `scripts/_shared.ps1` directly.
- Do not copy secrets into scripts, reports, chat, or command arguments.
- Treat capability scores as heuristics, not provider guarantees.
- Always sanitize `agents.defaults.model.fallbacks` when retiring a model ID to prevent broken fallback loops.
