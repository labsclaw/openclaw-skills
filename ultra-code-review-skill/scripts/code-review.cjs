#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */

const { spawnSync } = require("node:child_process");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = { pr: null, repo: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--repo") {
      const next = argv[index + 1];
      if (!next || next.startsWith("-")) throw new Error("--repo requires owner/repo");
      result.repo = next;
      index += 1;
    }
    else if (value.startsWith("--repo=")) result.repo = value.slice(7);
    else if (!value.startsWith("-") && result.pr === null) result.pr = value;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!result.pr) throw new Error("Usage: node scripts/code-review.cjs <pr-number-or-url> [--repo owner/repo]");
  const rawPr = String(result.pr);
  const url = rawPr.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)\/?$/i);
  if (url) {
    const urlRepo = `${url[1]}/${url[2]}`;
    if (result.repo && result.repo.toLowerCase() !== urlRepo.toLowerCase()) {
      throw new Error(`PR URL repository ${urlRepo} conflicts with --repo ${result.repo}`);
    }
    result.repo = urlRepo;
    result.pr = url[3];
  } else if (/^\d+$/.test(rawPr)) result.pr = rawPr;
  else throw new Error("PR must be a number or a full https://github.com/owner/repo/pull/number URL");
  if (result.repo && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(result.repo)) throw new Error("Invalid repository slug");
  return result;
}

function gh(args) {
  const run = spawnSync("gh", args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
    timeout: 45_000,
  });
  if (run.error) fail(`gh failed: ${run.error.message}`);
  if (run.status !== 0) fail((run.stderr || "gh command failed").trim());
  return run.stdout;
}

function scan(diff) {
  const rules = [
    { id: "private-key", severity: "critical", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { id: "github-token", severity: "critical", pattern: /\bghp_[A-Za-z0-9]{30,}\b/ },
    { id: "aws-access-key", severity: "critical", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
    { id: "dynamic-eval", severity: "high", pattern: /\beval\s*\(/ },
  ];
  const findings = [];
  let file = null;
  let newLine = null;
  for (const line of diff.split(/\r?\n/)) {
    const fileHeader = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (fileHeader) {
      file = fileHeader[2];
      newLine = null;
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (newLine === null || line.startsWith("\\ No newline")) continue;
    if (line.startsWith("-")) continue;
    if (line.startsWith("+")) {
      if (!line.startsWith("+++")) {
        const added = line.slice(1);
        for (const rule of rules) {
          if (rule.pattern.test(added)) {
            findings.push({ rule: rule.id, severity: rule.severity, file, lineStart: newLine, lineEnd: newLine });
          }
        }
      }
      newLine += 1;
      continue;
    }
    newLine += 1;
  }
  return findings;
}

function main(argv) {
  const config = parseArgs(argv);
  const repoArgs = config.repo ? ["--repo", config.repo] : [];
  const fields = "number,title,state,isDraft,headRefOid,baseRefName,headRefName,mergeable,reviewDecision,statusCheckRollup,files,additions,deletions,url";
  const pr = JSON.parse(gh(["pr", "view", config.pr, ...repoArgs, "--json", fields]));
  const diff = gh(["pr", "diff", config.pr, ...repoArgs]);
  const bundle = {
    collectedAt: new Date().toISOString(),
    pr,
    diff: {
      bytes: Buffer.byteLength(diff, "utf8"),
      files: [...diff.matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)].map((match) => match[2]),
    },
    deterministicFindings: scan(diff),
  };
  process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { fail(error.message); }
}

module.exports = { parseArgs, scan };
