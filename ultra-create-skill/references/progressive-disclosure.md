# Progressive Disclosure — Content Organization Patterns

> Load this reference when organizing a skill's content across files.

---

## The 3-Stage Loading Model

| Stage | What Loads | When | Token Impact |
|-------|-----------|------|-------------|
| **1. Metadata** | `name` + `description` from frontmatter | Agent startup, always | ~100 words per skill |
| **2. SKILL.md Body** | Full markdown instructions | When skill triggers | ≤500 lines ideal |
| **3. Bundled Resources** | References, scripts, assets | When explicitly needed | Unlimited |

**Critical insight**: Stages 2 and 3 are on-demand. Only Stage 1 is always present.
This means every skill you install costs ~100 words of context at all times.

---

## Word Count Targets

| Skill Type | SKILL.md Target | Rationale |
|-----------|----------------|-----------|
| Getting-started workflows | < 150 words | Loaded in every conversation |
| Frequently-triggered skills | < 200 words | Minimize per-trigger cost |
| Standard skills | < 500 lines | Balance depth and token budget |
| Complex skills | ≤ 500 lines + references/ | Use progressive disclosure |

---

## Organization Patterns

### Pattern 1: High-Level Guide with References

SKILL.md provides overview and navigation. Details live in separate files.

```markdown
# PDF Processing

## Quick start
Extract text with pdfplumber:
[code example]

## Advanced features
**Form filling**: See [FORMS.md](references/forms.md) for complete guide
**API reference**: See [REFERENCE.md](references/api-reference.md) for all methods
**Examples**: See [EXAMPLES.md](examples/examples.md) for common patterns
```

The agent loads FORMS.md, REFERENCE.md, or EXAMPLES.md only when needed.

### Pattern 2: Domain-Specific Organization

For skills with multiple domains, organize by variant:

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── references/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

When a user asks about sales metrics, the agent only reads sales.md.

### Pattern 3: Conditional Details

Basic content inline, advanced content in references:

```markdown
# DOCX Processing

## Creating documents
Use docx-js for new documents. See [DOCX-JS.md](references/docx-js.md).

## Editing documents
For simple edits, modify the XML directly.
**For tracked changes**: See [REDLINING.md](references/redlining.md)
**For OOXML details**: See [OOXML.md](references/ooxml.md)
```

---

## Critical Rules

### Keep references ONE level deep

The agent may partially read files referenced from other referenced files.

```markdown
# ❌ BAD: Nested references (agent may not follow)
SKILL.md → advanced.md → details.md → actual-info.md

# ✅ GOOD: All references direct from SKILL.md
SKILL.md → advanced.md
SKILL.md → details.md
SKILL.md → actual-info.md
```

### Move heavy content to references/

If a section exceeds ~100 lines, extract it:

```markdown
# ❌ BAD: 800-line SKILL.md with inline API reference

# ✅ GOOD: 200-line SKILL.md pointing to references/api.md
## API Reference
See [references/api.md](references/api.md) for the complete API documentation.
```

### Scripts execute without loading

Scripts in `scripts/` are executed by the agent without being loaded into
context. This means they don't consume tokens:

```markdown
## Validation
Run the validation script:
bash scripts/validate.sh <path>
```

The agent runs the script and reads the OUTPUT — it doesn't load the script
source into its context window.

### Large reference files need a TOC

For reference files exceeding 300 lines, include a table of contents:

```markdown
# API Reference

## Table of Contents
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [Error Codes](#error-codes)
- [Rate Limits](#rate-limits)
```

This helps the agent navigate to the relevant section using grep or search.
