# Rate-Limit Bypass — OpenCode Headers

## Context

OpenCode Zen API applies different rate limits depending on whether
the request looks like it comes from the official CLI or an anonymous
third-party client. The CLI-originated requests use a specific header
signature that bypasses stricter limits.

Discovered via PI project issue #2824 and original rate-limit
investigation by Dr. Roger Oliveira (inspecting proxy traffic).

## Header Pattern

| Header | Value | Purpose |
|--------|-------|---------|
| `Accept` | `*/*` | Standard |
| `User-Agent` | `opencode/{version} ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.14` | Version + runtime fingerprint |
| `x-opencode-client` | `cli` | Identifies as official CLI |
| `x-opencode-project` | `zen-openclaw` | Project identifier |
| `x-opencode-session` | `ses_openclaw_zen` | Session identifier (static for now) |
| `x-opencode-request` | `msg_openclaw_zen` | Request identifier (static for now) |

## Known Behavior

- **Version matters**: stale versions may be deprioritized or blocked
- **IDs static**: ideal would be random per session/request, but static
  has been sufficient since ~April 2026
- **Runtime changes**: Bun runtime version in the User-Agent may need
  updating if OpenCode CLI changes its toolchain

## Maintenance

Run `scripts/check-opencode-version.ps1` periodically or use the
cron job `check-opencode-version` (weekly, Mon 14:00 BRT).

## References

- PI project: <https://github.com/earendil-works/pi/issues/2824>
- OpenCode npm: <https://www.npmjs.com/package/opencode-ai>
