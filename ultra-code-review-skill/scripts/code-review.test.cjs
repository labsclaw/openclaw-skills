#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */

const assert = require("node:assert/strict");
const { parseArgs, scan } = require("./code-review.cjs");

assert.deepEqual(
  parseArgs(["https://github.com/example/not-this-repo/pull/12"]),
  { pr: "12", repo: "example/not-this-repo" },
);
assert.throws(
  () => parseArgs(["https://github.com/example/repo/pull/12", "--repo", "other/repo"]),
  /conflicts with --repo/,
);
assert.throws(() => parseArgs(["12", "--repo"]), /requires owner\/repo/);

const diff = [
  "diff --git a/example.js b/example.js",
  "index 1111111..2222222 100644",
  "--- a/example.js",
  "+++ b/example.js",
  "@@ -10,3 +10,4 @@",
  "-const removed = eval(userInput);",
  "+const safe = parse(userInput);",
  " const retained = true;",
  "+const introduced = eval(userInput);",
].join("\n");

assert.deepEqual(scan(diff), [
  {
    rule: "dynamic-eval",
    severity: "high",
    file: "example.js",
    lineStart: 12,
    lineEnd: 12,
  },
]);

process.stdout.write("code-review helper tests passed\n");
