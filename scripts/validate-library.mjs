import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const registry = JSON.parse(await fs.readFile(path.join(root, "catalog", "registry.json"), "utf8"));
const triggerCases = JSON.parse(await fs.readFile(path.join(root, "evals", "triggers.json"), "utf8"));
const tiers = new Set(["core", "approved", "experimental", "deprecated", "quarantined"]);
const risks = new Set(["low", "medium", "high", "critical"]);
const platforms = new Set(["windows", "linux", "macos"]);
const errors = [];
const warnings = [];

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function parseFrontmatter(text) {
  const normalized = text.replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const lines = match[1].split("\n");
  const data = {};
  for (let i = 0; i < lines.length; i += 1) {
    const keyMatch = lines[i].match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!keyMatch) continue;
    const [, key, raw] = keyMatch;
    if ([">", ">-", "|", "|-"].includes(raw.trim())) {
      const values = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        i += 1;
        values.push(lines[i].trim());
      }
      data[key] = values.join(" ");
    } else data[key] = unquote(raw);
  }
  return data;
}

async function walkFiles(directory) {
  const output = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walkFiles(absolute));
    else if (entry.isFile()) output.push(absolute);
  }
  return output;
}

function finding(target, message, isWarning = false) {
  (isWarning ? warnings : errors).push(`${target}: ${message}`);
}

if (registry.schemaVersion !== 1) errors.push("registry: schemaVersion must be 1");
if (!registry.publication?.status || !registry.publication?.reason) errors.push("registry: publication status and reason are required");
if (registry.publication?.status === "ready") {
  try { await fs.access(path.join(root, "LICENSE")); }
  catch { errors.push("registry: publication cannot be ready without LICENSE"); }
}

const names = new Set();
for (const entry of registry.skills ?? []) {
  const target = entry.name || "unnamed";
  if (names.has(entry.name)) finding(target, "duplicate catalog name");
  names.add(entry.name);
  if (!tiers.has(entry.trustTier)) finding(target, `invalid trustTier ${entry.trustTier}`);
  if (!risks.has(entry.risk)) finding(target, `invalid risk ${entry.risk}`);
  if (!entry.owner || !entry.category) finding(target, "owner and category are required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.verifiedAt ?? "")) finding(target, "verifiedAt must be YYYY-MM-DD");
  if (typeof entry.workshopManaged !== "boolean") finding(target, "workshopManaged must be boolean");
  const routingEval = entry.routingEval;
  if (!routingEval || !["pass", "fail", "not-run"].includes(routingEval.status)) finding(target, "routingEval status is invalid");
  else {
    if (!routingEval.model || !routingEval.executedAt || !routingEval.report) finding(target, "routingEval model, executedAt, and report are required");
    if (!Number.isInteger(routingEval.passed) || !Number.isInteger(routingEval.total) || routingEval.passed < 0 || routingEval.total < 0 || routingEval.passed > routingEval.total) finding(target, "routingEval score is invalid");
    if (routingEval.status === "pass" && routingEval.passed !== routingEval.total) finding(target, "routingEval pass requires all cases to pass");
    try { await fs.access(path.join(root, routingEval.report)); }
    catch { finding(target, `missing routing eval report ${routingEval.report}`); }
  }
  if (!Array.isArray(entry.platforms) || !entry.platforms.length || entry.platforms.some((item) => !platforms.has(item))) finding(target, "invalid platforms");
  for (const capability of ["network", "shell", "filesystemWrite", "configMutation"]) {
    if (typeof entry.capabilities?.[capability] !== "boolean") finding(target, `capability ${capability} must be boolean`);
  }

  const directory = path.join(root, entry.path ?? "");
  const skillPath = path.join(directory, "SKILL.md");
  let text;
  try { text = await fs.readFile(skillPath, "utf8"); }
  catch { finding(target, `missing ${path.relative(root, skillPath)}`); continue; }
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter) finding(target, "missing YAML frontmatter");
  else {
    if (frontmatter.name !== entry.name) finding(target, `frontmatter name ${frontmatter.name} does not match catalog`);
    if (entry.path !== entry.name) finding(target, "catalog path must match skill name in the pilot");
    if (!frontmatter.description) finding(target, "frontmatter description is required");
    if ((frontmatter.description ?? "").length > 1024) finding(target, "description exceeds 1024 characters");
  }
  if (text.length > 10_000) finding(target, `SKILL.md has ${text.length} characters; target is 10000`, entry.trustTier === "experimental");
  for (const match of text.matchAll(/references\/([A-Za-z0-9._-]+\.md)/g)) {
    try { await fs.access(path.join(directory, "references", match[1])); }
    catch { finding(target, `missing referenced file references/${match[1]}`); }
  }

  const files = await walkFiles(directory);
  const combined = (await Promise.all(files.map((file) => fs.readFile(file, "utf8").catch(() => "")))).join("\n");
  const transient = files.map((file) => path.basename(file)).filter((name) => /^\.last-run|^last-free-|\.tmp$/i.test(name));
  if (transient.length) finding(target, `transient artifacts in published directory: ${transient.join(", ")}`);
  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bghp_[A-Za-z0-9]{30,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bsk-[A-Za-z0-9_-]{24,}\b/
  ];
  if (secretPatterns.some((pattern) => pattern.test(combined))) finding(target, "high-confidence secret pattern detected");
  const detected = {
    network: /Invoke-RestMethod|Invoke-WebRequest|\bcurl\b|\bwget\b|\bfetch\s*\(|\baxios\b|\brequests\.(?:get|post|put|delete)\s*\(/i.test(combined),
    shell: files.some((file) => /\.(?:ps1|py|js|mjs|sh)$/i.test(file)),
    filesystemWrite: /Set-Content|Out-File|WriteAllText|writeFile|Remove-Item|Move-Item/i.test(combined),
    configMutation: /config\.patch|openclaw\.json|pm2\s+(?:save|delete|start|restart)/i.test(combined)
  };
  for (const [capability, present] of Object.entries(detected)) {
    if (present && !entry.capabilities[capability]) finding(target, `detected ${capability} but catalog declares false`);
  }
  if (entry.risk === "low" && Object.values(detected).some(Boolean)) finding(target, "low risk conflicts with detected active capabilities");
}

const caseIds = new Set();
for (const item of triggerCases) {
  if (!item.id || caseIds.has(item.id)) errors.push(`triggers: duplicate or missing id ${item.id ?? "<missing>"}`);
  caseIds.add(item.id);
  if (!names.has(item.skill)) errors.push(`${item.id}: unknown skill ${item.skill}`);
  if (!["positive", "negative"].includes(item.type)) errors.push(`${item.id}: invalid type`);
  if (!item.query || !Array.isArray(item.expect)) errors.push(`${item.id}: query and expect are required`);
  if (item.type === "positive" && !item.expect.includes(item.skill)) errors.push(`${item.id}: positive case must expect its skill`);
  if (item.type === "negative" && item.expect.length) errors.push(`${item.id}: negative case must expect no skill`);
}
for (const name of names) {
  const positives = triggerCases.filter((item) => item.skill === name && item.type === "positive").length;
  const negatives = triggerCases.filter((item) => item.skill === name && item.type === "negative").length;
  if (positives < 3 || negatives < 2) errors.push(`${name}: requires at least 3 positive and 2 negative trigger cases`);
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`FAIL ${error}`);
console.log(`Validated ${registry.skills.length} catalog skills and ${triggerCases.length} trigger cases.`);
console.log(`${warnings.length} warning(s), ${errors.length} error(s).`);
if (errors.length) process.exit(1);
