<p align="center">
  <h1 align="center">🧠 ultra-memory-skill</h1>
  <p align="center">
    <strong>Memory Caching for LLM Agents</strong><br>
    Zero-cost gated retrieval, auto-maintenance, and hybrid wiki architecture.<br>
    Inspired by <a href="https://arxiv.org/abs/2602.24281">Memory Caching: RNNs with Growing Memory</a> (Google, 2026).
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#full-installation">Full Installation</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#scripts">Scripts</a> •
  <a href="#wiki-architecture">Wiki</a> •
  <a href="#faq">FAQ</a>
</p>

---

## The Problem

LLM agents rediscover knowledge from scratch every session. Memory files grow unbounded. Loading all context costs O(L) tokens per session.

| Approach | Complexity | Limitation |
|----------|-----------|------------|
| Static files (AGENTS.md) | O(1) | Fixed capacity, goes stale |
| Full log replay | O(L) | Linear token cost |
| RAG retrieval | O(1) query | Stateless, no accumulation |
| **SSC (this skill)** | **O(K)** | **K << L, compounding knowledge** |

## Quick Start (5 minutes)

```powershell
# Clone or copy this skill to your workspace
cd <your-workspace>

# Run the setup script
powershell -ExecutionPolicy Bypass -File <skill-path>\scripts\setup.ps1

# Add the SSC protocol to your AGENTS.md
# (copy from templates/AGENTS-template.md)
```

That's it. The router works immediately. Run `.\memory\ssc-router.ps1 -Query "test"` to verify.

## Full Installation

### Option A: Minimal (SSC Only)

Just the router and health check — zero dependencies:

```powershell
.\scripts\setup.ps1
```

Creates:
- `memory/index.json` — SSC router config
- `memory/ssc-router.ps1` — query-time segment scoring
- `memory/ssc-health.ps1` — daily health check
- `memory/segments/`, `checkpoints/`, `daily/`, `fixes/` directories

### Option B: Complete (SSC + Wiki)

Full hybrid architecture with knowledge extraction and vector search:

```powershell
.\scripts\setup.ps1 -Wiki -Cron
```

Additional installs:
- **Hyper-Extract** — automated knowledge extraction (80+ templates)
- **qmd** — hybrid search (BM25 + Vector + Reranking)
- **agentmemory** — vector store with triple-stream retrieval
- Wiki directory structure
- qmd + agentmemory initialization

**Requirements:** `uv` (Hyper-Extract) and `npm` (qmd + agentmemory)

### Option C: Manual Step-by-Step

See `examples/README.md` for detailed manual setup instructions.

## Post-Setup: AGENTS.md Protocol

**This is critical.** The scripts work, but your agent needs to know *when* to use them. Add this to your AGENTS.md:

```markdown
### Session Startup Protocol (Gated Retrieval)

1. **Run SSC Router** — `powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "<relevant terms>"`
2. The script scores segments by keyword/tag overlap, returns top-K, and updates accessCount
3. **Generate online memory** from returned segments + MEMORY.md
4. **DO NOT load all daily files** — that's the old O(L) pattern
5. **DO NOT read segments manually** — always use the script
```

Full template: `templates/AGENTS-template.md`

## Post-Setup: Cron Health Check

For automated daily health monitoring, add this cron job in OpenClaw:

```json
{
  "name": "ssc-health-check",
  "schedule": { "kind": "cron", "expr": "0 3 * * *" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: powershell -ExecutionPolicy Bypass -File <workspace>\\memory\\ssc-health.ps1\nIf HEALTHY, respond 'SSC health: OK'. If ATTENTION NEEDED, report issues."
  },
  "delivery": { "mode": "announce", "channel": "telegram" }
}
```

## Architecture

```
┌─────────────────────────────────────────────┐
│              Session Startup                 │
│  "What do I need to remember right now?"     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           SSC Router (ssc-router.ps1)        │
│  Query → keyword/tag scoring → top-K match   │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  segments/   │    │  MEMORY.md   │
│  s001-*.md   │    │  (overview)  │
│  s002-*.md   │    └──────────────┘
└──────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│        ssc-health.ps1 (daily cron)           │
│  Verify integrity, report anomalies          │
└─────────────────────────────────────────────┘
```

### Directory Structure

