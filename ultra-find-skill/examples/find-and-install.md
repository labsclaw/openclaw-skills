# Example: Full Find-to-Install Flow

## Scenario

User: "Is there a skill for reviewing pull requests?"

## Complete Flow

### 1. Evaluate Need
PR review is a recurring, structured task → good candidate for a skill.

### 2. Local Search
```bash
bash scripts/scan-local-skills.sh "review"
```
Found locally:
```
═══ ~/.openclaw/skills [openclaw] ═══
  📦 ecosystem-steward
     Meta-agente autônomo de auto-melhoria para o ecossistema OpenClaw...
```
The ecosystem-steward does reviews but is too broad. Need a dedicated PR skill.

### 3. Remote Search
```bash
npx skills find "pull request review code review"
```

Top result: `code-review` from anthropics/skills (Score: 88/100)

### 4. Security Review

```bash
# Clone and inspect before installing
git clone --depth 1 https://github.com/anthropics/skills /tmp/check-skill
bash ~/.openclaw/skills/ultra-find-skill/scripts/validate-skill-structure.sh /tmp/check-skill/skills/code-review
```

Output:
```
✅ SKILL.md exists
✅ Frontmatter opening found
✅ name field: code-review
✅ name matches folder name
✅ description field present
✅ Line count: 234 (within limit)
✅ No model-specific references found
Result: 0 error(s), 0 warning(s)
✅ PASSED
```

### 5. Install

```bash
# Copy to OpenClaw skills directory
cp -r /tmp/check-skill/skills/code-review ~/.openclaw/skills/code-review/

# Verify installation
ls ~/.openclaw/skills/code-review/SKILL.md
```

### 6. Confirm

```
✅ Installed: code-review
   Path: ~/.openclaw/skills/code-review/
   Description: Performs thorough code review with security, performance,
                and best practices analysis.
   
   Try it: "Review the PR at #123"
```
