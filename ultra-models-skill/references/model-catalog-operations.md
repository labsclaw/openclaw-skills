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
| AMD Radeon | Authenticated models endpoint (`AMD_TOKEN`) | Use the Radeon models catalog; API may require retry on initial probe |

A missing credential or unreachable endpoint means `unauthenticated` or `unavailable`, not `dead`.

## Audit sequence

1. Run the smallest read-only script for the scoped provider.
2. Capture the run time, provider status, configured IDs, live IDs, and differences.
3. Confirm every removal against an authenticated live catalog.
4. Inspect aliases, fallback chains, and model policies before mutation.
5. Preserve a rollback artifact when changing configuration.
6. Re-run the comparison and verify zero unintended differences.

## Restricting Visible Providers in Chat and Channel Pickers

When a user or operator requests to limit visible providers/models in chat commands (such as Telegram or Discord `/models`) and interactive inline pickers:

### 1. Why `models.mode: "replace"` is not enough alone
- In `openclaw.json`, setting `models.mode: "replace"` replaces catalog models *only* for providers explicitly declared under `models.providers`.
- However, the Gateway's model discovery for built-in/native providers (e.g. OpenAI, Anthropic, Google, Groq) continues to publish implicit rows to channel model pickers and `/models` unless an explicit policy restriction is applied.

### 2. Enforce provider restriction via `modelPolicy.allow`
- To strictly fence the channel `/models` menu and interactive pickers to approved providers, configure `agents.defaults.modelPolicy.allow` (or per-agent `agents.entries.<agentId>.modelPolicy.allow`) with provider prefix wildcards:
  ```json5
  {
    agents: {
      defaults: {
        modelPolicy: {
          allow: [
            "openrouter/*",
            "opencode/*",
            "kilocode/*",
            "nvidia/*",
            "antigravity-proxy/*",
            "amd/*"
          ]
        }
      }
    }
  }
  ```
- This ensures only models matching the specified provider prefixes appear in chat command menus and pickers, hiding all unapproved implicit provider catalogs.

### 3. Fallback Chain and Alias Hygiene
- When retiring or updating a dead model ID (e.g. `kilocode/stepfun/step-3.7-flash:free` becoming dead / HTTP 404), immediately replace it in `agents.defaults.model.fallbacks` with its active counterpart (e.g. `kilocode/stepfun/step-5-preview-free`) to prevent broken fallback loops.
- Remove retired model IDs from `agents.defaults.models` to avoid orphan alias warnings.
- Always run `scripts/compare-config.ps1` and verify:
  - Dead aliases: 0
  - Broken fallbacks: 0

### 4. Specialized Provider Setup
- **Antigravity Proxy (`antigravity-proxy`):** Local endpoint (`http://127.0.0.1:8081` or `8080`), uses `api: "anthropic-messages"`. Models use `antigravity-proxy/<id>` prefix. Verify via `scripts/list-antigravity-models.ps1` before adding.
- **AMD Radeon (`amd`):** Endpoint `https://developer.amd.com.cn/radeon/api/v1`, uses `api: "openai-completions"`, auth token via secret store / `.env` (`AMD_TOKEN`). Models typically require `"compat": { "thinkingFormat": "openrouter" }`. The Radeon endpoint may return transient errors on the first probe and succeed on retry.

## Routing and capability maps

The capability and role-fit values produced by the scripts are heuristics. Use them to compare candidates, then disclose the evidence date and any unavailable provider. Do not present a heuristic score as a benchmark result.

## Credential handling

Use the configured provider authentication flow. Never place keys in command arguments, generated reports, or chat. If authentication is unavailable, stop that provider branch and report it separately.
