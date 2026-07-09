# ADR-001: Adopt PostgreSQL for Session Storage

## Status

Accepted

## Context

We currently store user sessions in Redis. Redis memory costs $0.10/GB/month. Our session count grew 3x in Q1 and is projected to reach 50M sessions by Q3. At that scale, Redis costs will exceed $500/month, and we're hitting memory pressure during peak hours.

We also need session data to be queryable for analytics (e.g., "how many active users in the last 24h?"), which Redis doesn't support natively without additional tooling.

Options considered:
1. **Redis with eviction** — cheaper but loses sessions under pressure
2. **PostgreSQL** — already in our stack, supports JSONB, queryable
3. **DynamoDB** — scalable but adds AWS dependency and cost

## Decision

We will migrate session storage from Redis to PostgreSQL using a JSONB column for flexible session data.

## Consequences

### Positive

- Single database reduces operational complexity
- Session data becomes queryable for analytics
- No new infrastructure to manage
- PostgreSQL JSONB gives us schema flexibility without schema changes

### Negative

- Slightly higher latency for session reads (p99: 2ms → 5ms)
- Need to write migration script for existing sessions
- PostgreSQL connection pool needs tuning for session workload

### Neutral

- Redis will still be used for caching (separate concern)
- Session TTL enforcement moves from Redis auto-expiry to application-level cleanup

## Implementation Notes

1. Create `sessions` table with JSONB `data` column
2. Write migration script to port active sessions from Redis
3. Update session middleware to use PostgreSQL adapter
4. Add background job for expired session cleanup (runs every 1h)
5. Monitor p99 latency for 2 weeks before full cutover

## Related Decisions

- ADR-003: [Redis role reduction to cache-only]

## References

- [PostgreSQL JSONB docs](https://www.postgresql.org/docs/current/datatype-json.html)
- [Internal benchmark: Redis vs PG session latency](link-to-benchmark)
