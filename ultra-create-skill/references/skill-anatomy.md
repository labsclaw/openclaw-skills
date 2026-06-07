# Skill Anatomy — Complete Structural Guide

> Load this reference when you need to understand or explain the full SKILL.md structure.

---

## Directory Structure

```
skill-name/
├── SKILL.md              # REQUIRED: YAML frontmatter + Markdown instructions
├── scripts/              # Optional: executable code (.sh, .py, .mjs, .js)
├── references/           # Optional: heavy docs loaded on demand
├── assets/               # Optional: templates, images, schemas, fonts
├── examples/             # Optional: example files, worked examples
├── templates/            # Optional: code or document templates
├── evals/                # Optional: test cases and evaluation data
└── README.md             # Optional: human-readable documentation
```

**Key rules:**
- Only `SKILL.md` is required — everything else is optional
- Folder name MUST match the `name` field in frontmatter
- Scripts execute without being loaded into agent context
- References are loaded on-demand when the agent needs them

---

## YAML Frontmatter Fields

### Required Fields

| Field | Constraints | Example |
|-------|------------|---------|
| `name` | 1-64 chars, lowercase alphanumeric + hyphens only, no leading/trailing/consecutive hyphens, MUST match folder name | `my-awesome-skill` |
| `description` | Max 1024 chars, non-empty, describes what + when to trigger | `Use when analyzing CSV files...` |

### Optional Fields (agentskills.io Standard)

| Field | Constraints | Example |
|-------|------------|---------|
| `license` | SPDX identifier | `MIT`, `Apache-2.0` |
| `compatibility` | Max 500 chars, environment requirements | `Requires Python 3.9+` |
| `metadata` | Arbitrary key-value map | `author: name, version: 1.0.0` |
| `allowed-tools` | Space-separated tool names (experimental) | `read_file run_command` |

### Extended Fields (Antigravity/Community)

| Field | Values/Format | Purpose |
|-------|--------------|---------|
| `risk` | `none`, `safe`, `critical`, `offensive`, `unknown` | Safety classification |
| `source` | URL or label (`community`, `self`) | Attribution |
| `source_repo` | `OWNER/REPO` | Upstream GitHub repo |
| `source_type` | `official`, `community`, `self` | Credit bucket |
| `category` | Skill category name | Domain grouping |
| `tags` | Array of strings | Keyword categorization |
| `tools` | Array of compatible tools | `[openclaw, opencode, claude]` |
| `date_added` | `YYYY-MM-DD` | When skill was created |
| `author` | Name or handle | Creator attribution |
| `version` | Semver string | `1.0.0` |

---

## Body Section Reference

These 15 sections cover all required topics. Include ALL in comprehensive skills:

| # | Section | Purpose | Required? |
|---|---------|---------|-----------|
| 1 | `# Title` | Clear, descriptive H1 heading | ✅ |
| 2 | `## Installation` | How to install this skill | ✅ |
| 3 | `## Setup` | Configuration, environment variables | ✅ |
| 4 | `## When to Use` | Triggering scenarios (bullet list) | ✅ |
| 5 | `## When NOT to Use` | Counter-indicators | ✅ |
| 6 | `## How It Works` / `## Instructions` | Step-by-step workflow | ✅ |
| 7 | `## Architecture` / `## File Structure` | Directory diagram | ✅ |
| 8 | `## Allowed Tools` | Tools the skill may use | Recommended |
| 9 | `## Usage` / `## Examples` | Inline examples or pointers | ✅ |
| 10 | `## Best Practices` | Token efficiency, tips | Recommended |
| 11 | `## Reference` | Pointers to references/ files | If applicable |
| 12 | `## Related Skills` | Links to complementary skills | Recommended |
| 13 | `## Checklist` | Pre-flight or quality checklist | Recommended |
| 14 | `## License` | License statement | ✅ |
| 15 | `## Contributing` | How to improve this skill | Recommended |
| 16 | `## About` / `## Contact` | Origin, community info | Recommended |

---

## Progressive Disclosure (3-Stage Loading)

| Stage | What Loads | When | Token Cost |
|-------|-----------|------|------------|
| **1. Discovery** | `name` + `description` only | Agent startup | ~100 words per skill |
| **2. Activation** | Full SKILL.md body | When agent determines relevance | ≤500 lines ideal |
| **3. Execution** | Scripts, references, assets | When explicitly needed | Unlimited |

**Key insight**: Description is the ROUTER. The agent reads ALL skill descriptions
at startup and decides which skill to load based on description match. If the
description doesn't match the user's intent, the skill never triggers.

---

## Size Limits

| Component | Limit | Guidance |
|-----------|-------|----------|
| SKILL.md body | ≤ 500 lines | Move overflow to references/ |
| Description | ≤ 1024 chars | Sweet spot: 100-500 chars |
| Name | ≤ 64 chars | Lowercase + hyphens only |
| Reference files | > 300 lines: add TOC | Keep each reference focused |
| Total frontmatter | ≤ 1024 chars | Both fields combined |
