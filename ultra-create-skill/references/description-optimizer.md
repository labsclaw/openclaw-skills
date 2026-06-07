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
5. **Be slightly "pushy"** — Combat under-triggering (agents tend to not use skills when they should)
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
description: Use when implementing any feature or bugfix, before writing implementation code
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
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
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
| **User phrases** | "how do I", "help me with", "I need to" |

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

## Anti-Undertriggering Strategy

Agents tend to "undertrigger" — to not use skills when they should. To combat:

1. Make descriptions slightly "pushy":
   ```yaml
   # Instead of:
   description: How to build dashboards to display data.
   
   # Write:
   description: How to build dashboards to display data. Make sure to use this skill whenever the user mentions dashboards, data visualization, metrics, or wants to display any kind of data, even if they don't explicitly ask for a 'dashboard.'
   ```

2. Include broad trigger terms alongside specific ones
3. Add "even if they don't explicitly ask" language for skills that should trigger proactively
