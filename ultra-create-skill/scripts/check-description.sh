#!/usr/bin/env bash
# check-description.sh — Validate skill description quality
# Usage: bash check-description.sh <path-to-skill-directory>

set -euo pipefail

SKILL_DIR="${1:?Usage: check-description.sh <skill-directory>}"
SKILL_FILE="$SKILL_DIR/SKILL.md"
ISSUES=0

echo "╔══════════════════════════════════════════════════════════╗"
echo "║    Ultra Create Skill — Description Quality Check       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [ ! -f "$SKILL_FILE" ]; then
  echo "❌ SKILL.md not found at $SKILL_FILE"
  exit 1
fi

# Extract description (handles multi-line YAML)
DESC=$(awk '/^description:/{found=1; sub(/^description:[[:space:]]*/, ""); if(/^>-?$/ || /^\|/){next}} found && /^[[:space:]]/{sub(/^[[:space:]]+/, ""); printf "%s ", $0; next} found && !/^[[:space:]]/{exit} !found{next} {printf "%s ", $0}' "$SKILL_FILE" | head -c 2000)

if [ -z "$DESC" ]; then
  echo "❌ Could not extract description"
  exit 1
fi

DESC_LEN=${#DESC}
echo "Description ($DESC_LEN chars):"
echo "  \"$DESC\""
echo ""
echo "── Quality Checks ──"

# Check: starts with "Use when" or similar
if echo "$DESC" | grep -qiE "^(Use when|Use this|Trigger when|Activate when)"; then
  echo "✅ Starts with trigger phrase"
else
  echo "⚠️  Does not start with 'Use when...' — may reduce trigger accuracy"
  ISSUES=$((ISSUES + 1))
fi

# Check: not first person
if echo "$DESC" | grep -qiE "(^I can|^I help|^I will|I'm able)"; then
  echo "❌ Uses first person — must be third person"
  ISSUES=$((ISSUES + 1))
else
  echo "✅ Not first person"
fi

# Check: doesn't summarize workflow
WORKFLOW_WORDS=$(echo "$DESC" | grep -ciE "(step [0-9]|then |first |next |finally |after that)" || echo "0")
if [ "$WORKFLOW_WORDS" -gt 2 ]; then
  echo "⚠️  May be summarizing workflow ($WORKFLOW_WORDS sequential words found)"
  ISSUES=$((ISSUES + 1))
else
  echo "✅ Does not appear to summarize workflow"
fi

# Check: length
if [ "$DESC_LEN" -lt 50 ]; then
  echo "❌ Too short ($DESC_LEN chars) — minimum 50 recommended"
  ISSUES=$((ISSUES + 1))
elif [ "$DESC_LEN" -lt 100 ]; then
  echo "⚠️  Short ($DESC_LEN chars) — 100-500 chars is the sweet spot"
  ISSUES=$((ISSUES + 1))
elif [ "$DESC_LEN" -gt 1024 ]; then
  echo "❌ Exceeds 1024 char limit ($DESC_LEN chars)"
  ISSUES=$((ISSUES + 1))
elif [ "$DESC_LEN" -gt 500 ]; then
  echo "⚠️  Long ($DESC_LEN chars) — consider trimming to ≤500"
  ISSUES=$((ISSUES + 1))
else
  echo "✅ Good length ($DESC_LEN chars)"
fi

# Check: has trigger terms
TRIGGER_COUNT=$(echo "$DESC" | grep -oiE "(use when|trigger|skill|find|create|search|analyze|process|generate|extract|deploy|test|review|build|optimize)" | wc -l)
if [ "$TRIGGER_COUNT" -ge 3 ]; then
  echo "✅ Contains $TRIGGER_COUNT trigger terms"
else
  echo "⚠️  Only $TRIGGER_COUNT trigger terms — aim for 3+"
  ISSUES=$((ISSUES + 1))
fi

echo ""
echo "════════════════════════════════════════════════════════"
if [ "$ISSUES" -eq 0 ]; then
  echo "✅ Description quality: EXCELLENT"
else
  echo "⚠️  Description quality: $ISSUES issue(s) found"
fi
