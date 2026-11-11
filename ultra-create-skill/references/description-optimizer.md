# Description Optimizer — Agent Search Optimization (ASO)

> Load this reference when writing or improving a skill's description field.

---

## The #1 Rule

**Description = WHEN to use, NOT WHAT it does.**

> [!CAUTION]
> Testing revealed that when a description summarizes the skill's workflow,
> agents may follow the description INSTEAD of reading the full skill content.
> Descriptions that summarize workflow create a shortcut the agent will take.
> The skill body becomes documentation the agent skips.

---

## Description Format Rules

1. **Start with "Use when..."** — Focus on triggering conditions
2. **Write in third person** — Description is injected into system prompt
3. **Describe the PROBLEM** — Not language-specific symptoms
4. **Include trigger terms** — Words the agent would search for
5. **Disambiguate near misses**: put relevant exclusions beside positive triggers in the same `description` string; do not maximize invocation frequency
6. **NEVER summarize the skill's process or workflow**
7. **Keep to 100-500 characters** — Sweet spot for triggering accuracy
8. **Hard limit: 1024 characters** — agentskills.io spec

---

## Bad vs Good Examples

### ❌ BAD: Summarizes workflow
```yaml
description: Use when executing plans - dispatches subagent per task with code review between tasks
```
**Why bad**: Agent may follow this summary instead of reading the full skill.

### ✅ GOOD: Just triggering conditions
```yaml
description: Use when executing implementation plans with independent tasks in the current session
```

---

### ❌ BAD: Too much process detail
```yaml
description: Use for TDD - write test first, watch it fail, write minimal code, refactor
```

### ✅ GOOD: Problem-focused
```yaml
description: "Use when implementing behavior with a testable contract where a test-first workflow is requested or useful. Not for a typo, documentation-only edit or a definition of TDD."
```

---

### ❌ BAD: Too abstract and vague
```yaml
description: For async testing
```

### ✅ GOOD: Specific symptoms and situations
```yaml
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
```

---

### ❌ BAD: First person
```yaml
description: I can help you process Excel files and generate reports
```

### ✅ GOOD: Third person
```yaml
description: Processes Excel files, creates pivot tables, generates charts. Use when analyzing spreadsheets, tabular data, or .xlsx files.
```

---

### ❌ BAD: Vague, no trigger terms
```yaml
description: Helps with documents
```

### ✅ GOOD: Specific with trigger terms
```yaml
description: "Use when extracting PDF text/tables, filling a PDF form or merging PDF files. Not for merely mentioning PDFs or asking what a PDF is."
```

---

### ❌ BAD: Technology-specific but skill isn't
```yaml
description: Use when tests use setTimeout/sleep and are flaky
```

### ✅ GOOD: Problem-level description
```yaml
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently
```

---

## Keyword Coverage Checklist

Include words the agent would search for:

| Category | Examples |
|----------|---------|
| **Error messages** | "Hook timed out", "ENOTEMPTY", "race condition" |
| **Symptoms** | "flaky", "hanging", "zombie", "pollution", "slow" |
| **Synonyms** | "timeout/hang/freeze", "cleanup/teardown/afterEach" |
| **Tools & commands** | Library names, CLI commands, file types |
| **User intent** | Specific requested artifact/action, not generic phrases such as "how do I" alone |

---

## Naming Conventions

**Prefer gerund form** (verb + -ing):
- ✅ `processing-pdfs`, `analyzing-data`, `testing-code`
- ❌ `pdf-processor`, `data-analysis`, `test-helper`

**Active voice, verb-first:**
- ✅ `creating-skills` not `skill-creation`
- ✅ `condition-based-waiting` not `async-test-helpers`

**Avoid:**
- ❌ "Helper", "Utils", "Tools" (too vague)
- ❌ "Documents", "Data", "Files" (too generic)
- ❌ Inconsistent patterns within a skill collection

---

## Balanced Routing: Positive Triggers and Anti-Triggers

Descriptions are visible before the body. Put the requested task and its most likely false-positive boundary in the same YAML string. A `When NOT to Use` section in the body is useful during execution, but cannot prevent initial misrouting.

```yaml
description: "Use when the user requests a guided study session with practice and feedback. Not for a one-off explanation or definition unless a study session is requested."
```

Do not require the literal phrase "Not for" in every skill. A precise scope can already exclude unrelated work. Add a negative clause only for a plausible near miss or sibling-skill collision. Do not exclude a legitimate operational task just because it is short or phrased as a question.

For a routing edit, record at least one positive request that must still activate and one near-miss request that must not. Cover definitions, incidental keyword mentions, status-only requests, small reversible tasks and sibling workflows where relevant. Keep quoted/folded YAML valid, especially when a description contains `: `.

Freeze the candidate descriptions and content digests when running model-based evaluations; label synthetic fixtures and editorial review separately from an executed model benchmark. A structural check cannot prove semantic routing accuracy.
