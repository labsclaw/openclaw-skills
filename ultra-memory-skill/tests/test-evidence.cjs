'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { gate, hash } = require('../scripts/ssc-evidence.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-evidence-'));
const at = '2026-11-09T12:00:00Z';
fs.mkdirSync(path.join(root, 'memory', 'segments'), { recursive: true });
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function fact(id, entity, facet, value, extra = {}) {
  const file = `memory/segments/${id}.md`;
  const quote = `${entity} ${facet}: ${value}`;
  fs.writeFileSync(path.join(root, file), quote + '\n');
  return { id, entity, facet, value, status: 'active', confidence: 'observed', verifiedAt: at,
    source: { file, quote, sha256: hash(fs.readFileSync(path.join(root, file))) }, ...extra };
}
const a = fact('a', 'alpha', 'owner', 'Ana');
const req = { entity: 'alpha', facets: ['owner'], at };
const run = (claims, request = req) => gate(request, claims, root);
try {
  test('observed fact with exact evidence', () => assert.equal(run([a]).status, 'sufficient'));
  test('empty corpus abstains', () => assert.equal(run([]).status, 'missing'));
  test('no facets is invalid, never vacuous success', () => assert.equal(run([a], { ...req, facets: [] }).status, 'invalid'));
  test('missing facet is partial', () => assert.equal(run([a], { ...req, facets: ['owner', 'deadline'] }).status, 'partial'));
  test('retrieval frequency cannot certify', () => assert.equal(run([{ ...a, confidence: 'inferred', accessCount: 999 }]).status, 'partial'));
  test('legacy metadata is unverified', () => assert.equal(run([{ ...a, confidence: undefined }]).status, 'partial'));
  test('certification requires identity and date', () => assert.equal(run([{ ...a, confidence: 'certified' }]).status, 'partial'));
  const certified = { ...a, confidence: 'certified', certifiedBy: 'owner', certifiedAt: at, correctionCount: 0 };
  test('attestation is usable with source, not alone', () => assert.equal(run([certified]).status, 'sufficient'));
  test('correction invalidates certification', () => assert.equal(run([{ ...certified, correctionCount: 1 }]).status, 'partial'));
  test('certified facts expire too', () => assert.equal(run([{ ...certified, verifiedAt: '2020-01-01' }]).status, 'partial'));
  test('future observation rejected', () => assert.equal(run([{ ...a, verifiedAt: '2030-01-01' }]).status, 'partial'));
  test('expired fact rejected', () => assert.equal(run([{ ...a, validUntil: at }]).status, 'partial'));
  test('invalid age policy rejected', () => assert.equal(run([a], { ...req, maxAgeDays: -1 }).status, 'invalid'));
  const b = fact('b', 'alpha', 'owner', 'Bruno');
  test('conflicting verified facts abstain', () => assert.equal(run([a, b]).status, 'conflict'));
  test('explicit successor wins', () => assert.equal(run([a, { ...b, supersedes: ['a'] }]).evidence[0].id, 'b'));
  test('expired successor never resurrects predecessor', () => assert.equal(run([a, { ...b, supersedes: ['a'], verifiedAt: '2020-01-01' }]).status, 'partial'));
  test('cycles rejected', () => assert.equal(run([{ ...a, supersedes: ['b'] }, { ...b, supersedes: ['a'] }]).status, 'conflict'));
  test('dangling successor rejected', () => assert.equal(run([{ ...a, supersedes: ['missing'] }]).status, 'partial'));
  test('duplicate IDs rejected', () => assert.equal(run([a, a]).status, 'conflict'));
  test('contested fact blocks', () => assert.equal(run([{ ...a, status: 'contested' }]).status, 'conflict'));
  test('canonical alias works', () => assert.equal(run([{ ...a, aliases: ['alias'] }], { ...req, entity: 'alias' }).status, 'sufficient'));
  test('ambiguous alias rejected', () => assert.equal(run([{ ...a, aliases: ['alias'] }, { ...b, entity: 'beta', aliases: ['alias'] }], { ...req, entity: 'alias' }).status, 'conflict'));
  test('quote must exist', () => assert.equal(run([{ ...a, source: { ...a.source, quote: 'invented' } }]).status, 'partial'));
  test('evidence receipt includes line and source digest', () => { const r = run([a]); assert.equal(r.evidence[0].source.line, 1); assert.equal(r.receipt.corpusSha256.length, 64); });
  test('path escape rejected', () => assert.equal(run([{ ...a, source: { ...a.source, file: '../outside.txt' } }]).status, 'partial'));
  test('source modification rejected', () => {
    const file = path.join(root, a.source.file); const content = fs.readFileSync(file);
    fs.appendFileSync(file, 'changed'); assert.equal(run([a]).status, 'partial'); fs.writeFileSync(file, content);
  });

  // Independent pilot cases. Same corpus, actual unmodified router ranking as baseline.
  // Baseline top-1 is a retrieval diagnostic, NOT an LLM answer or truth gate.
  const cases = [
    { name: 'current', claims: [a], request: req, expected: 'sufficient', gold: ['a'] },
    { name: 'superseded', claims: [a, { ...b, supersedes: ['a'] }], request: req, expected: 'sufficient', gold: ['b'] },
    { name: 'conflict', claims: [a, b], request: req, expected: 'conflict', gold: [] },
    { name: 'partial', claims: [a], request: { ...req, facets: ['owner', 'deadline'] }, expected: 'partial', gold: [] },
    { name: 'unrelated', claims: [a], request: { ...req, entity: 'beta' }, expected: 'missing', gold: [] },
    { name: 'inferred', claims: [{ ...a, confidence: 'inferred', accessCount: 999 }], request: req, expected: 'partial', gold: [] },
    { name: 'expired', claims: [{ ...a, verifiedAt: '2020-01-01' }], request: req, expected: 'partial', gold: [] },
    { name: 'no-match', claims: [a], request: { entity: 'zzqxv', facets: ['zzpxv'], at }, expected: 'missing', gold: [] },
    { name: 'expired-successor', claims: [a, { ...b, supersedes: ['a'], verifiedAt: '2020-01-01' }], request: req, expected: 'partial', gold: [] },
  ];
  const router = path.resolve(process.argv[2] || path.join(__dirname, '../scripts/ssc-router.cjs'));
  const rows = [];
  for (const c of cases) {
    const index = { segments: c.claims.map(x => ({ ...x, id: x.id, file: x.source.file, summary: x.source.quote,
      keywords: [x.entity, x.facet], tier: 1, weight: 1 })), daily: [], config: {} };
    const indexPath = path.join(root, 'memory', 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index));
    const before = fs.readFileSync(indexPath);
    const query = [c.request.entity, ...c.request.facets].join(' ');
    const code = `const {performance}=require('node:perf_hooks');const r=require(process.argv[1]);const t=performance.now();const v=r.querySSC(process.argv[2],{topK:5,dryRun:true});console.log(JSON.stringify({ms:performance.now()-t,ids:v.results.map(x=>x.id)}));`;
    const baseline = spawnSync(process.execPath, ['-e', code, router, query], {
      env: { ...process.env, OPENCLAW_WORKSPACE: root }, encoding: 'utf8', timeout: 15000
    });
    assert.equal(baseline.status, 0, baseline.stderr);
    assert.deepEqual(fs.readFileSync(indexPath), before, 'baseline mutated fixture index');
    const ranked = JSON.parse(baseline.stdout.trim());
    const started = performance.now(), result = run(c.claims, c.request), gateMs = performance.now() - started;
    assert.equal(result.status, c.expected, c.name);
    if (c.gold.length) assert.deepEqual(result.evidence.map(e => e.id).sort(), c.gold.slice().sort());
    rows.push({ case: c.name, baselineTop1: ranked.ids[0] ?? null, baselineTop5: ranked.ids,
      expectedStatus: c.expected, gateStatus: result.status, evidence: result.evidence.map(e => e.id),
      expectedEvidenceWhenSufficient: c.gold, baselineMs: ranked.ms, gateMs });
  }
  const report = { generatedAt: new Date().toISOString(), testsPassed: passed, pilotCasesPassed: rows.length,
    corpus: 'synthetic isolated fixtures; no live-memory certification', baselineRouter: router,
    baselineRouterSha256: hash(fs.readFileSync(router)), gateSha256: hash(fs.readFileSync(path.join(__dirname, '../scripts/ssc-evidence.cjs'))),
    interpretation: 'Actual router top-1/top-5 ranking versus optional evidence gate. Not an end-to-end LLM comparison. Gate checks declared evidence, not semantic entailment.', rows };
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { fs.rmSync(root, { recursive: true, force: true }); }
