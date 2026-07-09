# ADR Best Practices

## Writing Effective ADRs

### The "Context" Section is Everything

The most common ADR failure is a weak Context section. Future readers won't have your Slack conversations or meeting notes. Write Context as if explaining to someone who joined the team yesterday.

**Good Context:**
> We currently store user sessions in Redis. Redis memory costs $0.10/GB/month. Our session count grew 3x in Q1 and is projected to reach 50M sessions by Q3. At that scale, Redis costs will exceed $500/month, and we're hitting memory pressure during peak hours.

**Bad Context:**
> We need to rethink our session storage.

### Decision Section

State the decision as a single, clear sentence. Then elaborate.

**Good:**
> We will migrate session storage from Redis to PostgreSQL.

**Bad:**
> There are several options we could consider for session storage, including PostgreSQL, DynamoDB, and sticking with Redis with some optimizations.

### Consequences Be Honest

Every decision has tradeoffs. If you can't think of negative consequences, you haven't thought hard enough.

## Numbering Convention

- Sequential: ADR-001, ADR-002, ADR-003
- Never reuse numbers, even for superseded ADRs
- Pad to 3 digits for sortability

## Status Lifecycle

```
Proposed → Accepted → [Deprecated | Superseded]
```

- **Proposed:** Under discussion
- **Accepted:** Approved and being implemented
- **Deprecated:** No longer relevant (the problem went away)
- **Superseded:** Replaced by a newer ADR (reference it)
