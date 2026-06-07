# Example: Creating a Tool-Based Skill

A tool-based skill includes executable scripts that perform deterministic tasks.

## Scenario

User: "Create a skill that validates JSON schema files"

## Phase 1: Capture Intent

- **What**: Validate JSON files against JSON Schema
- **When**: When user has a .json file and a schema file
- **Output**: Validation result (pass/fail with error details)
- **Test needed?**: Yes — output is deterministic

## Phase 3: Generated Structure

```
json-schema-validator/
├── SKILL.md
├── scripts/
│   └── validate.sh
└── examples/
    └── basic-validation.md
```

## Generated SKILL.md

```markdown
---
name: json-schema-validator
description: >-
  Use when validating JSON files against JSON Schema, checking data format
  compliance, or debugging schema validation errors. Trigger terms: JSON
  schema, validate JSON, schema validation, data validation, JSON format.
---

# JSON Schema Validator

Validate JSON data files against JSON Schema definitions.

## Installation

\`\`\`bash
cp -r json-schema-validator/ ~/.openclaw/skills/json-schema-validator/
\`\`\`

## Setup

Requires `ajv-cli` or `jsonschema` (Python). The validation script
auto-detects which is available.

## When to Use

- Validating JSON config files against a schema
- Debugging schema validation errors
- Checking API request/response format compliance

## How It Works

### Step 1: Identify Files
Determine the JSON data file and the schema file.

### Step 2: Run Validation
\`\`\`bash
bash scripts/validate.sh <data.json> <schema.json>
\`\`\`

### Step 3: Report Results
The script outputs pass/fail with specific error locations.

## Architecture

\`\`\`
json-schema-validator/
├── SKILL.md              ← Instructions
├── scripts/
│   └── validate.sh       ← Validation runner
└── examples/
    └── basic-validation.md
\`\`\`

## License

Apache-2.0
```

## Generated scripts/validate.sh

```bash
#!/usr/bin/env bash
set -euo pipefail
DATA="${1:?Usage: validate.sh <data.json> <schema.json>}"
SCHEMA="${2:?Usage: validate.sh <data.json> <schema.json>}"

if command -v ajv &>/dev/null; then
  ajv validate -s "$SCHEMA" -d "$DATA"
elif command -v jsonschema &>/dev/null; then
  jsonschema -i "$DATA" "$SCHEMA"
else
  echo "Error: Install ajv-cli (npm i -g ajv-cli) or jsonschema (pip install jsonschema)"
  exit 1
fi
```

## Key Pattern

The script is **executed, not loaded into context**. This means:
- Zero token cost for the script itself
- Agent runs the script and reads the OUTPUT
- Deterministic behavior regardless of the agent model
