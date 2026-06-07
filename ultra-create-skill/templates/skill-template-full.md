---
name: your-skill-name
description: >-
  Use when [specific triggering conditions, symptoms, and contexts].
  Also use when [additional triggers]. Trigger terms: [term1], [term2],
  [term3], [term4].
---

# Skill Title

[Brief overview: what this skill does and why it exists. 2-4 sentences.]

---

## Installation

```bash
# OpenClaw (recommended)
cp -r your-skill-name/ ~/.openclaw/skills/your-skill-name/

# Cross-platform
cp -r your-skill-name/ ~/.agents/skills/your-skill-name/
```

No external dependencies required.

---

## Setup

[Configuration instructions, environment variables, prerequisites.]

---

## When to Use This Skill

- Use when [scenario 1]
- Use when [scenario 2]
- Use when [scenario 3]
- Use when [scenario 4]

---

## When NOT to Use This Skill

- Do NOT use when [counter-scenario 1]
- Do NOT use when [counter-scenario 2]
- Do NOT use when [counter-scenario 3]

---

## How It Works

### Step 1: [Action Name]

[Detailed instructions for step 1]

### Step 2: [Action Name]

[Detailed instructions for step 2]

### Step 3: [Action Name]

[Detailed instructions for step 3]

---

## Architecture

```
your-skill-name/
├── SKILL.md              ← Main instructions
├── references/           ← Deep documentation (loaded on demand)
├── scripts/              ← Executable helpers
├── examples/             ← Worked examples
└── evals/                ← Test cases
```

---

## Allowed Tools

- `view_file` — [purpose]
- `run_command` — [purpose]
- `write_to_file` — [purpose]

---

## Usage Examples

### Example 1: [Use Case]

```
[Input/output example]
```

### Example 2: [Use Case]

```
[Input/output example]
```

---

## Best Practices

1. [Best practice 1]
2. [Best practice 2]
3. [Best practice 3]

---

## Reference

- **[Reference File 1](references/file1.md)** — [Description]
- **[Reference File 2](references/file2.md)** — [Description]

---

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `related-skill-1` | [How it relates] |
| `related-skill-2` | [How it relates] |

---

## Checklist

- [ ] [Pre-flight check 1]
- [ ] [Pre-flight check 2]
- [ ] [Pre-flight check 3]

---

## License

Apache-2.0. This skill is part of the OpenClaw ecosystem.

---

## Contributing

1. Fork the repository
2. Edit files following the Architecture section
3. Test changes
4. Submit a pull request

---

## About

[Origin, author, community information. Model-agnostic — works with any LLM.]
