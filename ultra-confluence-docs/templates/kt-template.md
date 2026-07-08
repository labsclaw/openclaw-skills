# KT: [Topic Name] — TICKET-XXX

## Summary

What was done and why it matters. Two to three sentences max.

## Context

Background information needed to understand this work:

- **Why:** [Business or technical motivation]
- **Scope:** [What was in and out of scope]
- **Timeline:** [When this was done, any time pressure]

## Key Decisions Made

1. **[Decision 1]:** [Reasoning — why this approach over alternatives]
2. **[Decision 2]:** [Reasoning]
3. **[Decision 3]:** [Reasoning]

## Implementation Details

### What Changed

- **File:** `path/to/file.ts`
  - [What changed and why]

- **File:** `path/to/another-file.ts`
  - [What changed and why]

### How It Works

Explanation of the implementation. Focus on the non-obvious parts — things that would trip up someone reading the code cold.

### Dependencies Added/Changed

- [New package]@[version]: [Why it was added]
- [Updated package]: [What changed]

## Architecture Impact

- **New components:** [List any new services, modules, or components]
- **Modified components:** [What existing things changed]
- **Data model changes:** [Migrations, schema changes]
- **API changes:** [New endpoints, breaking changes]

## Gotchas and Lessons Learned

Things that might trip up future developers:

- ⚠️ [Gotcha 1: e.g., "The cache invalidation happens async — wait 30s after write"]
- ⚠️ [Gotcha 2: e.g., "This only works with Node 20+, not 18"]
- ⚠️ [Gotcha 3: e.g., "Rate limit is 100 req/min per API key, not per user"]

## Testing

How to verify everything works:

```bash
# Run relevant tests
test-command

# Manual verification steps
verification-command
```

**Test coverage:** [What's covered, what's not]

## Rollback Plan

If something goes wrong:

1. [Step 1 to rollback]
2. [Step 2 to rollback]
3. [Verification that rollback worked]

## Related Tickets

- TICKET-XXX: [Related work]
- TICKET-YYY: [Follow-up work]

## Related ADRs

- ADR-XXX: [Decision that affected this work]

## Future Work

What should be done next (be honest, not aspirational):

- [ ] [Next task 1]
- [ ] [Next task 2]
- [ ] [Known tech debt to address]

## Contacts

- **Implemented by:** [Name / Handle]
- **Reviewers:** [Names]
- **Domain expert:** [Who to ask about the business logic]

## Revision History

| Date       | Author   | Changes              |
|------------|----------|----------------------|
| YYYY-MM-DD | Name     | Initial version      |
