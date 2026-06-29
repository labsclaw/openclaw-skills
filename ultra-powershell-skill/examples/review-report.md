# Code Review Report: {ScriptName}.ps1

## Executive Summary

{State whether the code is safe, risky, or acceptable with caveats.}

## Critical Issues

```text
Severity: Critical | High | Medium | Low
Rule: Power of Ten #<number>
PowerShell concern: <specific issue>
Why it matters: <risk>
Fix: <recommended change>
```

## Recommended Deletions

| Line | Code | Reason |
|------|------|--------|
| 42 | `$verbose = $true` | Unused variable |
| 85-90 | Helper function (single use) | Inline or delete |

## Recommended Enhancements

| Line | Current | Proposed | Benefit |
|------|---------|----------|---------|
| 12 | `$null -eq $var` | `-not $var` | Simpler guard |

## Optional Improvements

- Add -Verbose support for long operations
- Add -WhatIf for destructive operations

## Risk Assessment

- **Critical**: None
- **High**: None
- **Medium**: No pagination protection on Graph API loop
- **Low**: Comment has typo

## Appendix: Deletion Summary (5-Step Process)

### Step 1 — Requirements
- [ ] All requirements justified?
- [ ] Any "nice to have" features?

### Step 2 — Delete
- [ ] Removed unnecessary parameters
- [ ] Removed single-use helper functions
- [ ] Removed comments explaining bad code

### Step 3 — Simplify
- [ ] Replaced loops with pipeline where appropriate
- [ ] Simplified conditional logic

### Step 4 — Accelerate
- [ ] No N+1 API patterns
- [ ] Streaming not blocked by materialization

### Step 5 — Automate
- [ ] CI/CD handles formatting
- [ ] Tests automated

## Final Verdict

{Ready / Needs changes / Needs redesign}
