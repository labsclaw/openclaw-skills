import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];
const allowedLicenses = new Set(["Apache-2.0", "MIT"]);
const separateScopes = new Map([
  ["c-level-advisor", "MIT"],
  ["ultra-browser-skill", "MIT"],
  ["ultra-dom-engine-skill", "MIT"],
  ["ultra-memory-skill", "MIT"],
  ["ultra-powershell-skill", "MIT"],
  ["ultra-x-stealth-skill", "MIT"],
]);
const expectedLicenseDigests = new Map([
  ["LICENSE", "c71d239df91726fc519c6eb72d318ec65820627232b2f796219e87dcf35d0ab4"],
  ["c-level-advisor/LICENSE", "a20126646f93d32a8989c3cf4772d59194f405034f7babe7daebeac22b8ab151"],
  ["ultra-browser-skill/LICENSE", "d5e0820ce3fc4f4d44314995aebcf769a336f20ee9e1d45851c59a3f2a3ab925"],
  ["ultra-browser-skill/THIRD_PARTY_LICENSES/DOM_ENGINE_LICENSE", "978e0113cdd80ca008fa49ea696c4ee432520f7655a520634649d181fc710f5e"],
  ["ultra-dom-engine-skill/LICENSE", "978e0113cdd80ca008fa49ea696c4ee432520f7655a520634649d181fc710f5e"],
  ["ultra-memory-skill/LICENSE", "91d707052ea99ea60d9de966fdd2e28ab9b57fe2ae5ced4bbd4f97c8af9f4d9f"],
  ["ultra-powershell-skill/LICENSE", "6e4b613ab5e69e11d015591ae24eb8c4358df1afc32645f1eb9db251951c9780"],
  ["ultra-x-stealth-skill/LICENSE", "149639bb0b8c99922c7ad47231164300c5d2ecc9123af779af577e846e7f8279"],
  ["ultra-x-stealth-skill/THIRD_PARTY_LICENSES/DOM_ENGINE_LICENSE", "978e0113cdd80ca008fa49ea696c4ee432520f7655a520634649d181fc710f5e"],
]);
const independentlyReimplemented = [
  "ultra-adversarial-verify-skill",
  "ultra-code-review-skill",
  "ultra-live-state-truth-skill",
  "ultra-memory-hygiene-skill",
  "ultra-plan-gate-skill",
  "ultra-ruthless-editor-skill",
  "ultra-scope-fence-skill",
];

function parseFrontmatter(text) {
  const normalized = text.replaceAll("\r\n", "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+?)\s*$/);
    if (!field) continue;
    result[field[1]] = field[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return result;
}

async function walk(directory) {
  const output = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(absolute));
    else if (entry.isFile()) output.push(absolute);
  }
  return output;
}

async function requireFile(relativePath) {
  try { await fs.access(path.join(root, relativePath)); }
  catch { errors.push(`missing required file: ${relativePath}`); }
}

function digestLicense(text) {
  const normalized = `${text.replaceAll("\r\n", "\n").trimEnd()}\n`;
  return createHash("sha256").update(normalized).digest("hex");
}

for (const file of ["LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md"]) await requireFile(file);
await requireFile("ultra-browser-skill/THIRD_PARTY_LICENSES/DOM_ENGINE_LICENSE");
await requireFile("ultra-x-stealth-skill/THIRD_PARTY_LICENSES/DOM_ENGINE_LICENSE");
for (const [relativePath, expectedDigest] of expectedLicenseDigests) {
  try {
    const actual = digestLicense(await fs.readFile(path.join(root, relativePath), "utf8"));
    if (actual !== expectedDigest) {
      errors.push(`${relativePath}: license digest ${actual} does not match reviewed digest ${expectedDigest}`);
    }
  } catch { /* missing files are reported by requireFile */ }
}

const files = await walk(root);
const skillFiles = files.filter((file) => path.basename(file) === "SKILL.md");
const skillScopes = new Set();
for (const file of skillFiles) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  skillScopes.add(relative.split("/")[0]);
  const text = await fs.readFile(file, "utf8");
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter) {
    errors.push(`${relative}: missing YAML frontmatter`);
    continue;
  }
  if (!frontmatter.license) errors.push(`${relative}: missing SPDX license field`);
  else if (!allowedLicenses.has(frontmatter.license)) errors.push(`${relative}: unsupported SPDX license ${frontmatter.license}`);

  const scope = relative.split("/")[0];
  const expected = separateScopes.get(scope) ?? "Apache-2.0";
  if (frontmatter.license && frontmatter.license !== expected) {
    errors.push(`${relative}: expected ${expected} for scope ${scope}, found ${frontmatter.license}`);
  }
}

const notices = await fs.readFile(path.join(root, "THIRD_PARTY_NOTICES.md"), "utf8");
for (const [scope] of separateScopes) {
  await requireFile(path.join(scope, "LICENSE"));
  if (!notices.includes(`\`${scope}/\``)) errors.push(`THIRD_PARTY_NOTICES.md: missing scope ${scope}/`);
  if (!notices.includes(`\`${scope}/LICENSE\``)) errors.push(`THIRD_PARTY_NOTICES.md: missing license path ${scope}/LICENSE`);
}
for (const relativePath of [
  "ultra-browser-skill/THIRD_PARTY_LICENSES/DOM_ENGINE_LICENSE",
  "ultra-x-stealth-skill/THIRD_PARTY_LICENSES/DOM_ENGINE_LICENSE",
]) {
  if (!notices.includes(`\`${relativePath}\``)) errors.push(`THIRD_PARTY_NOTICES.md: missing embedded component notice ${relativePath}`);
}

const forbidden = [
  /Rigor Pack/i,
  /anthropics\/claude-code\/tree\/main\/plugins\/(?:rigor-pack|code-review)/i,
  /Adapted from Anthropic/i,
];
for (const scope of independentlyReimplemented) await requireFile(path.join(scope, "SKILL.md"));

for (const scope of skillScopes) {
  const directory = path.join(root, scope);
  for (const file of await walk(directory)) {
    if (!/\.(?:md|cjs|mjs|js|json|ya?ml)$/i.test(file)) continue;
    const text = await fs.readFile(file, "utf8");
    if (forbidden.some((pattern) => pattern.test(text))) {
      errors.push(`${path.relative(root, file)}: contains a prohibited unlicensed-source attribution`);
    }
  }
}

const helper = await fs.readFile(path.join(root, "ultra-code-review-skill", "scripts", "code-review.cjs"), "utf8");
if (!helper.includes("SPDX-License-Identifier: Apache-2.0")) {
  errors.push("ultra-code-review-skill/scripts/code-review.cjs: missing SPDX header");
}

for (const error of errors) console.error(`FAIL ${error}`);
console.log(`Validated ${skillFiles.length} skill manifests across ${separateScopes.size} separately licensed scopes.`);
console.log(`${errors.length} error(s).`);
if (errors.length) process.exit(1);
