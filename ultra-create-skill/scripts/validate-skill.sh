#!/usr/bin/env bash
# validate-skill.sh — Comprehensive skill validation
# Usage: bash validate-skill.sh <path-to-skill-directory>

set -euo pipefail

SKILL_DIR="${1:?Usage: validate-skill.sh <skill-directory>}"
ERRORS=0
WARNINGS=0
SCORE=0

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Ultra Create Skill — Comprehensive Validator        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Validating: $SKILL_DIR"
echo ""

# === STRUCTURE (15 points) ===
echo "── Structure ──"

if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
  echo "❌ SKILL.md not found"; ERRORS=$((ERRORS + 1))
else
  echo "✅ SKILL.md exists"; SCORE=$((SCORE + 3))

  # Frontmatter check
  if head -1 "$SKILL_DIR/SKILL.md" | grep -q "^---$"; then
    echo "✅ Valid frontmatter"; SCORE=$((SCORE + 2))
  else
    echo "❌ Missing frontmatter"; ERRORS=$((ERRORS + 1))
  fi

  # Name field
  NAME=$(grep "^name:" "$SKILL_DIR/SKILL.md" 2>/dev/null | head -1 | sed 's/name:[[:space:]]*//')
  FOLDER=$(basename "$SKILL_DIR")
  if [ -n "$NAME" ]; then
    echo "✅ name: $NAME"; SCORE=$((SCORE + 3))
    if [ "$NAME" = "$FOLDER" ]; then
      echo "✅ name matches folder"; SCORE=$((SCORE + 3))
    else
      echo "⚠️  name '$NAME' ≠ folder '$FOLDER'"; WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo "❌ Missing name field"; ERRORS=$((ERRORS + 1))
  fi

  # Description field
  if grep -q "^description:" "$SKILL_DIR/SKILL.md"; then
    echo "✅ description present"; SCORE=$((SCORE + 3))
  else
    echo "❌ Missing description"; ERRORS=$((ERRORS + 1))
  fi
fi

echo ""

# === LINE COUNT (10 points) ===
echo "── Token Efficiency ──"
if [ -f "$SKILL_DIR/SKILL.md" ]; then
  LINES=$(wc -l < "$SKILL_DIR/SKILL.md")
  if [ "$LINES" -le 500 ]; then
    echo "✅ $LINES lines (≤500)"; SCORE=$((SCORE + 4))
  else
    echo "⚠️  $LINES lines (>500)"; WARNINGS=$((WARNINGS + 1))
  fi

  # Check for references/ directory (progressive disclosure)
  if [ -d "$SKILL_DIR/references" ]; then
    echo "✅ references/ directory exists"; SCORE=$((SCORE + 3))
  else
    if [ "$LINES" -gt 300 ]; then
      echo "⚠️  No references/ dir (consider splitting)"; WARNINGS=$((WARNINGS + 1))
    else
      echo "ℹ️  No references/ (acceptable for small skills)"
    fi
  fi
fi

echo ""

# === COMPLETENESS (15 points) ===
echo "── Completeness ──"
SECTIONS=0
for TOPIC in "Installation" "Setup" "When to Use" "When NOT" "How It Works\|Instructions" "Architecture\|File Structure" "Allowed Tools" "Usage\|Examples" "Best Practices" "Reference" "Related Skills" "Checklist" "License" "Contributing" "About\|Contact"; do
  if grep -qiE "## .*(${TOPIC})" "$SKILL_DIR/SKILL.md" 2>/dev/null; then
    SECTIONS=$((SECTIONS + 1))
  fi
done
echo "  Sections found: $SECTIONS / 15"
SCORE=$((SCORE + SECTIONS))

echo ""

# === MODEL-AGNOSTIC (10 points) ===
echo "── Model-Agnostic ──"
MODEL_REFS=$(grep -ciE "(claude|gpt-[0-9]|gemini [0-9]|opus|sonnet|haiku)" "$SKILL_DIR/SKILL.md" 2>/dev/null || echo "0")
if [ "$MODEL_REFS" -eq 0 ]; then
  echo "✅ No model-specific references"; SCORE=$((SCORE + 10))
else
  echo "⚠️  Found $MODEL_REFS model references"; WARNINGS=$((WARNINGS + 1)); SCORE=$((SCORE + 5))
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "Errors: $ERRORS | Warnings: $WARNINGS | Score: ~$SCORE"
echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ VALIDATION PASSED"
else
  echo "❌ VALIDATION FAILED ($ERRORS errors)"
fi
exit "$ERRORS"
