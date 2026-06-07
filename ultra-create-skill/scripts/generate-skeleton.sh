#!/usr/bin/env bash
# generate-skeleton.sh — Generate a skill directory skeleton
# Usage: bash generate-skeleton.sh <skill-name> [template: basic|full|reference]

set -euo pipefail

NAME="${1:?Usage: generate-skeleton.sh <skill-name> [basic|full|reference]}"
TEMPLATE="${2:-basic}"
TARGET_DIR="./$NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "❌ Directory '$TARGET_DIR' already exists"
  exit 1
fi

echo "Creating skill skeleton: $NAME (template: $TEMPLATE)"

mkdir -p "$TARGET_DIR"

case "$TEMPLATE" in
  full)
    mkdir -p "$TARGET_DIR"/{scripts,references,assets,examples,evals}
    ;;
  reference)
    mkdir -p "$TARGET_DIR"/{references,examples}
    ;;
  basic|*)
    # Just the SKILL.md
    ;;
esac

cat > "$TARGET_DIR/SKILL.md" << EOF
---
name: $NAME
description: >-
  Use when [describe triggering conditions here]. Trigger terms: [term1],
  [term2], [term3].
---

# $(echo "$NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)} 1')

[Brief overview: what this skill does and why it exists. 2-4 sentences.]

---

## Installation

\`\`\`bash
cp -r $NAME/ ~/.openclaw/skills/$NAME/
\`\`\`

## Setup

No configuration needed. [Or describe env vars, dependencies.]

## When to Use This Skill

- Use when [scenario 1]
- Use when [scenario 2]
- Use when [scenario 3]

## When NOT to Use This Skill

- Do NOT use when [counter-scenario 1]
- Do NOT use when [counter-scenario 2]

## How It Works

### Step 1: [Action]

[Detailed instructions]

### Step 2: [Action]

[Detailed instructions]

## Architecture

\`\`\`
$NAME/
├── SKILL.md              ← Main instructions
EOF

case "$TEMPLATE" in
  full)
    cat >> "$TARGET_DIR/SKILL.md" << 'EOF'
├── references/           ← Deep documentation
├── scripts/              ← Executable helpers
├── assets/               ← Templates, images
├── examples/             ← Worked examples
└── evals/                ← Test cases
EOF
    ;;
  reference)
    cat >> "$TARGET_DIR/SKILL.md" << 'EOF'
├── references/           ← Deep documentation
└── examples/             ← Worked examples
EOF
    ;;
esac

cat >> "$TARGET_DIR/SKILL.md" << 'EOF'
```

## Allowed Tools

- `view_file` — Read files
- `run_command` — Execute scripts

## Best Practices

1. [Best practice 1]
2. [Best practice 2]

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `related-skill` | [How it relates] |

## Checklist

- [ ] [Pre-flight check 1]
- [ ] [Pre-flight check 2]

## License

Apache-2.0

## Contributing

[How to improve this skill]

## About

[Origin and community info]
EOF

echo "✅ Created skill skeleton at: $TARGET_DIR"
echo ""
ls -la "$TARGET_DIR"
