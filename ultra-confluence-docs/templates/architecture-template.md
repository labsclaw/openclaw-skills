# [System/Component] Architecture

## Overview

High-level description of the system or component. What problem does it solve? Who uses it?

## Goals and Non-Goals

### Goals

- [What this system should do]
- [Key quality attributes (performance, reliability, etc.)]

### Non-Goals

- [What this system should NOT do]
- [Explicitly out of scope]

## Architecture Diagram

```
[ASCII diagram or link to Excalidraw / draw.io / Mermaid]

Example:

┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client     │────▶│   API GW     │────▶│  Service A  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                                        ┌───────▼──────┐
                                        │   Database   │
                                        └──────────────┘
```

## Components

### Component 1: [Name]

- **Purpose:** What it does
- **Location:** Where it lives (repo, cluster, region)
- **Technology:** Language, framework, runtime
- **Dependencies:** What it needs from other components
- **Owned by:** Team or individual responsible

### Component 2: [Name]

- **Purpose:** What it does
- **Location:** Where it lives
- **Technology:** Language, framework, runtime
- **Dependencies:** What it needs
- **Owned by:** Team or individual responsible

## Data Flow

How data moves through the system:

1. [Step 1: e.g., "Client sends request to API Gateway"]
2. [Step 2: e.g., "API Gateway authenticates and routes to Service A"]
3. [Step 3: e.g., "Service A queries Database and returns response"]

## API Contract

[If applicable, document key APIs or link to OpenAPI spec]

| Endpoint        | Method | Description           | Auth Required |
|-----------------|--------|-----------------------|---------------|
| `/api/v1/resource` | GET    | List resources        | Yes           |
| `/api/v1/resource` | POST   | Create resource       | Yes           |

## Security Considerations

- **Authentication:** [How users/services authenticate]
- **Authorization:** [RBAC, ABAC, RLS policies]
- **Data protection:** [Encryption at rest/in transit, PII handling]
- **Secrets management:** [Where secrets live, rotation policy]

## Performance Considerations

- **Caching strategy:** [What's cached, TTL, invalidation]
- **Database optimization:** [Indexes, query patterns, partitioning]
- **API response times:** [SLAs, p50/p95/p99 targets]
- **Rate limiting:** [Limits, throttling behavior]

## Monitoring and Observability

- **Key metrics:** [Latency, error rate, throughput, saturation]
- **Alerting thresholds:** [When to page, when to warn]
- **Log locations:** [Where to find logs, aggregation service]
- **Dashboards:** [Links to Grafana, Datadog, CloudWatch]

## Deployment

- **CI/CD:** [Pipeline, deployment strategy]
- **Rollback procedure:** [How to roll back a bad deploy]
- **Feature flags:** [What flags exist, how to use them]

## Testing Strategy

- **Unit tests:** [Coverage target, key test files]
- **Integration tests:** [What's covered, how to run]
- **Load tests:** [When to run, targets]

## Future Considerations

What might change or be improved:

- [Planned enhancement 1]
- [Known limitation to address]
- [Scaling consideration]

## Related ADRs

- ADR-XXX: [Related decision]

## References

- [Link to relevant documentation]
- [Link to RFC or design doc]
- [Link to prototype]
