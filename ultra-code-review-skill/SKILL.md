---
name: ultra-code-review-skill
description: "Automated PR code review with parallel agents, confidence scoring, and false-positive filtering. Adapted from Anthropic's claude-code plugins/code-review for OpenClaw."
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "requires": { "bins": ["gh"] },
      },
  }
---

# Ultra Code Review Skill

Automated pull request review using multiple parallel sub-agents with confidence-based scoring.

Adapted from [Anthropic's claude-code plugins/code-review](https://github.com/anthropics/claude-code/tree/main/plugins/code-review) for OpenClaw.

## How It Works

1. **Pre-flight check** — skip closed, draft, trivial, or already-reviewed PRs
2. **Gather context** — fetch AGENTS.md guidelines + PR diff + summary
3. **Launch 4 parallel sub-agents** — each reviews independently:
   - Agents 1 & 2: AGENTS.md / project guideline compliance
   - Agent 3: Obvious bug detection (diff-only, no extra context)
   - Agent 4: Security/logic issues in introduced code
4. **Confidence scoring** — each issue scored 0-100
5. **Filter** — only issues ≥80 confidence pass
6. **Output** — terminal summary, or PR comment with `--comment`

## Usage

```
/code-review <PR_URL_or_number> [--comment] [--repo owner/repo]
```

### Examples

```bash
# Review PR #42, output to terminal
/code-review 42

# Review PR and post as GitHub comment
/code-review https://github.com/labsclaw/openclaw-skills/pull/42 --comment

# Review with explicit repo
/code-review 42 --repo labsclaw/openclaw-skills --comment
```

## Execution Steps

### Step 1: Pre-flight Check

Spawn a lightweight sub-agent to verify the PR is reviewable:

```
gh pr view <PR> --repo <REPO> --json state,isDraft,reviewDecision
gh pr view <PR> --repo <REPO> --comments --jq '.[].author.login'
```

**Skip if:**
- PR is closed or merged
- PR is a draft
- Review already exists from this agent
- PR is trivial (e.g., automated Dependabot, single-line change)

### Step 2: Gather Context

```bash
# PR summary
gh pr view <PR> --repo <REPO> --json title,body,author,files,additions,deletions

# Full diff
gh pr diff <PR> --repo <REPO>

# AGENTS.md or project guidelines
cat AGENTS.md 2>/dev/null || echo "No AGENTS.md found"
```

### Step 3: Launch Parallel Review Agents

Use `sessions_spawn` to launch 4 independent sub-agents:

**Agent 1 — Guideline Compliance (Sonnet-class model):**
```
Task: "Review this PR diff for compliance with project guidelines.
PR Title: {title}
PR Description: {body}
Guidelines: {agents_md_content}
Diff: {diff}
Flag ONLY clear, unambiguous violations where you can quote the exact rule being broken.
Do NOT flag style preferences or subjective suggestions."
```

**Agent 2 — Guideline Compliance (Sonnet-class model, independent):**
Same task as Agent 1 but running independently for redundancy.

**Agent 3 — Bug Detection (Opus-class model):**
```
Task: "Scan this PR diff for obvious bugs. Focus ONLY on the diff itself.
PR Title: {title}
PR Description: {body}
Diff: {diff}
Flag ONLY:
- Code that will fail to compile or parse
- Code that will definitely produce wrong results
- Clear logic errors
Do NOT flag: style issues, potential issues, subjective improvements.
If you are not CERTAIN an issue is real, do not flag it."
```

**Agent 4 — Security/Logic Issues (Opus-class model):**
```
Task: "Look for security and logic problems in the introduced code.
PR Title: {title}
PR Description: {body}
Diff: {diff}
Only look for issues within the changed code (not pre-existing).
Focus on: security vulnerabilities, incorrect logic, race conditions, resource leaks.
If you are not CERTAIN an issue is real, do not flag it."
```

### Step 4: Confidence Scoring

For each issue returned by Agents 3 & 4, spawn validation sub-agents:

- **Bug issues → Opus-class validator** — verifies the bug is real by examining the code
- **Guideline issues → Sonnet-class validator** — verifies the rule exists and applies to this file

Each validator returns a confidence score 0-100:

| Score | Meaning |
|-------|---------|
| 0 | False positive |
| 25 | Might be real |
| 50 | Real but minor |
| 75 | Real and important |
| 100 | Definitely real |

### Step 5: Filter

Remove all issues with confidence < 80.

**False positive patterns to filter:**
- Pre-existing issues (not introduced in this PR)
- Code that looks wrong but is actually correct
- Pedantic nitpicks
- Issues a linter would catch
- General quality concerns (unless in project guidelines)
- Issues silenced by lint-ignore comments

### Step 6: Output

**Without `--comment`:**
```
## Code Review

Found {N} issues:

1. {Issue description}
   {GitHub link with full SHA and line range}

2. {Issue description}
   {GitHub link with full SHA and line range}
```

**With `--comment` and no issues:**
```bash
gh pr comment <PR> --repo <REPO> --body "## Code Review

No issues found. Checked for bugs and guideline compliance."
```

**With `--comment` and issues:**
Post inline comments using `gh api`:
```bash
gh api repos/<REPO>/pulls/<PR>/comments --method POST \
  -f body="..." \
  -f path="..." \
  -F position=... \
  -f commit_id="<full-sha>"
```

## Configuration

### Confidence Threshold

Default: 80. To adjust, modify this skill or pass `--threshold=N`.

### Model Selection

| Agent | Recommended Model | Why |
|-------|------------------|-----|
| Guideline compliance (1 & 2) | Sonnet-class (fast, cheap) | Pattern matching, not deep reasoning |
| Bug detection (3) | Opus-class (deep reasoning) | Needs to understand code semantics |
| Security/logic (4) | Opus-class (deep reasoning) | Needs to understand attack vectors |
| Validators | Match the agent type | Same model class as the agent they validate |

### Parallel Execution

All 4 review agents run in parallel via `sessions_spawn(mode="run")`. Use `sessions_yield` to wait for completion.

```
Spawn Agent 1 →
Spawn Agent 2 →  sessions_yield → Collect results
Spawn Agent 3 →
Spawn Agent 4 →
```

## Link Format

When posting GitHub comments, links must use full SHA:

```
https://github.com/owner/repo/blob/<full-sha>/path/file.ts#L10-L20
```

- Full SHA (not abbreviated)
- `#L` notation with line range
- At least 1 line of context before/after

## Limitations

- Requires `gh` CLI authenticated
- Reviews the diff only, not the full codebase
- Cannot run linters or tests
- Large PRs may be slow (4 agents running in parallel)
- Does not replace human review — serves as a first pass

## Adapted From

- [Anthropic claude-code plugins/code-review](https://github.com/anthropics/claude-code/tree/main/plugins/code-review) by Boris Cherny
- Confidence scoring and false-positive filtering patterns
- Parallel multi-agent review architecture
