# Skill Directories — Cross-Platform Path Reference

> Load this reference when scanning for installed skills across platforms.

---

## OpenClaw Precedence Hierarchy

OpenClaw resolves skills in this order (highest priority first):

| Level | Path | Scope |
|-------|------|-------|
| 1 | `<workspace>/skills/` | Workspace-specific skills |
| 2 | `<workspace>/.agents/skills/` | Project agent skills |
| 3 | `~/.agents/skills/` | Personal agent skills |
| 4 | `~/.openclaw/skills/` | Managed/local skills |
| 5 | *(bundled with installation)* | Built-in skills |
| 6 | Paths in `skills.load.extraDirs` | Config-defined extras |

**Conflict resolution**: If the same skill name exists at multiple levels,
the higher-priority level wins. Level 1 overrides all others.

**Configuration**: Additional paths can be added in `openclaw.json`:
```json
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/shared/skills", "/path/to/team/skills"]
    }
  }
}
```

**Agent-specific visibility**: Skills can be scoped to specific agents via:
```json
{
  "agents": {
    "defaults": { "skills": ["skill-a", "skill-b"] },
    "list": [{ "name": "researcher", "skills": ["deep-research"] }]
  }
}
```

---

## All Platform Paths

### OpenCode
| Scope | Path |
|-------|------|
| Project | `.opencode/skills/<name>/SKILL.md` |
| Global | `~/.config/opencode/skill/<name>/SKILL.md` |
| Claude compat | `.claude/skills/<name>/SKILL.md` |

**Permission system** (in `opencode.json`):
```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

### CommandCode
| Scope | Path |
|-------|------|
| Project | `.commandcode/skills/<name>/SKILL.md` |
| Global | `~/.commandcode/skills/<name>/SKILL.md` |
| Cross-compat | `.agents/skills/<name>/SKILL.md` |

Priority: `.commandcode/skills/` wins on conflicts with `.agents/skills/`.

### Claude Code
| Scope | Path |
|-------|------|
| Project | `.claude/skills/<name>/SKILL.md` |
| Global | `~/.claude/skills/<name>/SKILL.md` |

### Codex CLI (OpenAI)
| Scope | Path |
|-------|------|
| Project | `.codex/skills/<name>/SKILL.md` |
| Global | `~/.codex/skills/<name>/SKILL.md` |

### Gemini CLI
| Scope | Path |
|-------|------|
| Project | `.gemini/skills/<name>/SKILL.md` |
| Global | `~/.gemini/skills/<name>/SKILL.md` |
| Install cmd | `gemini skills install <url-or-path>` |
| Dev mode | `gemini skills link <path>` (symlink) |

### Universal Fallback
| Scope | Path |
|-------|------|
| Project | `.agents/skills/<name>/SKILL.md` |
| Global | `~/.agents/skills/<name>/SKILL.md` |

---

## Detection Commands

### Scan all local skill directories

```bash
# Find all SKILL.md files on the system
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

for base in "${SKILL_PATHS[@]}"; do
  if [ -d "$base" ]; then
    echo "=== $base ==="
    for skill_dir in "$base"/*/; do
      if [ -f "$skill_dir/SKILL.md" ]; then
        name=$(basename "$skill_dir")
        desc=$(grep -A1 "^description:" "$skill_dir/SKILL.md" 2>/dev/null | tail -1 | sed 's/^[[:space:]]*//')
        echo "  [$name] $desc"
      fi
    done
  fi
done
```

### Scan workspace-level skills

```bash
# From the current workspace directory
WORKSPACE_PATHS=(
  "./skills"
  "./.agents/skills"
  "./.openclaw/skills"
  "./.opencode/skills"
  "./.commandcode/skills"
  "./.claude/skills"
  "./.codex/skills"
  "./.gemini/skills"
)

for base in "${WORKSPACE_PATHS[@]}"; do
  if [ -d "$base" ]; then
    echo "=== $base ==="
    ls -1 "$base"
  fi
done
```

---

## Platform Detection

To detect which agent platform is active:

```bash
# Check for platform indicators
[ -f "openclaw.json" ] && echo "OpenClaw detected"
[ -f ".opencode/config.json" ] && echo "OpenCode detected"
[ -f ".commandcode/config.json" ] && echo "CommandCode detected"
[ -f "CLAUDE.md" ] || [ -d ".claude" ] && echo "Claude Code detected"
[ -f "AGENTS.md" ] || [ -d ".codex" ] && echo "Codex CLI detected"
[ -f "GEMINI.md" ] || [ -d ".gemini" ] && echo "Gemini CLI detected"
```
