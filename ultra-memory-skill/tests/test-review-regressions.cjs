'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { lintIndex } = require('../scripts/ssc-memory-lint.cjs');
const scripts = path.resolve(__dirname, '../scripts');
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-review-'));
  fs.mkdirSync(path.join(root, 'memory/segments'), { recursive: true });
  fs.mkdirSync(path.join(root, 'memory/daily'));
  fs.writeFileSync(path.join(root, 'memory/segments/s1.md'), '# Decision\nOwner Ana');
  const index = path.join(root, 'memory/index.json');
  fs.writeFileSync(index, JSON.stringify({ segments: [{ id: 's1', file: 'memory/segments/s1.md' }] }));
  try { fn(root, index); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function child(script, root, code = 'require(process.argv[1])') {
  return spawnSync(process.execPath, ['-e', code, path.join(scripts, script)], {
    env: { ...process.env, OPENCLAW_WORKSPACE: root }, encoding: 'utf8', timeout: 30000
  });
}
for (const script of ['ssc-router.cjs', 'ssc-rebuild.cjs']) {
  test(`${script}: explicit invalid workspace cannot fall through to another index`, () => {
    fixture(root => { const r = child(script, path.join(root, 'absent')); assert.equal(r.status, 1, r.stderr); });
  });
}
test('linter E0 applies to imported function, not only CLI', () => {
  assert(lintIndex({ segments: [] }, () => true).errors.some(x => x.code === 'E0'));
});
test('malformed relation is rejected instead of silently ignored', () => {
  assert(lintIndex({ segments: [{ id: 'a', file: 'a', supersedes: 'b' }] }, () => true).errors.length);
});
test('certification date must parse and attestor cannot be whitespace', () => {
  assert(lintIndex({ segments: [{ id: 'a', file: 'a', confidence: 'certified', certifiedBy: ' ', certifiedAt: 'invalid' }] }, () => true).errors.some(x => x.code === 'E7'));
});
test('reciprocal supersession cycle is rejected', () => {
  const a = { id: 'a', file: 'a', supersedes: ['b'], supersededBy: ['b'] };
  const b = { id: 'b', file: 'b', supersedes: ['a'], supersededBy: ['a'] };
  assert(lintIndex({ segments: [a, b] }, () => true).errors.some(x => x.code === 'E9'));
});
test('rebuild preserves zero-weight policy, metadata, and numeric routing tier', () => fixture((root, index) => {
  const entry = { id: 's1', file: 'memory/segments/s1.md', tier: 'HOT', confidence: 'observed', correctionCount: 0,
    cacheTier: 'HOT', weight: 0, verifiedAt: '2026-11-09', source: { reference: 'session:1' } };
  fs.writeFileSync(index, JSON.stringify({ config: { tier1Weight: 0, customFlag: true }, segments: [entry] }));
  const r = child('ssc-rebuild.cjs', root, 'require(process.argv[1]).rebuild()');
  assert.equal(r.status, 0, r.stderr);
  const rebuilt = JSON.parse(fs.readFileSync(index));
  assert.equal(rebuilt.config.tier1Weight, 0);
  assert.equal(rebuilt.config.customFlag, true);
  assert.equal(rebuilt.segments[0].tier, 1);
  for (const key of ['cacheTier', 'confidence', 'correctionCount', 'weight', 'verifiedAt', 'source']) assert.deepEqual(rebuilt.segments[0][key], entry[key]);
}));
test('rebuild refuses corrupt index instead of erasing provenance', () => fixture((root, index) => {
  fs.writeFileSync(index, '{broken');
  const r = child('ssc-rebuild.cjs', root, 'require(process.argv[1]).rebuild()');
  assert.equal(r.status, 1, r.stderr);
  assert.equal(fs.readFileSync(index, 'utf8'), '{broken');
}));
test('strict CLI rejects empty index', () => fixture((root, index) => {
  fs.writeFileSync(index, JSON.stringify({ segments: [] }));
  const r = spawnSync(process.execPath, [path.join(scripts, 'ssc-memory-lint.cjs'), '--strict', '--json', '--index', index], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).errors.filter(x => x.code === 'E0').length, 1);
}));
test('router dry-run and access count persist in the explicit fixture only', () => fixture((root, index) => {
  const code = `const assert=require('node:assert/strict');const r=require(process.argv[1]);const first=r.querySSC('Owner Ana',{dryRun:true});assert.equal(first.results[0].id,'s1');assert.equal(r.loadIndex().segments[0].accessCount,undefined);r.querySSC('Owner Ana');assert.equal(r.loadIndex().segments[0].accessCount,1);assert.equal(r.querySSC('zzqxv',{dryRun:true}).results.length,0);`;
  const r = child('ssc-router.cjs', root, code);
  assert.equal(r.status, 0, r.stderr);
}));
test('rebuild preserves other collections and daily usage without claiming to search them', () => fixture((root, index) => {
  fs.writeFileSync(path.join(root, 'memory/daily/2026-11-09.md'), '# session');
  fs.writeFileSync(index, JSON.stringify({ segments: [], reports: [{ id: 'retained', file: 'report.md' }],
    daily: [{ file: 'memory/daily/2026-11-09.md', accessCount: 7, weight: 0, confidence: 'observed' }] }));
  const r = child('ssc-rebuild.cjs', root, 'require(process.argv[1]).rebuild()');
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(fs.readFileSync(index));
  assert.equal(data.reports[0].id, 'retained');
  assert.equal(data.daily[0].accessCount, 7); assert.equal(data.daily[0].weight, 0);
  assert.equal(data.daily[0].confidence, 'observed');
}));
