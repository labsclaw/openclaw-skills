# SSC Architecture & Retrieval Engine

## Retrieval Flow
1. Query router: `node scripts/ssc-router.cjs query "<query>"`
2. Index resolution: `memory/index.json` maps keywords and tags to segments
3. Segment loading: Load only matched segment from `memory/segments/sXXX-*.md`
4. Decision support: verify coverage, provenance, supersession and conflicts using `evidence-gate.md`. Ranking alone does not prove support. The helper is optional and is not wired into the router automatically.

## Storage Tiers
- Tier 1 (Active/High-Value): `MEMORY.md` (loaded in system context, strictly bounded)
- Tier 2 (Domain Segments): `memory/segments/` (retrieved on-demand)
- Tier 3 (Daily Logs & History): `memory/daily/` (archived, searchable)
