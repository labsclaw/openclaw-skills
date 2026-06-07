# Evaluation Criteria — Quality Scorecard (0-100)

> Load this reference when ranking or comparing discovered skills.

---

## Scoring Rubric

| Criterion | Weight | What to Evaluate |
|-----------|--------|-----------------|
| **Compatibility** | 25% | Works or can be adapted to OpenClaw/agentskills.io format? |
| **Model-Agnostic** | 20% | No references to specific models, providers, or versions? |
| **Documentation** | 20% | Has complete SKILL.md with frontmatter, instructions, examples? |
| **Tests** | 15% | Has automated tests, verifiable examples, or eval cases? |
| **Maintenance** | 10% | Last update < 6 months? Active community? Issues addressed? |
| **License** | 10% | Open-source compatible (MIT, Apache-2.0, BSD, CC-BY)? |

### Score Calculation

```
score = Σ (criterion_score × weight)
```

Each criterion is scored 0-100 individually, then weighted.

---

## Score Bands

| Band | Score | Verdict | Action |
|------|-------|---------|--------|
| 🟢 Excellent | 80-100 | Ready for use | Install directly |
| 🟡 Good | 60-79 | Needs minor adaptation | Install with modifications |
| 🟠 Risky | 40-59 | Requires significant rework | Consider creating from scratch |
| 🔴 Reject | 0-39 | Not worth the effort | Skip this skill |

---

## Criterion Details

### Compatibility (25%)

| Score | Criteria |
|-------|----------|
| 100 | Valid SKILL.md with agentskills.io-compliant frontmatter |
| 80 | Has SKILL.md but minor frontmatter issues |
| 60 | Has documentation but not in SKILL.md format |
| 40 | Has code/scripts but no SKILL.md |
| 20 | Requires major format conversion |
| 0 | Incompatible architecture |

### Model-Agnostic (20%)

| Score | Criteria |
|-------|----------|
| 100 | No model-specific references anywhere |
| 80 | Minor references easily removed |
| 50 | Moderate model-specific content |
| 20 | Heavily tied to one model/provider |
| 0 | Only works with a specific model |

### Documentation (20%)

| Score | Criteria |
|-------|----------|
| 100 | Complete: frontmatter + all sections + examples |
| 80 | Good: frontmatter + instructions + some examples |
| 60 | Adequate: frontmatter + basic instructions |
| 40 | Minimal: README exists but no SKILL.md |
| 20 | Sparse: code comments only |
| 0 | No documentation |

### Tests (15%)

| Score | Criteria |
|-------|----------|
| 100 | Automated test suite with eval cases |
| 80 | Eval cases defined in evals.json |
| 60 | Verifiable examples that can be tested |
| 40 | Manual testing instructions |
| 20 | Example usage only |
| 0 | No tests or examples |

### Maintenance (10%)

| Score | Criteria |
|-------|----------|
| 100 | Updated within 30 days, active issues |
| 80 | Updated within 3 months |
| 60 | Updated within 6 months |
| 40 | Updated within 1 year |
| 20 | Updated over 1 year ago |
| 0 | Abandoned (no activity 2+ years) |

### License (10%)

| Score | Criteria |
|-------|----------|
| 100 | MIT, Apache-2.0, BSD, CC0 |
| 80 | LGPL, MPL, CC-BY |
| 60 | GPL (copyleft, may restrict use) |
| 40 | Custom license (needs review) |
| 20 | No license specified |
| 0 | Proprietary or incompatible license |

---

## Quick Evaluation Protocol

1. **Check SKILL.md exists** → If no, score Compatibility ≤ 40
2. **Parse frontmatter** → Valid `name` and `description`?
3. **Grep for model names** → Search for "claude", "gpt", "gemini" (as model refs)
4. **Count documentation sections** → How many of the 15 required topics?
5. **Check last commit date** → `git log -1 --format=%cd`
6. **Read LICENSE file** → SPDX identifier?
7. **Calculate weighted score** → Apply formula above
8. **Report with verdict** → Band + specific improvement suggestions
