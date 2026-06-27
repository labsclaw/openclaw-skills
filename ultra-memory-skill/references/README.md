# References

## Core Paper

- **Memory Caching: RNNs with Growing Memory** — Behrouz, Pezeshki, et al. (Google, 2026)
  - arXiv: [2602.24281](https://arxiv.org/abs/2602.24281)
  - Implements SSC, GRM, Memory Soup, and Residual Memory variants
  - Key insight: O(NL) complexity interpolating between RNNs O(L) and Transformers O(L²)

## Related Work

- **LLM-Wiki Pattern** — Andrej Karpathy (2026)
  - GitHub Gist on persistent markdown wikis maintained by LLMs
  - Foundation for our segment/checkpoint architecture

- **Open Knowledge Format (OKF) v0.1** — Google Cloud (2026)
  - Formalizes markdown+frontmatter pattern for portable knowledge
  - Validates our architectural choice of markdown as core representation

- **agentmemory** — rohitg00 (2026)
  - BM25+Vector+Graph triple-stream retrieval
  - R@5=95.2% on LongMemEval-S

- **qmd** — tobi (2026)
  - Mini CLI search engine for markdown
  - BM25 (SQLite FTS5) + vector + hybrid search

- **Hyper-Extract** — yifanfeng97 (2026)
  - Automated knowledge extraction with typed templates
  - 80+ domain templates, Obsidian export

## Implementation Notes

Our SSC implementation uses keyword/tag scoring as a lightweight gating mechanism. The full paper's neural gating (learned parameters) is approximated by:

```
score = (keyword_hits × 2) + tag_hits + (weight × 0.5)
```

This trades optimality for zero-cost, zero-dependency deployment — suitable for agent workspaces where LLM inference budget is limited.
