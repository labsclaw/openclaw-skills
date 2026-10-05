---
name: ultra-code-review-skill
description: "Reviews pull requests for correctness, security, regression risk, and repository policy using current GitHub evidence and confidence-filtered findings. Use when asked to review a PR, assess merge readiness, or produce actionable inline findings."
license: Apache-2.0
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
      },
  }
---

# Ultra Code Review

Review the change that exists at the current PR head, not an earlier run or a local approximation.

## Workflow

1. Verify repository, PR number, state, draft status, head SHA, base branch, and current checks.
2. Read repository instructions and the PR description.
3. Inspect the complete changed-file list and diff. Expand surrounding code only where a finding depends on it.
4. Evaluate independently:
   - correctness and boundary behavior;
   - security and secret exposure;
   - regressions, compatibility, and data migration;
   - tests and verification quality;
   - compliance with repository-specific rules.
5. Attempt to disprove each candidate finding against the surrounding code and existing tests.
6. Report only findings that are actionable, introduced by the change, and supported by evidence.
7. Re-read the current head before posting if the PR changed during review.

## Confidence Filter

- **90 to 100**: directly demonstrated or mechanically certain.
- **80 to 89**: strong evidence with a small unresolved dependency.
- **Below 80**: do not publish as a defect. Mention only as a clearly labeled question when it blocks understanding.

## Finding Format

Each finding must contain severity, confidence, a concise failure scenario, file and changed line range, evidence or reproduction path, and the smallest safe correction. Use stable links containing the full commit SHA.

## Merge Readiness

A green CI run is necessary evidence, not a substitute for review. Distinguish failing or pending required checks, superseded runs from older heads, unresolved conversations, merge conflicts, policy gates, and automated suggestions.

If no publishable finding remains, say that no blocking issue was found and summarize what was actually checked. Do not invent comments to make the review appear useful.

## Helper

Run `node scripts/code-review.cjs <pr> --repo owner/repo` from this skill directory to collect a sanitized, current PR evidence bundle and deterministic high-signal scans. The helper never posts comments or invokes models.
