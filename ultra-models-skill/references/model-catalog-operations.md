# Model Catalog Operations

Consult only the section needed for the current request.

## Operations

| Need | Script | Expected evidence |
| --- | --- | --- |
| Compare config with live catalogs | `scripts/sync-config.ps1` | Dead IDs, new IDs, orphan aliases, and broken fallbacks |
| Generate provider inventory | `scripts/list-free-models.ps1` | Provider-grouped live model IDs |
| Inspect Antigravity | `scripts/list-antigravity-models.ps1` | IDs returned by the local proxy |
| Inspect KiloCode metadata | `scripts/kilo-free-detail.ps1` | Free-model metadata from KiloCode |
| Build capability map | `scripts/build-model-map.ps1` | Dated JSON map with provider availability and heuristic scores |
| Produce routing plan | `scripts/plan-routing.ps1` | Mission-specific routing and fallback plan |
| Produce consolidated report | `scripts/report-final.ps1` | Human-readable health and recommendation report |
| Legacy cross-check | `scripts/compare-config.ps1` | Config versus provider comparison |

Do not execute `scripts/_shared.ps1` directly. It contains shared functions used by the other scripts.

## Provider interpretation

| Provider | Catalog evidence | Availability rule |
| --- | --- | --- |
| OpenRouter | Authenticated models endpoint | Treat a model as free only when catalog pricing is zero |
| OpenCode Zen | Authenticated models endpoint | Use the current returned IDs; do not infer availability from historical names |
| KiloCode | Authenticated gateway catalog | Use the provider free-model flag |
| NVIDIA NIM | Authenticated models endpoint | Use the current catalog and the script's free-model filter |
| Antigravity | Local `/v1/models` endpoint | Treat returned IDs as currently served by the proxy |

A missing credential or unreachable endpoint means `unauthenticated` or `unavailable`, not `dead`.

## Audit sequence

1. Run the smallest read-only script for the scoped provider.
2. Capture the run time, provider status, configured IDs, live IDs, and differences.
3. Confirm every removal against an authenticated live catalog.
4. Inspect aliases, fallback chains, and model policies before mutation.
5. Preserve a rollback artifact when changing configuration.
6. Re-run the comparison and verify zero unintended differences.

## Routing and capability maps

The capability and role-fit values produced by the scripts are heuristics. Use them to compare candidates, then disclose the evidence date and any unavailable provider. Do not present a heuristic score as a benchmark result.

## Credential handling

Use the configured provider authentication flow. Never place keys in command arguments, generated reports, or chat. If authentication is unavailable, stop that provider branch and report it separately.
