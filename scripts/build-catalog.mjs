import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const registryPath = path.join(root, "catalog", "registry.json");
const indexPath = path.join(root, "catalog", "index.json");

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
  if (!match) throw new Error("SKILL.md has no YAML frontmatter");
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
    } else {
      data[key] = unquote(raw);
    }
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
  return output.sort((a, b) => a.localeCompare(b));
}

async function digestDirectory(directory) {
  const hash = createHash("sha256");
  for (const file of await walkFiles(directory)) {
    const relative = path.relative(directory, file).replaceAll(path.sep, "/");
    hash.update(relative).update("\0").update(await fs.readFile(file)).update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
const skills = [];
for (const entry of registry.skills) {
  const skillDirectory = path.join(root, entry.path);
  const skillText = await fs.readFile(path.join(skillDirectory, "SKILL.md"), "utf8");
  const frontmatter = parseFrontmatter(skillText);
  skills.push({
    name: frontmatter.name,
    description: frontmatter.description,
    path: entry.path,
    trustTier: entry.trustTier,
    owner: entry.owner,
    category: entry.category,
    risk: entry.risk,
    platforms: entry.platforms,
    capabilities: entry.capabilities,
    verifiedAt: entry.verifiedAt,
    workshopManaged: entry.workshopManaged,
    routingEval: entry.routingEval,
    contentDigest: await digestDirectory(skillDirectory)
  });
}

const index = {
  schemaVersion: registry.schemaVersion,
  publication: registry.publication,
  versioning: "content-sha256",
  skills: skills.sort((a, b) => a.name.localeCompare(b.name))
};
const rendered = `${JSON.stringify(index, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await fs.readFile(indexPath, "utf8").catch(() => "");
  if (current !== rendered) {
    console.error("catalog/index.json is stale. Run: node scripts/build-catalog.mjs");
    process.exit(1);
  }
  console.log(`Catalog index is current (${skills.length} skills).`);
} else {
  await fs.writeFile(indexPath, rendered, "utf8");
  console.log(`Wrote ${path.relative(root, indexPath)} (${skills.length} skills).`);
}
