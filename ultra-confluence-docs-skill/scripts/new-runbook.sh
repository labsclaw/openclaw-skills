#!/usr/bin/env bash
# new-runbook.sh — Create a new runbook from template
# Usage: bash new-runbook.sh "operation-name" [docs-dir]

set -euo pipefail

OPERATION="${1:?Usage: bash new-runbook.sh \"operation-name\" [docs-dir]}"
DOCS_DIR="${2:-docs/runbooks}"

# Slugify
SLUG=$(echo "$OPERATION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

mkdir -p "$DOCS_DIR"
FILENAME="$DOCS_DIR/${SLUG}-runbook.md"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../templates/runbook-template.md"

if [ -f "$TEMPLATE" ]; then
  sed "s/Runbook: \[Operation Name\]/Runbook: ${OPERATION}/" "$TEMPLATE" > "$FILENAME"
else
  cat > "$FILENAME" << EOF
# Runbook: ${OPERATION}

## Overview

[Brief description]

## Prerequisites

- [ ] Access required

## Procedure

### Step 1: [Action]

\`\`\`bash
command
\`\`\`

**Expected output:** [What to see]
**If error:** [What to do]

## Rollback

[How to undo]

## Contacts

- Primary: [Name]
EOF
fi

echo "Created: $FILENAME"
