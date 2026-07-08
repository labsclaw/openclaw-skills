#!/usr/bin/env bash
# new-adr.sh — Create a new ADR with the next available number
# Usage: bash new-adr.sh "Title of the Decision" [docs-dir]

set -euo pipefail

TITLE="${1:?Usage: bash new-adr.sh \"Title\" [docs-dir]}"
DOCS_DIR="${2:-docs/adr}"

# Find next ADR number
mkdir -p "$DOCS_DIR"
LAST_NUM=0
for f in "$DOCS_DIR"/ADR-*-*.md; do
  [ -f "$f" ] || continue
  NUM=$(basename "$f" | grep -oP 'ADR-\K[0-9]+' | head -1)
  if [ "$NUM" -gt "$LAST_NUM" ] 2>/dev/null; then
    LAST_NUM=$NUM
  fi
done

NEXT_NUM=$((LAST_NUM + 1))
PADDED_NUM=$(printf "%03d" "$NEXT_NUM")

# Slugify title
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

FILENAME="$DOCS_DIR/ADR-${PADDED_NUM}-${SLUG}.md"

# Get script directory for template
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../templates/adr-template.md"

if [ -f "$TEMPLATE" ]; then
  sed "s/ADR-XXX: \[Title\]/ADR-${PADDED_NUM}: ${TITLE}/" "$TEMPLATE" > "$FILENAME"
else
  cat > "$FILENAME" << EOF
# ADR-${PADDED_NUM}: ${TITLE}

## Status

Proposed

## Context

[Describe the problem and motivation]

## Decision

[State the decision]

## Consequences

### Positive
- [Benefit 1]

### Negative
- [Tradeoff 1]

### Neutral
- [Observation]
EOF
fi

echo "Created: $FILENAME"
