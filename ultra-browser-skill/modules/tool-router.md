# Smart Tool Routing v2

## Decision Tree

```
User request
  │
  ├─ Simple search / public info?
  │   └─ YES → web_search (Level 1)
  │
  ├─ Need content from specific URL (public)?
  │   └─ YES → web_fetch (Level 2)
  │
  ├─ Need to read authenticated page?
  │   └─ YES → browser snapshot (Level 3)
  │
  ├─ Need to click/fill/upload on a page?
  │   └─ YES → browser act (Level 4)
  │
  ├─ Multi-step flow (login, onboarding, checkout)?
  │   └─ YES → browser batch (Level 5)
  │
  ├─ Complex DOM manipulation or data extraction?
  │   └─ YES → browser evaluate / sandboxed JS (Level 5)
  │
  └─ Need to research multiple sites in parallel?
      └─ YES → background sub-agents (Level 5+)
```

## Level Details

### Level 1: web_search
**When:** Simple queries, public info, fact-checking
**Cost:** Lowest
**Latency:** ~1-2s
**Example:** "What's the market cap of Tesla?"

### Level 2: web_fetch
**When:** Need content from a specific public URL
**Cost:** Low
**Latency:** ~2-5s
**Example:** "Extract the text from this article: https://..."

### Level 3: browser read (snapshot)
**When:** Page requires login or is dynamic (SPA)
**Cost:** Medium
**Latency:** ~3-8s
**Example:** "What does my LinkedIn feed show?"

### Level 4: browser act (click/fill)
**When:** Need to interact with page elements
**Cost:** Medium-High
**Latency:** ~5-15s
**Example:** "Click the 'New Post' button on LinkedIn"

### Level 5: browser full (batch/multiple steps)
**When:** Complex flows requiring multiple actions
**Cost:** High
**Latency:** ~10-60s
**Example:** "Log into Instagram and post a photo"

### Level 5+: background sub-agents
**When:** Researching multiple sites simultaneously
**Cost:** Highest (but parallel = faster)
**Latency:** Depends on task count
**Example:** "Research these 5 competitors' pricing pages"

## Routing Rules

1. **Always start at Level 1** — don't open a browser for a Google query
2. **Escalate only when needed** — if web_fetch fails, try browser read
3. **Prefer background** for multi-site tasks — user's browser stays clean
4. **Use labels** for all tabs — easy reuse and cleanup
5. **Close tabs when done** — don't leak browser resources
6. **Batch when possible** — multiple actions in one call = less overhead
7. **Reuse persistent pages** — don't reload between actions on same page

## Anti-Patterns

❌ Opening browser for a simple search
❌ Using browser act when snapshot would suffice
❌ Running 5 serial background tasks when parallel is possible
❌ Leaving tabs open after task completion
❌ Not checking domain blocklist before acting
❌ Reloading page between actions when page state is preserved
❌ Using CSS selectors when @e refs are available

## Token Efficiency

| Method | Context Tokens | Reliability |
|--------|---------------|-------------|
| CSS selectors | ~50 tokens each | Low (brittle) |
| @e refs (snapshot) | ~5 tokens each | High (stable) |
| Coordinates | ~10 tokens each | Medium (DPR-dependent) |
| Text descriptions | ~30 tokens each | Medium (ambiguous) |

**Rule:** Always use @e refs when available. Fall back to coordinates only for visual/canvas elements.
