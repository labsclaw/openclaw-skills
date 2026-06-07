# Example: Creating a Knowledge-Only Skill

A knowledge-only skill uses pure instructions — no scripts, no tools.
It encodes domain expertise as step-by-step guidance.

## Scenario

User: "Create a skill for writing effective git commit messages"

## Phase 1: Capture Intent

- **What**: Help agents write consistent, descriptive commit messages
- **When**: Whenever committing code changes
- **Output**: A properly formatted commit message
- **Test needed?**: Yes — the output is objectively verifiable (format compliance)

## Phase 2: Interview

- Convention: Conventional Commits (feat, fix, docs, etc.)
- Scope: Include scope in parentheses
- Length: Subject ≤ 72 chars, body optional
- Type: Knowledge/Pattern skill (high freedom)

## Phase 3: Generated SKILL.md

```markdown
---
name: commit-messages
description: >-
  Use when writing git commit messages, staging changes for commit, or when
  the user asks for help with commit message format. Also use when reviewing
  commit history for consistency. Trigger terms: commit, git commit, commit
  message, conventional commits, changelog.
---

# Commit Messages

Write consistent, descriptive commit messages using Conventional Commits.

## When to Use

- Writing any git commit message
- User asks for help with commit format
- Reviewing commit history for consistency

## When NOT to Use

- Merge commits (use default merge message)
- Automated commits from CI/CD

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types**: feat, fix, docs, style, refactor, test, chore, ci
**Subject**: Imperative mood, ≤ 72 chars, no period at end
**Body**: Explain what and why, not how

## Examples

**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication

**Example 2:**
Input: Fixed the bug where users couldn't log out
Output: fix(auth): resolve logout session invalidation

**Example 3:**
Input: Updated README with new API endpoints
Output: docs(api): add new endpoint documentation

## License

Apache-2.0
```

## Phase 4: Validate

```bash
bash scripts/validate-skill.sh ./commit-messages
# ✅ PASSED — Score: 72 (all checks pass, could add references for higher score)
```

## Result

A clean, focused, 50-line skill that encodes a single workflow.
No scripts needed — pure instruction-based.
