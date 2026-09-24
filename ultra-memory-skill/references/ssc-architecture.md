# SSC Architecture & Retrieval Engine

## Retrieval Flow
1. Query router: `node scripts/ssc-router.cjs "<query>"`
2. Index resolution: `memory/index.json` maps keywords and tags to segments
3. Segment loading: Load only matched segment from `memory/segments/sXXX-*.md`

## Storage Tiers
- Tier 1 (Active/High-Value): `MEMORY.md` (loaded in system context, strictly bounded)
- Tier 2 (Domain Segments): `memory/segments/` (retrieved on-demand)
- Tier 3 (Daily Logs & History): `memory/daily/` (archived, searchable)
