#!/usr/bin/env node
/**
 * worklog.js — Session Worklog Manager
 *
 * Usage:
 *   node scripts/worklog.js init <title>     Start a new worklog
 *   node scripts/worklog.js append <msg>      Append entry with timestamp
 *   node scripts/worklog.js archive           Move to archive/
 *   node scripts/worklog.js read              Print current worklog
 *   node scripts/worklog.js status            Check if active, who wrote, when
 *
 * Worklog lives at: memory/worklog/current.md
 * Archives go to:   memory/worklog/archive/YYYY-MM-DD-HHmm-<slug>.md
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const WORKSPACE = process.env.OPENCLAW_WORKSPACE
  || path.resolve(__dirname, "..");

const WORKLOG_DIR = path.join(WORKSPACE, "memory", "worklog");
const CURRENT_PATH = path.join(WORKLOG_DIR, "current.md");
const ARCHIVE_DIR = path.join(WORKLOG_DIR, "archive");

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const tzo = -d.getTimezoneOffset();
  const sign = tzo >= 0 ? "+" : "-";
  const tzH = pad(Math.floor(Math.abs(tzo) / 60));
  const tzM = pad(Math.abs(tzo) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${tzH}:${tzM}`;
}

function timestamp() {
  return `[${now()}]`;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getSessionMeta() {
  // Collect available metadata about current session
  const meta = {};
  if (process.env.OPENCLAW_SESSION_KEY) meta.sessionKey = process.env.OPENCLAW_SESSION_KEY;
  if (process.env.OPENCLAW_AGENT_ID) meta.agentId = process.env.OPENCLAW_AGENT_ID;
  if (process.env.OPENCLAW_MODEL) meta.model = process.env.OPENCLAW_MODEL;
  if (process.env.OPENCLAW_DEFAULT_MODEL) meta.defaultModel = process.env.OPENCLAW_DEFAULT_MODEL;
  meta.hostname = os.hostname();
  meta.user = os.userInfo().username;
  return meta;
}

function readModelFromHeader(content) {
  // Extract model from worklog header (first metadata section)
  const match = content.match(/^- \*\*Model\*\*:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function modelTag() {
  // Try reading from current worklog header first, then env
  if (fs.existsSync(CURRENT_PATH)) {
    const content = fs.readFileSync(CURRENT_PATH, "utf-8");
    const fromHeader = readModelFromHeader(content);
    if (fromHeader) return `[${fromHeader}]`;
  }
  const env = process.env.OPENCLAW_MODEL || process.env.OPENCLAW_DEFAULT_MODEL;
  if (env) return `[${env}]`;
  return "";
}

function cmdInit(args) {
  const title = args.join(" ") || "Untitled Session";
  ensureDir(WORKLOG_DIR);

  const meta = getSessionMeta();
  const model = meta.model || "unknown";
  const lines = [
    `# Worklog: ${title}`,
    ``,
    `- **Started**: ${now()}`,
    `- **Agent**: ${meta.agentId || "unknown"}`,
    `- **Model**: ${model}`,
    `- **Session**: ${meta.sessionKey || "unknown"}`,
    `- **Host**: ${meta.hostname} (${meta.user})`,
    ``,
    `## Log`,
    ``,
    `${timestamp()} [${model}] **INIT** — ${title}`,
    ``,
  ];

  fs.writeFileSync(CURRENT_PATH, lines.join("\n"), "utf-8");
  console.log(`[worklog] Initialized: ${title}`);
  console.log(`[worklog] ${CURRENT_PATH}`);
}

function cmdAppend(args) {
  if (!fs.existsSync(CURRENT_PATH)) {
    console.error("[worklog] ERROR: No active worklog. Run 'init' first.");
    process.exit(1);
  }

  const msg = args.join(" ") || "(no message)";
  const model = modelTag();
  const entry = `${timestamp()} ${model ? `${model} ` : ""}${msg}\n`;
  fs.appendFileSync(CURRENT_PATH, entry, "utf-8");
  console.log(`[worklog] Appended: ${msg.substring(0, 80)}${msg.length > 80 ? "..." : ""}`);
}

function cmdArchive() {
  if (!fs.existsSync(CURRENT_PATH)) {
    console.error("[worklog] ERROR: No active worklog to archive.");
    process.exit(1);
  }

  ensureDir(ARCHIVE_DIR);

  const content = fs.readFileSync(CURRENT_PATH, "utf-8");
  const firstLine = content.split("\n")[0] || "worklog";
  const slug = slugify(firstLine.replace(/^#\s*Worklog:\s*/i, ""));
  const datePart = now().replace(/[T:]/g, "-").substring(0, 16);
  const archiveName = `${datePart}-${slug || "untitled"}.md`;
  const archivePath = path.join(ARCHIVE_DIR, archiveName);
  const stats = fs.statSync(CURRENT_PATH);

  fs.renameSync(CURRENT_PATH, archivePath);
  console.log(`[worklog] Archived: ${archivePath}`);
  console.log(`[worklog] Entries: ~${content.split("\n").filter(l => l.startsWith("[")).length}`);
  console.log(`[worklog] Size: ${stats.size} bytes`);
}

function cmdRead() {
  if (!fs.existsSync(CURRENT_PATH)) {
    console.log("[worklog] No active worklog.");
    process.exit(0);
  }
  const content = fs.readFileSync(CURRENT_PATH, "utf-8");
  console.log(content);
}

function cmdStatus() {
  if (!fs.existsSync(CURRENT_PATH)) {
    console.log("status=inactive");
    console.log("message=No active worklog found.");
    process.exit(0);
  }

  const content = fs.readFileSync(CURRENT_PATH, "utf-8");
  const stats = fs.statSync(CURRENT_PATH);
  const lines = content.split("\n");
  const entries = lines.filter(l => l.startsWith("[")).length;

  // Extract metadata lines
  const metaLines = lines.filter(l => l.startsWith("- **"));
  const titleLine = lines[0] || "";

  console.log(`status=active`);
  console.log(`title=${titleLine.replace(/^#\s*Worklog:\s*/i, "").trim()}`);
  metaLines.forEach(l => {
    const clean = l.replace(/^-\s*\*\*/, "").replace(/\*\*:\s*/, "=");
    console.log(clean);
  });
  console.log(`entries=${entries}`);
  console.log(`size=${stats.size}`);
  console.log(`modified=${stats.mtime.toISOString()}`);
  console.log(`path=${CURRENT_PATH}`);
}

function cmdHelp() {
  console.log(`
Usage: node scripts/worklog.js <command> [args]

Commands:
  init <title>     Start a new worklog
  append <msg>     Append timestamped entry
  archive          Archive current worklog to memory/worklog/archive/
  read             Print current worklog
  status           Check if active worklog exists (machine-readable)
  help             Show this message
`);
}

// --- Main ---
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case "init":    cmdInit(args); break;
  case "append":  cmdAppend(args); break;
  case "archive": cmdArchive(); break;
  case "read":    cmdRead(); break;
  case "status":  cmdStatus(); break;
  case "help":
  default:        cmdHelp(); break;
}
