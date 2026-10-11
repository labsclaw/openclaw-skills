# Routing Eval: not-run (opencode-cli-bridge)

- Skill: `opencode-cli-bridge`
- Status: not-run
- Recorded: 2026-10-11
- Cases: 5 fixtures in `evals/triggers.json` (3 positive, 2 negative)
- Model: pending an explicit approval for a live model call

## Why not-run

The skill is published with its routing fixtures so the catalog entry is honest about
routingEval status. Executing the eval requires one live model call, which stays behind
an explicit user approval rather than being fired from an automated or heartbeat run.

## What is required to move to pass

1. The skill is already in the candidate allowlist of `scripts/run-routing-eval.mjs` in
   this branch, so the harness can select it.
2. Run `node scripts/run-routing-eval.mjs <model>` from the repository root. The script
   writes `evals/results/<date>-<model>.json` and `evals/results/<date>-<model>.md`.
3. Publish the generated report and update `routingEval.status` to `pass` only when all
   5 cases pass. A partial score must be recorded as `fail` with the report attached.

Until then this entry stays `not-run` and the skill stays `experimental`.
