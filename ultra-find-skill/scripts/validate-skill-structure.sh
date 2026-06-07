#!/usr/bin/env bash
# validate-skill-structure.sh — Validate a skill's SKILL.md format
# Usage: bash validate-skill-structure.sh <path-to-skill-directory>

set -euo pipefail

SKILL_DIR="${1:?Usage: validate-skill-structure.sh <skill-directory>}"
ERRORS=0
WARNINGS=0

echo "╔══════════════════════════════════════════════════════════╗"
echo "║       Ultra Find Skill — Structure Validator            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Validating: $SKILL_DIR"
echo ""

# Check SKILL.md exists
if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
  echo "❌ FAIL: SKILL.md not found in $SKILL_DIR"
  ERRORS=$((ERRORS + 1))
  echo ""
  echo "Result: $ERRORS error(s), $WARNINGS warning(s)"
  exit 1
fi

echo "✅ SKILL.md exists"

# Check frontmatter exists
if ! head -1 "$SKILL_DIR/SKILL.md" | grep -q "^---$"; then
  echo "❌ FAIL: No YAML frontmatter (missing opening ---)"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Frontmatter opening found"
fi

# Check name field
NAME_FIELD=$(grep "^name:" "$SKILL_DIR/SKILL.md" 2>/dev/null | head -1 | sed 's/name:[[:space:]]*//')
FOLDER_NAME=$(basename "$SKILL_DIR")

if [ -z "$NAME_FIELD" ]; then
  echo "❌ FAIL: Missing 'name' field in frontmatter"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ name field: $NAME_FIELD"
  if [ "$NAME_FIELD" != "$FOLDER_NAME" ]; then
    echo "⚠️  WARN: name '$NAME_FIELD' does not match folder '$FOLDER_NAME'"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "✅ name matches folder name"
  fi
  # Check name format
  if echo "$NAME_FIELD" | grep -qE '[^a-z0-9-]'; then
    echo "⚠️  WARN: name contains characters other than lowercase + hyphens"
    WARNINGS=$((WARNINGS + 1))
  fi
  NAME_LEN=${#NAME_FIELD}
  if [ "$NAME_LEN" -gt 64 ]; then
    echo "❌ FAIL: name exceeds 64 characters ($NAME_LEN chars)"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check description field
DESC_LINE=$(grep -n "^description:" "$SKILL_DIR/SKILL.md" 2>/dev/null | head -1)
if [ -z "$DESC_LINE" ]; then
  echo "❌ FAIL: Missing 'description' field in frontmatter"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ description field present"
fi

# Check line count
LINE_COUNT=$(wc -l < "$SKILL_DIR/SKILL.md")
if [ "$LINE_COUNT" -gt 500 ]; then
  echo "⚠️  WARN: SKILL.md has $LINE_COUNT lines (recommended ≤ 500)"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ Line count: $LINE_COUNT (within limit)"
fi

# Check for model-specific references
MODEL_REFS=$(grep -ciE "(claude|gpt-[0-9]|gemini [0-9]|opus|sonnet|haiku)" "$SKILL_DIR/SKILL.md" 2>/dev/null || echo "0")
if [ "$MODEL_REFS" -gt 0 ]; then
  echo "⚠️  WARN: Found $MODEL_REFS potential model-specific references"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ No model-specific references found"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "Result: $ERRORS error(s), $WARNINGS warning(s)"
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ PASSED"
else
  echo "❌ FAILED"
fi
exit "$ERRORS"
