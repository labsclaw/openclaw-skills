# Quality Scorecard — Skill Evaluation Rubric (0-100)

> Load this reference when evaluating a skill's quality before publishing.

---

## Scoring Rubric

| Criterion | Weight | What to Evaluate |
|-----------|--------|-----------------|
| **Description Quality** | 20% | Follows ASO rules, triggers correctly, appropriate length |
| **Structure** | 15% | Valid frontmatter, name=folder, all required sections present |
| **Documentation** | 15% | Clear instructions, step-by-step workflow, well-organized |
| **Completeness** | 15% | All 15 required topics covered |
| **Token Efficiency** | 10% | Under 500 lines, progressive disclosure used properly |
| **Model-Agnostic** | 10% | No model-specific references anywhere |
| **Testing** | 10% | Test cases exist, examples are verifiable |
| **Security** | 5% | No injection patterns, no hardcoded secrets |

---

## Score Bands

| Band | Score | Verdict |
|------|-------|---------|
| 🟢 Excellent | 80-100 | Ready for publication |
| 🟡 Good | 60-79 | Minor improvements recommended |
| 🟠 Needs Work | 40-59 | Significant gaps to address |
| 🔴 Major Revision | 0-39 | Fundamental rework needed |

---

## Quick Scoring Checklist

### Description Quality (20 points max)

- [ ] Starts with "Use when..." or equivalent trigger phrase (+4)
- [ ] Written in third person (+3)
- [ ] Does NOT summarize the workflow (+4)
- [ ] Includes 3+ trigger terms (+3)
- [ ] Length between 100-500 characters (+3)
- [ ] Slightly "pushy" to combat under-triggering (+3)

### Structure (15 points max)

- [ ] SKILL.md exists with valid YAML frontmatter (+3)
- [ ] `name` field matches folder name (+3)
- [ ] `name` is lowercase + hyphens only, ≤ 64 chars (+2)
- [ ] `description` field is non-empty and ≤ 1024 chars (+3)
- [ ] Directory structure follows convention (+2)
- [ ] Supporting dirs named correctly (references/, scripts/, etc.) (+2)

### Documentation (15 points max)

- [ ] Clear H1 title (+2)
- [ ] Step-by-step instructions with numbered steps (+4)
- [ ] Code examples included (inline or in examples/) (+3)
- [ ] Well-organized with logical section flow (+3)
- [ ] Input/output examples showing what success looks like (+3)

### Completeness (15 points max — 1 point per topic present)

- [ ] Installation
- [ ] Setup
- [ ] When to Use
- [ ] When NOT to Use
- [ ] Instructions / How It Works
- [ ] File Structure / Architecture
- [ ] Allowed Tools
- [ ] Usage / Examples
- [ ] Best Practices
- [ ] Reference
- [ ] Related Skills
- [ ] Checklist
- [ ] License
- [ ] Contributing
- [ ] About / Contact

### Token Efficiency (10 points max)

- [ ] SKILL.md ≤ 500 lines (+4)
- [ ] Heavy content in references/, not inline (+3)
- [ ] No unnecessary repetition (+2)
- [ ] References are one level deep from SKILL.md (+1)

### Model-Agnostic (10 points max)

- [ ] No model names (GPT, Claude, Gemini, etc. as model refs) (+5)
- [ ] No provider names used as requirements (+3)
- [ ] Uses "the agent", "you", "the LLM" instead (+2)

### Testing (10 points max)

- [ ] At least 2-3 test cases or verifiable examples (+4)
- [ ] Eval cases in evals/ directory (+3)
- [ ] Baseline vs with-skill comparison documented (+3)

### Security (5 points max)

- [ ] No prompt injection patterns (+2)
- [ ] No hardcoded secrets or API keys (+2)
- [ ] Scripts reviewed for destructive commands (+1)

---

## Scoring Protocol

1. Go through each checklist item above
2. Sum points earned in each category
3. Apply weights: `final = Σ (category_points / max_points × weight × 100)`
4. Round to nearest integer
5. Report score with band and specific improvement recommendations

### Example Calculation

```
Description: 17/20 × 20% = 17
Structure: 13/15 × 15% = 13
Documentation: 12/15 × 15% = 12
Completeness: 13/15 × 15% = 13
Token Efficiency: 8/10 × 10% = 8
Model-Agnostic: 10/10 × 10% = 10
Testing: 7/10 × 10% = 7
Security: 5/5 × 5% = 5

TOTAL = 85/100 → 🟢 Excellent
```
