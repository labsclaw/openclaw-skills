#!/usr/bin/env bash
# new-kt.sh — Create a new Knowledge Transfer document
# Usage: bash new-kt.sh "TICKET-123" "Topic Name" [docs-dir]

set -euo pipefail

TICKET="${1:?Usage: bash new-kt.sh \"TICKET-123\" \"Topic Name\" [docs-dir]}"
TOPIC="${2:?Usage: bash new-kt.sh \"TICKET-123\" \"Topic Name\" [docs-dir]}"
DOCS_DIR="${3:-docs}"

# Slugify topic
SLUG=$(echo "$TOPIC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

mkdir -p "$DOCS_DIR"
FILENAME="$DOCS_DIR/KT-${TICKET}-${SLUG}.md"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../templates/kt-template.md"

if [ -f "$TEMPLATE" ]; then
  sed "s/TICKET-XXX — \[Topic Name\]/${TICKET} — ${TOPIC}/" "$TEMPLATE" > "$FILENAME"
else
  cat > "$FILENAME" << EOF
# KT: ${TOPIC} — ${TICKET}

## Summary

[What was done and why it matters]

## Context

- **Why:** [Motivation]
- **Scope:** [What was in scope]

## Key Decisions Made

1. [Decision and reasoning]

## Implementation Details

### What Changed
- [File changes]

### How It Works
[Non-obvious implementation details]

## Gotchas and Lessons Learned

- [Gotcha 1]

## Testing

\`\`\`bash
# Verification commands
\`\`\`

## Related Tickets

- ${TICKET}: [Description]

## Future Work

- [ ] [Next task]
EOF
fi

echo "Created: $FILENAME"
