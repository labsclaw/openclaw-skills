# Examples

## Minimal Setup

Copy `examples/memory/` to your workspace to get a working starting point:

```powershell
Copy-Item -Recurse examples/memory/ <your-workspace>/memory/
```

This gives you:
- `index.json` with one example segment
- `segments/s001-example.md` showing the expected format
- `checkpoints/ckpt-2026-06-27.md` with a sample checkpoint

## Creating Your First Real Segment

1. **Decide the topic**: What knowledge keeps coming up across sessions?
2. **Write the segment**: `memory/segments/s001-topic.md` using the template format
3. **Add to index**: Update `memory/index.json` with the new entry

### Example: Project Segment

```json
{
  "id": "s001",
  "file": "segments/s001-project-alpha.md",
  "summary": "Project Alpha: architecture decisions, API design, deployment",
  "keywords": ["project alpha", "API", "deployment", "architecture", "lambda"],
  "tags": ["project", "backend", "aws"],
  "lastCheckpoint": "ckpt-2026-06-27",
  "weight": 0.95,
  "created": "2026-06-27",
  "accessCount": 0
}
```

### Example: Segment Content

```markdown
# Segment: s001 — Project Alpha

## Resumo
Project Alpha: serverless API on AWS Lambda, PostgreSQL via RDS Proxy.

## Conteúdo

### Architecture Decision (2026-06-15)
- Chose Lambda over ECS for cost at low traffic
- RDS Proxy for connection pooling
- API Gateway REST (not HTTP) for WAF support

### Deployment Pipeline (2026-06-20)
- GitHub Actions → SAM deploy → staging
- Manual approval for production
- Rollback via SAM previous version

## Checkpoint
- `ckpt-2026-06-27` — Architecture finalized

## Tags
project-alpha, serverless, AWS, architecture

## Último checkpoint: 2026-06-27
```

## Daily Logs

Append to daily logs for ephemeral notes. The router ignores these (they're O(L) — the whole point is to not load them).

```markdown
# 2026-06-27

- 10:30 — Discussed memory architecture with dr. Roger
- 14:00 — Created ssc-router.ps1, tested with 4 segments
- 16:00 — Set up health check cron for 3am daily
```

## Checkpoints

Create when a significant state change occurs:

```markdown
# Checkpoint: 2026-06-27

## State Snapshot
- Segments: 4 active
- Daily logs: 47 files
- Total memory: 178 KB
- Active issues: RLA-207 (open)

## Notes
- SSC router operational, accessCount tracking active
- Health check cron configured
```
