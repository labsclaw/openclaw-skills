# Cross-Platform Compatibility — Making Skills Work Everywhere

> Load this reference when creating skills that should work across multiple agent platforms.

---

## The Universal Standard: agentskills.io

The [agentskills.io specification](https://agentskills.io/specification) defines
the open standard that all major agent platforms support. Following this spec
ensures maximum portability.

**Core requirements for universal compatibility:**
- `SKILL.md` file with YAML frontmatter
- `name` field (1-64 chars, lowercase + hyphens)
- `description` field (max 1024 chars)
- Folder name matches `name` field

**If you follow these rules, your skill will work on ALL major platforms.**

---

## Platform-Specific Extensions

Some platforms add extra fields. These are OPTIONAL and ignored by platforms
that don't support them:

| Extension | Platform | Purpose |
|-----------|----------|---------|
| `allowed-tools` | Claude Code, agentskills.io | Pre-approve tools |
| `metadata.openclaw.requires.env` | OpenClaw | Declare env var dependencies |
| `metadata.openclaw.requires.bins` | OpenClaw | Declare binary dependencies |
| `openai.yaml` | Codex CLI | Separate metadata file |
| `risk` | Antigravity | Safety classification |
| `source_repo`, `source_type` | Antigravity | Attribution tracking |

**Recommendation**: Include `allowed-tools` if your skill uses specific tools.
Other extensions are platform-specific and can be added later.

---

## Always-On Context Files (NOT Skills)

Each platform has a file for persistent, always-loaded project context.
These are NOT skills — they're loaded into every conversation:

| Platform | File | Purpose |
|----------|------|---------|
| OpenClaw | `openclaw.json` | Project configuration |
| Codex CLI | `AGENTS.md` | Project context for agents |
| Gemini CLI | `GEMINI.md` | Project context for Gemini |
| Claude Code | `CLAUDE.md` | Project context for Claude |
| OpenCode | `opencode.json` | Project configuration |

**Skills vs Context files:**
- **Skills** = on-demand expertise, loaded when triggered
- **Context files** = always-on rules, loaded in every conversation

Don't put skill content in context files (wastes tokens every conversation).
Don't put project-specific config in skills (they're meant to be reusable).

---

## Installation Paths by Platform

### Universal approach (works everywhere)

```bash
# Install to the cross-compatible .agents path
cp -r my-skill/ ~/.agents/skills/my-skill/
cp -r my-skill/ <project>/.agents/skills/my-skill/
```

### Platform-specific installation

```bash
# OpenClaw
cp -r my-skill/ ~/.openclaw/skills/my-skill/

# OpenCode
cp -r my-skill/ ~/.config/opencode/skill/my-skill/

# Claude Code
cp -r my-skill/ ~/.claude/skills/my-skill/

# Codex CLI
cp -r my-skill/ ~/.codex/skills/my-skill/

# Gemini CLI
gemini skills install <path-or-git-url>

# Via npx (cross-platform)
npx skills add <github-url> --skill my-skill
```

---

## Permission Systems

### OpenCode — Pattern-based permissions

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

- `allow`: Skill loads immediately when triggered
- `deny`: Skill is hidden, access rejected
- `ask`: User prompted for approval

### Claude Code — Sub-agent preloading

Skills can be preloaded into sub-agents' system prompts:

```yaml
name: my-specialized-agent
skills:
  - skill-name-1
  - skill-name-2
```

- Preloaded skills = base knowledge (consumes context)
- Non-preloaded = available via `Skill` tool (on-demand)

---

## Tips for Maximum Portability

1. **Stick to the agentskills.io spec** — name, description, SKILL.md format
2. **Use `.agents/skills/` as fallback** — recognized by most platforms
3. **Avoid platform-specific tool names** — use generic descriptions
4. **Don't hardcode paths** — use relative paths within the skill directory
5. **Test on at least 2 platforms** — verify skill triggers correctly
6. **Keep scripts POSIX-compatible** — use `#!/bin/sh` or `#!/usr/bin/env bash`
7. **Avoid Windows-specific paths** — use forward slashes in documentation
8. **Include installation instructions for all major platforms**
