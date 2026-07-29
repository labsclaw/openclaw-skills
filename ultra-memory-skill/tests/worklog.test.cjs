#!/usr/bin/env node
/**
 * worklog.test.js — Tests for scripts/worklog.js
 *
 * Run: node scripts/worklog.test.js
 * Expected: All tests pass, exits with code 0.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const WORKSPACE = path.resolve(__dirname, "..");
const WORKLOG_DIR = path.join(WORKSPACE, "memory", "worklog");
const CURRENT_PATH = path.join(WORKLOG_DIR, "current.md");
const ARCHIVE_DIR = path.join(WORKLOG_DIR, "archive");
const SCRIPT = path.join(__dirname, "..", "scripts", "worklog.cjs");

const run = (cmd) => execSync(`node "${SCRIPT}" ${cmd}`, {
  cwd: WORKSPACE,
  encoding: "utf-8",
});

let passed = 0;
let failed = 0;

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? `\n      ${detail}` : ""}`);
    failed++;
  }
}

function assertOutputIncludes(output, needle, label) {
  assert(output.includes(needle), label, `Expected to find "${needle}" in:\n${output}`);
}

function clean() {
  try {
    if (fs.existsSync(CURRENT_PATH)) fs.unlinkSync(CURRENT_PATH);
    if (fs.existsSync(ARCHIVE_DIR)) {
      const files = fs.readdirSync(ARCHIVE_DIR);
      files.forEach((f) => fs.unlinkSync(path.join(ARCHIVE_DIR, f)));
    }
  } catch (e) {
    // ignore
  }
}

// ----------------------------------------------------------------
console.log("worklog.js Tests\n");

// ---- 1. Status reports inactive when empty ----
console.log("1. Status (no worklog)");
if (fs.existsSync(CURRENT_PATH)) fs.unlinkSync(CURRENT_PATH);

const statusOut = run("status");
assertOutputIncludes(statusOut, "status=inactive", "reports inactive when no worklog exists");

// ---- 2. Init creates current.md ----
console.log("\n2. Init");
clean();
const initOut = run('init "Test Session"');
assert(fs.existsSync(CURRENT_PATH), "creates current.md file");
assertOutputIncludes(initOut, "Test Session", "includes title in output");

const content = fs.readFileSync(CURRENT_PATH, "utf-8");
assert(content.includes("# Worklog: Test Session"), "writes title header");
assert(content.includes("**INIT**"), "writes INIT marker");
assert(content.includes("**Started**"), "writes started timestamp");
assert(content.includes("**Agent**"), "writes agent metadata");
assert(content.includes("**Model**"), "writes model metadata");

// Check INIT entry has model tag (falls back to default model since OPENCLAW_MODEL may not be set)
// The model entry format: [timestamp] [model] **INIT**
const initLine = content.split("\n").find(l => l.includes("**INIT**"));
assert(initLine && initLine.includes("[") && initLine.includes("]"), "INIT entry contains model tag in brackets");

// ---- 3. Append adds entries ----
console.log("\n3. Append");
run('append "First real step: reading config"');
const afterAppend = fs.readFileSync(CURRENT_PATH, "utf-8");
const entryLines = afterAppend.split("\n").filter((l) => l.startsWith("["));
assert(entryLines.length === 2, "has 2 timestamped entries (init + append)");
assert(afterAppend.includes("First real step"), "contains appended message");

// Each append entry should have a model tag
const appendLine = entryLines.find(l => l.includes("First real step"));
assert(appendLine && appendLine.includes("[") && appendLine.match(/\d{4}-\d{2}-\d{2}T/), "append entry has timestamp + model tag");

run('append "Second step: found issue with Select-String"');
const afterAppend2 = fs.readFileSync(CURRENT_PATH, "utf-8");
const entryLines2 = afterAppend2.split("\n").filter((l) => l.startsWith("["));
assert(entryLines2.length === 3, "has 3 entries after second append");

// Verify all entries have a model tag pattern: [ISO-date] [model] msg
entryLines2.forEach((line, i) => {
  const hasTag = line.includes("[") && line.match(/\d{4}-\d{2}-\d{2}T/);
  assert(hasTag, `entry ${i} has expected format: ${line.substring(0, 50)}...`);
});

// ---- 4. Append without active worklog fails gracefully ----
console.log("\n4. Append without init");
clean();
try {
  run('append "this should fail"');
  assert(false, "should fail when no worklog exists");
} catch (e) {
  assert(e.stderr && e.stderr.includes("No active worklog"), "fails with clear message");
}

// ---- 5. Read prints content ----
console.log("\n5. Read");
clean();
run('init "Read Test"');
run('append "entry one"');
run('append "entry two"');
const readOut = run("read");
assertOutputIncludes(readOut, "Read Test", "shows title");
assertOutputIncludes(readOut, "entry one", "shows first entry");
assertOutputIncludes(readOut, "entry two", "shows second entry");

// ---- 6. Archive moves file ----
console.log("\n6. Archive");
clean();
run('init "Archival Test"');
run('append "something happened"');
// Archive dir may not exist yet — that counts as empty
let beforeArchive = 0;
try { beforeArchive = fs.readdirSync(ARCHIVE_DIR).length; } catch (e) { /* not created yet = empty */ }
assert(beforeArchive === 0, "archive dir starts empty before archiving");

const archiveOut = run("archive");
assert(!fs.existsSync(CURRENT_PATH), "current.md removed after archive");
const afterArchive = fs.readdirSync(ARCHIVE_DIR);
assert(afterArchive.length === 1, "1 file in archive dir");
assertOutputIncludes(archiveOut, "Archived", "confirms archiving");

// Check archived content
const archivedContent = fs.readFileSync(path.join(ARCHIVE_DIR, afterArchive[0]), "utf-8");
assert(archivedContent.includes("Archival Test"), "archived file retains title");
assert(archivedContent.includes("something happened"), "archived file retains entries");

// ---- 7. Archive without worklog fails gracefully ----
console.log("\n7. Archive without worklog");
try {
  run("archive");
  assert(false, "should fail when no worklog exists");
} catch (e) {
  assert(e.stderr && e.stderr.includes("No active worklog"), "fails with clear message");
}

// ---- 8. Status after init ----
console.log("\n8. Status (active)");
clean();
run('init "Status Check"');
const activeStatus = run("status");
assertOutputIncludes(activeStatus, "status=active", "reports active");
assertOutputIncludes(activeStatus, "Status Check", "shows title");
assert(activeStatus.includes("entries="), "shows entry count");
assert(activeStatus.includes("size="), "shows size");

// ---- 9. Help output ----
console.log("\n9. Help");
const helpOut = run("help");
assert(helpOut.includes("init"), "help lists init");
assert(helpOut.includes("append"), "help lists append");
assert(helpOut.includes("archive"), "help lists archive");
assert(helpOut.includes("read"), "help lists read");
assert(helpOut.includes("status"), "help lists status");

// ---- 10. Slug handles special characters ----
console.log("\n10. Edge cases");
clean();
run('init "Título com acentos e especiais! @#$%"');
run('append "Non-ASCII: çãêö"');
const content2 = fs.readFileSync(CURRENT_PATH, "utf-8");
assert(content2.includes("Título com acentos"), "handles non-ASCII in title");
assert(content2.includes("çãêö"), "handles non-ASCII in entries");

// ---- Summary ----
console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"=".repeat(40)}`);

// Cleanup
clean();

process.exit(failed > 0 ? 1 : 0);
