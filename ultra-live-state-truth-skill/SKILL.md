---
name: ultra-live-state-truth-skill
description: "Verifies mutable facts against the authoritative live source before acting or reporting. Use for service health, configuration, versions, PR status, deployments, files, processes, provider catalogs, and other state that may have changed."
license: Apache-2.0
metadata:
  {
    "openclaw":
      {
        "emoji": "🔴",
      },
  }
---

# Ultra Live State Truth

Mutable claims require current evidence from the system that owns the state.

## Procedure

1. Name the fact the task depends on.
2. Identify its authoritative source.
3. Choose the least expensive check that can settle the fact.
4. Observe the state before mutating it.
5. Observe it again after mutation when success depends on the result.
6. Attach a timestamp or revision when the evidence can become stale.

## Source Selection

| Claim | Preferred evidence |
|---|---|
| File or configuration value | Read the effective file or configuration API |
| Service availability | Health endpoint, listener, or service manager |
| Database shape or record | Database query |
| Dependency version | Lockfile, package manager, or executable version |
| GitHub state | Current GitHub API or CLI response |
| Deployed behavior | Request against the deployed target |

Documentation and memory can locate the check. They do not replace it.

## Constraints

- Do not repeat a state-changing action merely because its result was not observed.
- Do not claim execution from source inspection.
- Do not recheck immutable facts or a mutable fact already verified in the current operation unless it could have changed.
- If the authoritative source is unavailable, report the fact as unverified and name the missing check.
