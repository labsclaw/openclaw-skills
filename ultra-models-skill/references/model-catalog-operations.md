# Model Catalog Operations

Consult only the section needed for the current request.

## Operations

| Need | Script | Expected evidence |
| --- | --- | --- |
| Compare config with live catalogs | `scripts/sync-config.ps1` | Dead IDs, new IDs, orphan aliases, and broken fallbacks |
| Generate provider inventory | `scripts/list-free-models.ps1` | Provider-grouped live model IDs |
| Inspect OpenCode only | `scripts/list-opencode-models.ps1 -Json` | Refreshed CLI catalog, zero-price IDs, explicit catalog-only evidence |
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
| OpenCode | Native CLI `models opencode --verbose --refresh --pure` | Zero numeric input/output and cache prices; listing is not auth or inference evidence |
| KiloCode | Authenticated gateway catalog | Use the provider free-model flag |
| NVIDIA NIM | Authenticated models endpoint | Use the current catalog and the script's free-model filter |
| Antigravity | Local `/v1/models` endpoint | Treat returned IDs as currently served by the proxy |

A missing credential or unreachable endpoint means `unauthenticated` or `unavailable`, not `dead`.

## OpenCode CLI boundary

OpenCode uses its existing local login. Do not read/copy its auth store, require `OPENCODE_API_KEY`, call the old `/zen/v1/models` endpoint, or recreate CLI headers for catalog discovery. The shared collector resolves the native Windows executable (or `OPENCODE_BIN`), uses no shell, and bounds execution to 45 seconds. It refreshes the CLI model cache; this is not authenticated live API exclusion evidence.

The five inventory/comparison consumers use `_opencode.ps1` and `opencode-catalog.cjs`. The collector returns an allowlisted metadata shape, `status: catalog_only`, `authenticated: null`, and `inferenceHealthy: null`. CLI failure, partial/invalid output, or nonzero exit returns unavailable, never an empty successful catalog. Keep configured OpenCode entries when absent, including paid/out-of-scope IDs. Do not recommend automatic deletion from this evidence. Price zero is advertised catalog pricing, not proof of account eligibility or actual billing.

Verify inference separately only when requested: one bounded exact free-model wrapper canary, then a Gateway-mediated canary with the same model. Confirm `provider=opencode-cli` in Gateway logs. A successful CLI list or a Gateway admission receipt alone is insufficient. Never substitute a paid route.

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
