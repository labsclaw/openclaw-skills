#!/usr/bin/env bash
# scan-local-skills.sh — Scan all known skill directories for installed skills
# Usage: bash scan-local-skills.sh [search-query]

set -euo pipefail

QUERY="${1:-}"
FOUND=0

# All known skill directory paths
SKILL_PATHS=(
  "$HOME/.openclaw/skills"
  "$HOME/.agents/skills"
  "$HOME/.opencode/skills"
  "$HOME/.config/opencode/skill"
  "$HOME/.commandcode/skills"
  "$HOME/.claude/skills"
  "$HOME/.codex/skills"
  "$HOME/.gemini/skills"
)

# Add workspace paths if in a project directory
if [ -d "./skills" ]; then SKILL_PATHS+=("./skills"); fi
if [ -d "./.agents/skills" ]; then SKILL_PATHS+=("./.agents/skills"); fi
if [ -d "./.openclaw/skills" ]; then SKILL_PATHS+=("./.openclaw/skills"); fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Ultra Find Skill — Local Scanner               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

if [ -n "$QUERY" ]; then
  echo "🔍 Searching for: $QUERY"
  echo ""
fi

for base in "${SKILL_PATHS[@]}"; do
  if [ -d "$base" ]; then
    PLATFORM=$(echo "$base" | grep -oE '\.(openclaw|agents|opencode|commandcode|claude|codex|gemini)' | tr -d '.' || echo "workspace")
    HEADER_PRINTED=false

    for skill_dir in "$base"/*/; do
      [ -d "$skill_dir" ] || continue
      SKILL_FILE="$skill_dir/SKILL.md"
      [ -f "$SKILL_FILE" ] || continue

      NAME=$(basename "$skill_dir")
      DESC=$(grep -A1 "^description:" "$SKILL_FILE" 2>/dev/null | tail -1 | sed 's/^[[:space:]]*//' | head -c 200)

      # If query is set, filter by name or description
      if [ -n "$QUERY" ]; then
        MATCH=$(echo "$NAME $DESC" | grep -i "$QUERY" 2>/dev/null || true)
        [ -z "$MATCH" ] && continue
      fi

      if [ "$HEADER_PRINTED" = false ]; then
        echo "═══ $base [$PLATFORM] ═══"
        HEADER_PRINTED=true
      fi

      echo "  📦 $NAME"
      echo "     $DESC"
      echo ""
      FOUND=$((FOUND + 1))
    done
  fi
done

echo "────────────────────────────────────────────────────────"
echo "Total skills found: $FOUND"

if [ "$FOUND" -eq 0 ] && [ -n "$QUERY" ]; then
  echo ""
  echo "💡 No local skills matched '$QUERY'."
  echo "   Try: npx skills find $QUERY (remote search)"
fi
