# AGENTS.md — Memory Architecture Template

This file defines the memory protocol for your agent workspace. Copy this to your workspace root.

## Memory — MC Architecture (Memory Caching)

> Inspired by *Memory Caching: RNNs with Growing Memory* (arXiv 2602.24281)

You wake up fresh each session. These files are your continuity:

Capture what matters. Decisions, context, things to remember. Skip the secrets unless asked to keep them.

### 🗂️ Directory Structure

```
memory/
├── index.json              ← SSC Router (Sparse Selective Cache)
├── segments/               ← Compressed knowledge by topic
│   ├── s001-infra.md
│   ├── s002-project-x.md
│   └── s003-decisions.md
├── checkpoints/            ← Snapshots at key events
│   └── ckpt-YYYY-MM-DD.md
├── daily/                  ← Raw daily logs (append-only)
│   └── YYYY-MM-DD.md
└── fixes/                  ← Bug fix records
```

### 🧠 Session Startup Protocol (Gated Retrieval)

1. **Run SSC Router** — `powershell -ExecutionPolicy Bypass -File memory\ssc-router.ps1 -Query "<relevant terms>"`
2. The script scores segments by keyword/tag overlap, returns top-K, and updates accessCount
3. **Generate online memory** from returned segments + MEMORY.md
4. **DO NOT load all 30+ daily files** — that's the old O(L) pattern
5. **DO NOT read segments manually** — always use the script for consistent scoring and tracking

### 🔒 Security Rules

- **ONLY load segments in main session** (direct chats with your human)
- **DO NOT load in shared contexts** (Discord, group chats, sessions with other people)
- MEMORY.md is auto-generated from segments — update segments, not MEMORY.md directly

### 📝 Write Protocol

- **Daily events** → append to `memory/daily/YYYY-MM-DD.md`
- **Decisions/lessons** → update the relevant segment in `memory/segments/`
- **Resolved events** → create checkpoint in `memory/checkpoints/`
- **New topic emerging** → create new segment with index entry
- **Update `index.json`** whenever segments change

### 🔄 Auto-Improve (Memory Maintenance)

During heartbeats or idle time, run maintenance:
- **Compress** segments not accessed in 30+ days
- **Merge** segments with similarity > 0.85
- **Split** segments that grow > 5KB
- **Update index** based on access patterns
- **Generate new checkpoints** for resolved issues

### 📝 Write It Down - No "Mental Notes"!

- **Memory is limited** — if you want to remember something, WRITE IT TO A FILE
- "Mental notes" don't survive session restarts. Files do.
- When someone says "remember this" → update `memory/YYYY-MM-DD.md` or relevant file
- When you learn a lesson → update AGENTS.md, TOOLS.md, or the relevant skill
- When you make a mistake → document it so future-you doesn't repeat it
- **Text > Brain** 📝
