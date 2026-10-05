# OpenClaw Skills Collection

A collection of 'Ultra' level skills for the OpenClaw / OpenCode agent ecosystems, created with strict adherence to the [agentskills.io](https://agentskills.io) specification.

## Organizational library pilot

The repository is evolving from a folder collection into a governed capability
library. The initial pilot catalogs three skills:

- `ultra-plan-gate-skill`
- `ultra-adversarial-verify-skill`
- `ultra-models-skill`

Governance metadata lives in `catalog/registry.json`. `catalog/index.json` is a
deterministic, content-addressed projection for humans and agents. External
publication is intentionally blocked until the repository has an explicit
license.

Run the local gates with:

```bash
node scripts/validate-library.mjs
node scripts/build-catalog.mjs --check
```

Run the model-based routing eval with an explicit OpenClaw model:

```bash
node scripts/run-routing-eval.mjs openai/gpt-5.6-sol
```

The first baseline passed 15/15 cases. Results retain the model, run ID,
per-skill score, prompt, and machine-readable case outcomes under
`evals/results/`.

`workshopStatus` records the Workshop proposal lifecycle. It does not imply
that an external runtime installation or repository projection has been
synchronized; those states require separate verification.

`syncStatus` records whether the governed source exists only in Git, is pending
runtime installation, or has been verified in both the repository and runtime.

Benchmark sources and the patterns accepted or rejected by LabsClaw are recorded
in `docs/references/skill-library-benchmarks.md`.

## Skills Included

- **ultra-create-skill**: The definitive guide and toolset for creating new skills.
- **ultra-find-skill**: A cross-platform search and evaluation engine for discovering skills.
- **ultra-drawio-skill**: A comprehensive skill for generating, editing, and exporting draw.io XML diagrams.
- **ultra-memory-skill**: Memory Caching for LLM Agents — SSC Router, Health Check, and auto-maintenance inspired by arXiv 2602.24281.

## Installation

You can install these skills directly into your agent's workspace:

```bash
npx skills add labsclaw/openclaw-skills --skill ultra-drawio-skill
```