```
memory/
├── index.json              ← SSC Router config + segment metadata
├── ssc-router.ps1          ← Query-time segment scoring
├── ssc-health.ps1          ← Daily health check
├── segments/               ← Compressed knowledge by topic
│   ├── s001-infra.md
│   ├── s002-project.md
│   └── s003-decisions.md
├── checkpoints/            ← Snapshots at key events
├── daily/                  ← Raw daily logs (append-only)
└── fixes/                  ← Bug fix records
```

## Scripts

### ssc-router.ps1 — Query Memory

```powershell
.\ssc-router.ps1 -Query "project deadline"    # Find relevant segments
.\ssc-router.ps1 -List                         # List all segments
.\ssc-router.ps1 -Stats                        # Show access counts
.\ssc-router.ps1 -Query "test" -DryRun         # Preview without updating
```

**Scoring:** `score = (keyword_hits × 2) + tag_hits + (weight × 0.5)`

### ssc-health.ps1 — Health Check

```powershell
.\ssc-health.ps1                               # Full health report
.\ssc-health.ps1 -Quiet                        # Report file only
```

### setup.ps1 — Full Setup

```powershell
.\setup.ps1                                    # Minimal
.\setup.ps1 -Wiki                              # SSC + wiki ecosystem
.\setup.ps1 -Wiki -Cron                        # SSC + wiki + cron
.\setup.ps1 -Force                             # Overwrite existing
```

## Wiki Architecture (with -Wiki)

### Directory Structure

```
wiki/
├── raw/                   ← Immutable source documents
├── entities/              ← People, organizations, tools
├── concepts/              ← Ideas, patterns, techniques
├── sources/               ← Summaries of ingested sources
├── synthesis/             ← Multi-source analyses
├── comparisons/           ← Side-by-side evaluations
├── projects/              ← Active project pages
└── checkpoints/           ← Wiki state snapshots
```

### Workflow

1. Add sources to `wiki/raw/`
2. Extract: `he parse source.pdf -t general/academic_graph -o ./output/`
3. Export: `he export obsidian ./output/ -o ./wiki/knowledge-abstracts/`
4. Index: `qmd collection add wiki --name wiki; qmd embed`
5. Import to agentmemory via MCP `memory_save`

### Search

```powershell
qmd search "memory caching"           # BM25
qmd vsearch "hybrid architecture"     # Vector
qmd query "what is SSC?"              # Hybrid (best quality)
```

## Benchmarks

| Metric | Before SSC | After SSC | Savings |
|--------|-----------|-----------|---------|
| Tokens per session startup | ~13,036 | ~1,120 | **91.4%** |
| Files loaded | 47 daily logs | 3 segments + MEMORY.md | **93.6%** |
| Query latency | N/A (manual) | <1s (script) | — |

## Paper

### Memory Caching: RNNs with Growing Memory

- **Authors**: Behrouz et al. (Google)
- **arXiv**: [2602.24281](https://arxiv.org/abs/2602.24281)
- **Key insight**: RNNs don't fail because they're recurrent — they fail because memory is fixed. Caching checkpoints + selective gating = effectively growing memory without O(L²) cost.

**Our implementation uses the SSC (Sparse Selective Cache) variant:**
- Segments = memory checkpoints
- Keyword/tag scoring = gating mechanism
- Top-K retrieval = sparse selective activation

## FAQ

**Q: Do I need any external dependencies?**
A: No for Option A (minimal). Yes for Option B (wiki): `uv` and `npm`.

**Q: What LLM frameworks does this work with?**
A: Any framework that reads files. We built for OpenClaw but the protocol is framework-agnostic.

**Q: How many segments should I have?**
A: Start with 3-5. Split when a segment exceeds 5KB.

**Q: When should I create a new segment?**
A: When a distinct topic accumulates enough context for its own compressed summary.

**Q: Can I use this with other memory tools?**
A: Yes. SSC is a retrieval layer, not a replacement. Use alongside Mem0, Zep, etc.

**Q: What about shared/group sessions?**
A: Security rule: only load segments in main sessions (1:1 chats). Never in shared contexts.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Test with both scripts
4. Submit a PR with benchmark data

## License

MIT

## Credits

- **Paper**: "Memory Caching: RNNs with Growing Memory" — Behrouz et al. (Google), [arXiv 2602.24281](https://arxiv.org/abs/2602.24281)
- **Implementation**: Dr. Roger Oliveira (@SmartNewbieBR) + Justus (AI Agent)
- **Organization**: [LabsClaw](https://github.com/labsclaw)
