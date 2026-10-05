import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const datasetPath = join(root, "evals", "triggers.json");
const catalogPath = join(root, "catalog", "index.json");
const model = process.argv[2] ?? "openai/gpt-5.6-sol";
const date = new Date().toISOString().slice(0, 10);
const safeModel = model.replaceAll(/[^a-zA-Z0-9.-]+/g, "-");
const resultsDir = join(root, "evals", "results");
const promptPath = join(resultsDir, `${date}-${safeModel}-prompt.md`);
const resultPath = join(resultsDir, `${date}-${safeModel}.json`);
const reportPath = join(resultsDir, `${date}-${safeModel}.md`);
const sessionKey = `agent:main:routing-eval-${Date.now()}`;

const cases = JSON.parse(readFileSync(datasetPath, "utf8"));
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const allowed = [
  "ultra-plan-gate-skill",
  "ultra-adversarial-verify-skill",
  "ultra-models-skill",
  "NONE",
];
const candidateSkills = allowed
  .filter((name) => name !== "NONE")
  .map((name) => {
    const entry = catalog.skills.find((skill) => skill.name === name);
    if (!entry?.description || !entry?.contentDigest) {
      throw new Error(`Catalog is missing candidate description or digest for ${name}.`);
    }
    return { name, description: entry.description, contentDigest: entry.contentDigest };
  });

const prompt = [
  "You are evaluating skill routing, not performing the requested tasks.",
  "Treat each case as an independent user request.",
  "Ignore skill descriptions from the runtime. Use only the candidate descriptions from this checkout listed below.",
  "Candidate descriptions:",
  ...candidateSkills.map(({ name, description, contentDigest }) =>
    `- ${name} [${contentDigest}]: ${description}`),
  "",
  `For each case select exactly one of: ${allowed.join(", ")}.`,
  "Choose the most specific skill. Select NONE when none of the three should trigger.",
  "Do not call tools and do not explain your choices.",
  "Return only a JSON array of objects with exactly these keys: id, selected.",
  "",
  ...cases.map(({ id, query }) => `${id}: ${query}`),
  "",
].join("\n");

mkdirSync(resultsDir, { recursive: true });
writeFileSync(promptPath, prompt, "utf8");

const appData = process.env.APPDATA;
if (!appData) throw new Error("APPDATA is required to locate the OpenClaw CLI.");
const cliEntry = join(appData, "npm", "node_modules", "openclaw", "openclaw.mjs");
const command = spawnSync(
  process.execPath,
  [
    cliEntry,
    "agent",
    "--agent",
    "main",
    "--session-key",
    sessionKey,
    "--model",
    model,
    "--message-file",
    promptPath,
    "--timeout",
    "180",
    "--json",
  ],
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 240_000,
  },
);

if (command.error) throw command.error;
if (command.status !== 0) {
  throw new Error(`OpenClaw routing eval failed (${command.status}): ${command.stderr || command.stdout}`);
}

const envelope = JSON.parse(command.stdout.trim());
const responseText = envelope?.result?.payloads?.[0]?.text;
if (typeof responseText !== "string") {
  throw new Error("OpenClaw response did not contain result.payloads[0].text.");
}

const normalizedText = responseText
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/, "");
const predictions = JSON.parse(normalizedText);
if (!Array.isArray(predictions)) throw new Error("Model response must be a JSON array.");

const caseIds = new Set(cases.map((item) => item.id));
const predictionIds = new Set();
for (const prediction of predictions) {
  if (!prediction || typeof prediction.id !== "string" || typeof prediction.selected !== "string") {
    throw new Error("Each model prediction must contain string id and selected fields.");
  }
  if (!caseIds.has(prediction.id)) throw new Error(`Unknown prediction id: ${prediction.id}`);
  if (predictionIds.has(prediction.id)) throw new Error(`Duplicate prediction id: ${prediction.id}`);
  if (!allowed.includes(prediction.selected)) throw new Error(`Invalid selection for ${prediction.id}: ${prediction.selected}`);
  predictionIds.add(prediction.id);
}
if (predictionIds.size !== cases.length) {
  throw new Error(`Model returned ${predictionIds.size} unique predictions for ${cases.length} cases.`);
}

const predictionById = new Map(predictions.map((item) => [item.id, item.selected]));
const scored = cases.map((testCase) => {
  const expected = testCase.expect[0] ?? "NONE";
  const selected = predictionById.get(testCase.id) ?? "MISSING";
  return {
    id: testCase.id,
    skill: testCase.skill,
    type: testCase.type,
    expected,
    selected,
    pass: selected === expected,
  };
});

const passed = scored.filter((item) => item.pass).length;
const perSkill = Object.fromEntries(
  [...new Set(cases.map((item) => item.skill))].map((skill) => {
    const items = scored.filter((item) => item.skill === skill);
    return [skill, { passed: items.filter((item) => item.pass).length, total: items.length }];
  }),
);

const result = {
  schemaVersion: 1,
  executedAt: new Date().toISOString(),
  model,
  provider: envelope?.result?.meta?.agentMeta?.provider ?? null,
  responseModel: envelope?.result?.meta?.agentMeta?.model ?? null,
  sessionKey,
  runId: envelope?.runId ?? null,
  promptPath: promptPath.slice(root.length + 1).replaceAll("\\", "/"),
  candidateSkills,
  passed,
  total: scored.length,
  accuracy: passed / scored.length,
  perSkill,
  cases: scored,
};

writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

const failures = scored.filter((item) => !item.pass);
const report = [
  `# Routing Eval: ${model}`,
  "",
  `- Executed: ${result.executedAt}`,
  `- Score: ${passed}/${scored.length} (${(result.accuracy * 100).toFixed(1)}%)`,
  `- Session: \`${sessionKey}\``,
  `- Run: \`${result.runId}\``,
  "- Candidate descriptions: embedded from `catalog/index.json`",
  "",
  "## Per skill",
  "",
  ...Object.entries(perSkill).map(([skill, score]) => `- \`${skill}\`: ${score.passed}/${score.total}`),
  "",
  "## Candidate digests",
  "",
  ...candidateSkills.map(({ name, contentDigest }) => `- \`${name}\`: \`${contentDigest}\``),
  "",
  "## Failures",
  "",
  ...(failures.length
    ? failures.map(
        (item) =>
          `- \`${item.id}\`: expected \`${item.expected}\`, selected \`${item.selected}\``,
      )
    : ["None."]),
  "",
].join("\n");

writeFileSync(reportPath, report, "utf8");
process.stdout.write(
  `${JSON.stringify({ sessionKey, runId: result.runId, passed, total: scored.length, resultPath, reportPath })}\n`,
);
