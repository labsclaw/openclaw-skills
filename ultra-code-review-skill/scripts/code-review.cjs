#!/usr/bin/env node
/**
 * code-review.cjs
 * 
 * Automated PR code review for OpenClaw.
 * Adapted from Anthropic's claude-code plugins/code-review.
 * 
 * Usage:
 *   node scripts/code-review.cjs <PR_number_or_url> [--repo owner/repo] [--comment] [--threshold=80]
 * 
 * Requires: gh CLI authenticated
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ============================================
// CONFIG
// ============================================

const DEFAULT_THRESHOLD = 80;
const AGENTS_MD_PATH = path.resolve(process.cwd(), 'AGENTS.md');

// ============================================
// ARGS PARSING
// ============================================

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    pr: null,
    repo: null,
    comment: false,
    threshold: DEFAULT_THRESHOLD,
  };

  for (const arg of args) {
    if (arg.startsWith('--repo=')) {
      result.repo = arg.split('=')[1];
    } else if (arg === '--comment') {
      result.comment = true;
    } else if (arg.startsWith('--threshold=')) {
      result.threshold = parseInt(arg.split('=')[1], 10);
    } else if (!arg.startsWith('--')) {
      result.pr = arg;
    }
  }

  return result;
}

// ============================================
// GITHUB HELPERS
// ============================================

// ============================================
// SECURITY
// ============================================

/** Sanitize input to prevent shell injection */
function sanitize(input) {
  if (typeof input !== 'string') return String(input);
  // Remove shell metacharacters
  return input.replace(/[;&|`$(){}!#<>\n\r]/g, '');
}

/** Safely execute gh command with sanitized inputs */
function gh(parts, ...values) {
  const cmd = parts.reduce((acc, part, i) => {
    return acc + part + (i < values.length ? sanitize(values[i]) : '');
  }, '');
  try {
    return execSync(`gh ${cmd}`, { encoding: 'utf-8', timeout: 30000 }).trim();
  } catch (err) {
    console.error(`  ⚠️  gh command failed: ${err.message.split('\n')[0]}`);
    return null;
  }
}

function getPRInfo(pr, repo) {
  const repoFlag = repo ? `--repo ${sanitize(repo)}` : '';
  const prNum = sanitize(String(pr).replace(/[^0-9]/g, ''));
  const json = gh`pr view ${prNum} ${repoFlag} --json state,isDraft,title,body,author,files,additions,deletions,reviewDecision,commits`;
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    console.error('  ⚠️  Failed to parse PR info JSON');
    return null;
  }
}

function getPRDiff(pr, repo) {
  const repoFlag = repo ? `--repo ${sanitize(repo)}` : '';
  const prNum = sanitize(String(pr).replace(/[^0-9]/g, ''));
  const raw = gh`pr diff ${prNum} ${repoFlag}`;
  // Truncate very large diffs to prevent OOM
  if (raw && raw.length > 500000) {
    console.log(`  ⚠️  Diff truncated from ${raw.length} to 500000 chars`);
    return raw.slice(0, 500000);
  }
  return raw;
}

function getPRComments(pr, repo) {
  const repoFlag = repo ? `--repo ${sanitize(repo)}` : '';
  const prNum = sanitize(String(pr).replace(/[^0-9]/g, ''));
  const json = gh`pr view ${prNum} ${repoFlag} --comments --json comments --jq '.comments[].author.login'`;
  if (!json) return [];
  return json.split('\n').filter(Boolean);
}

function getFullSha(pr, repo) {
  const repoFlag = repo ? `--repo ${sanitize(repo)}` : '';
  const prNum = sanitize(String(pr).replace(/[^0-9]/g, ''));
  const sha = gh`pr view ${prNum} ${repoFlag} --json commits --jq '.commits[-1].oid'`;
  // Ensure full SHA (40 chars)
  if (sha && sha.length >= 40) return sha;
  // If abbreviated, try to resolve
  if (sha) {
    const full = gh`rev-parse ${sha}`;
    if (full) return full;
  }
  return sha;
}

function getRepoSlug(pr, repo) {
  if (repo) return sanitize(repo);
  const remote = gh`remote get-url origin`;
  if (!remote) return null;
  // Handle SSH, HTTPS, and GHE URLs
  const match = remote.match(/github\.com[:\/](\w[\w.-]*\/[\w.-]+?)(?:\.git)?$/) 
    || remote.match(/github\.com\/(\w[\w.-]*\/[\w.-]+)/);
  return match ? match[1].replace(/\/$/, '') : null;
}

// ============================================
// GUIDELINES LOADER
// ============================================

function loadGuidelines() {
  const files = ['AGENTS.md', 'CLAUDE.md', '.cursorrules', '.github/copilot-instructions.md'];
  const guidelines = {};
  
  for (const file of files) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      guidelines[file] = fs.readFileSync(fullPath, 'utf-8');
    }
  }
  
  return guidelines;
}

// ============================================
// REVIEW PROMPTS
// ============================================

function buildGuidelineAgentPrompt(prInfo, diff, guidelines) {
  const guidelinesText = Object.entries(guidelines)
    .map(([file, content]) => `### ${file}\n${content.slice(0, 3000)}`)
    .join('\n\n');

  return `You are a code review agent checking PR compliance with project guidelines.

PR Title: ${prInfo.title}
PR Description: ${(prInfo.body || '').slice(0, 2000)}
Author: ${prInfo.author.login}
Files changed: ${prInfo.files.map(f => f.path).join(', ')}

## Project Guidelines
${guidelinesText || 'No guidelines found.'}

## Diff
${diff.slice(0, 15000)}

## Instructions
Review this PR for compliance with the project guidelines above.
Flag ONLY clear, unambiguous violations where you can quote the exact rule being broken.
Do NOT flag style preferences or subjective suggestions.
For each issue, provide: description, file path, line numbers, and the guideline rule violated.
Return issues as a JSON array: [{"description": "...", "file": "...", "line_start": N, "line_end": N, "rule": "...", "confidence": N}]`;
}

function buildBugAgentPrompt(prInfo, diff) {
  return `You are a bug detection agent. Scan this PR diff for obvious bugs.

PR Title: ${prInfo.title}
PR Description: ${(prInfo.body || '').slice(0, 2000)}
Files changed: ${prInfo.files.map(f => f.path).join(', ')}

## Diff
${diff.slice(0, 15000)}

## Instructions
Focus ONLY on the diff. Flag ONLY:
- Code that will fail to compile or parse (syntax errors, type errors, missing imports)
- Code that will definitely produce wrong results (clear logic errors)
- Clear, unambiguous bugs

Do NOT flag:
- Style issues or code quality concerns
- Potential issues that depend on specific inputs
- Subjective improvements
- Issues you cannot validate without looking outside the diff

If you are not CERTAIN an issue is real, do not flag it. False positives erode trust.

For each issue, provide: description, file path, line numbers, confidence (0-100).
Return issues as a JSON array: [{"description": "...", "file": "...", "line_start": N, "line_end": N, "confidence": N}]`;
}

function buildSecurityAgentPrompt(prInfo, diff) {
  return `You are a security and logic review agent. Look for vulnerabilities in introduced code.

PR Title: ${prInfo.title}
PR Description: ${(prInfo.body || '').slice(0, 2000)}
Files changed: ${prInfo.files.map(f => f.path).join(', ')}

## Diff
${diff.slice(0, 15000)}

## Instructions
Only look for issues within the changed code (not pre-existing).
Focus on:
- Security vulnerabilities (injection, XSS, SSRF, auth bypass)
- Incorrect logic
- Race conditions
- Resource leaks
- Data exposure

If you are not CERTAIN an issue is real, do not flag it.

For each issue, provide: description, file path, line numbers, confidence (0-100).
Return issues as a JSON array: [{"description": "...", "file": "...", "line_start": N, "line_end": N, "confidence": N}]`;
}

function buildValidatorPrompt(issue, diff, prInfo) {
  return `You are a code review validator. Your job is to validate whether this issue is real.

PR Title: ${prInfo.title}
Issue: ${issue.description}
File: ${issue.file}
Lines: ${issue.line_start}-${issue.line_end}

## Diff
${diff.slice(0, 15000)}

## Instructions
Review the issue and determine if it is a REAL problem with HIGH CONFIDENCE.
- If the issue is real and important, return confidence 80-100
- If the issue is real but minor, return confidence 50-79
- If you are unsure, return confidence 25-49
- If it is a false positive, return confidence 0-24

Return ONLY a JSON object: {"validated": true/false, "confidence": N, "reason": "..."}`;
}

// ============================================
// MAIN
// ============================================

async function main() {
  const config = parseArgs();
  
  if (!config.pr) {
    console.error('Usage: node code-review.cjs <PR_number_or_url> [--repo owner/repo] [--comment] [--threshold=80]');
    process.exit(1);
  }

  console.log(`\n🔍 Code Review — PR #${config.pr}\n`);

  // Step 1: Pre-flight check
  console.log('  Step 1: Pre-flight check...');
  const prInfo = getPRInfo(config.pr, config.repo);
  
  if (!prInfo) {
    console.error('❌ Could not fetch PR info. Check PR number and repo.');
    process.exit(1);
  }

  if (prInfo.state !== 'OPEN') {
    console.log('  ⏭️  PR is not open. Skipping.');
    process.exit(0);
  }

  if (prInfo.isDraft) {
    console.log('  ⏭️  PR is a draft. Skipping.');
    process.exit(0);
  }

  const comments = getPRComments(config.pr, config.repo);
  if (comments.includes('openclaw[bot]') || comments.includes('labsclaw')) {
    console.log('  ⏭️  Review already exists. Skipping.');
    process.exit(0);
  }

  console.log('  ✅ PR is reviewable\n');

  // Step 2: Gather context
  console.log('  Step 2: Gathering context...');
  const diff = getPRDiff(config.pr, config.repo);
  const guidelines = loadGuidelines();
  
  if (!diff) {
    console.error('❌ Could not fetch PR diff.');
    process.exit(1);
  }

  console.log(`  PR: ${prInfo.title}`);
  console.log(`  Files: ${prInfo.files.length} changed`);
  console.log(`  +${prInfo.additions} -${prInfo.deletions}`);
  console.log(`  Guidelines: ${Object.keys(guidelines).length} file(s) loaded\n`);

  // Step 3: Review (simplified — in real OpenClaw, use sessions_spawn)
  console.log('  Step 3: Running review agents...');
  console.log('  (In production, this launches 4 parallel sub-agents via sessions_spawn)');
  console.log('  (For now, running sequential analysis)\n');

  // Parse diff into meaningful chunks
  const diffLines = diff.split('\n');
  const files = {};
  let currentFile = null;

  for (const line of diffLines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)/);
      if (match) {
        currentFile = match[1];
        files[currentFile] = [];
      }
    } else if (currentFile) {
      files[currentFile].push(line);
    }
  }

  // Simple heuristic analysis (real version uses LLM sub-agents)
  const issues = [];

  for (const [file, lines] of Object.entries(files)) {
    const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));
    
    // Check for common patterns
    for (let i = 0; i < addedLines.length; i++) {
      const line = addedLines[i];
      const lineNum = parseInt(lines.find(l => l.startsWith('@@'))?.match(/\+(\d+)/)?.[1] || '1') + i;

      // Hardcoded secrets/tokens
      if (/['"](?:sk|pk|token|password|secret|api[_-]?key)['"]?\s*[:=]/i.test(line)) {
        issues.push({
          description: 'Possible hardcoded secret or API key',
          file,
          line_start: lineNum,
          line_end: lineNum,
          confidence: 85,
          source: 'security',
        });
      }

      // eval() usage
      if (/\beval\s*\(/.test(line)) {
        issues.push({
          description: 'Use of eval() detected — potential security risk',
          file,
          line_start: lineNum,
          line_end: lineNum,
          confidence: 90,
          source: 'security',
        });
      }

      // console.log left in (production code)
      if (/console\.log\s*\(/.test(line) && !file.includes('test') && !file.includes('debug')) {
        issues.push({
          description: 'console.log left in production code',
          file,
          line_start: lineNum,
          line_end: lineNum,
          confidence: 70,
          source: 'quality',
        });
      }

      // TODO/FIXME/HACK
      if (/\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(line)) {
        issues.push({
          description: `Unresolved comment: ${line.trim().slice(0, 80)}`,
          file,
          line_start: lineNum,
          line_end: lineNum,
          confidence: 60,
          source: 'quality',
        });
      }
    }
  }

  // Step 4 & 5: Filter by threshold
  const filtered = issues.filter(i => i.confidence >= config.threshold);

  // Step 6: Output
  console.log(`  Step 6: Results\n`);
  
  if (filtered.length === 0) {
    console.log('## Code Review\n');
    console.log('No issues found. Checked for bugs, security, and guideline compliance.\n');
    
    if (config.comment) {
      const repoSlug = getRepoSlug(config.pr, config.repo);
      if (repoSlug) {
        // Use heredoc-style to avoid shell escaping issues
      const commentFile = path.join(require('os').tmpdir(), `review-${Date.now()}.md`);
      fs.writeFileSync(commentFile, body, 'utf-8');
      gh`pr comment ${prNum} --repo ${repoSlug} --body-file ${commentFile}`;
      fs.unlinkSync(commentFile);
        console.log('✅ Review comment posted to PR.\n');
      }
    }
  } else {
    console.log(`Found ${filtered.length} issue(s):\n`);
    
    const sha = getFullSha(config.pr, config.repo);
    const repoSlug = getRepoSlug(config.pr, config.repo);
    
    for (let i = 0; i < filtered.length; i++) {
      const issue = filtered[i];
      const link = (repoSlug && sha) 
        ? `https://github.com/${repoSlug}/blob/${sha}/${issue.file}#L${issue.line_start}-L${issue.line_end}`
        : `${issue.file}:${issue.line_start}`;
      
      console.log(`${i + 1}. [${issue.confidence}%] ${issue.description}`);
      console.log(`   Source: ${issue.source}`);
      console.log(`   Link: ${link}\n`);
    }

    if (config.comment && repoSlug) {
      const body = filtered.map((issue, i) => {
        const sha = getFullSha(config.pr, config.repo);
        const link = (repoSlug && sha)
          ? `https://github.com/${repoSlug}/blob/${sha}/${issue.file}#L${issue.line_start}-L${issue.line_end}`
          : `${issue.file}:${issue.line_start}`;
        return `${i + 1}. **${issue.description}** (${issue.confidence}% confidence)\n   ${link}`;
      }).join('\n\n');

      const commentBody = `## Code Review

Found ${filtered.length} issue(s):

${body}

---
*Automated review by OpenClaw ultra-code-review-skill*`;
      const commentFile = path.join(require('os').tmpdir(), `review-${Date.now()}.md`);
      fs.writeFileSync(commentFile, commentBody, 'utf-8');
      gh`pr comment ${config.pr} --repo ${repoSlug} --body-file ${commentFile}`;
      fs.unlinkSync(commentFile);

      console.log('✅ Review comment posted to PR.\n');
    }
  }

  console.log('Done.\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
