#!/usr/bin/env node
/**
 * test-memory-lint.cjs — Tests for ssc-memory-lint.cjs (epistemic integrity layer)
 *
 * These tests encode the claims that must remain true after adopting the
 * Auto Ontology discipline. They are regression tests for FACTS, not style.
 *
 * Run: node tests/test-memory-lint.cjs
 * Env: OPENCLAW_WORKSPACE to point at a deployed workspace (optional for unit tests)
 */

const path = require('path');
const { lintIndex } = require('../scripts/ssc-memory-lint.cjs');

let passed = 0;
let failed = 0;
const failures = [];

function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, message: err.message });
    console.log(`  ✗ FAIL: ${name}`);
    console.log(`      ${err.message}`);
  }
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'mismatch'} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function hasCode(list, code) {
  return list.some((x) => x.code === code);
}

const allFilesExist = () => true;
const noFilesExist = () => false;

// ============================================
// SUITE 1 — Structural integrity (E1-E3)
// ============================================
describe('[Suite 1/5] Structural integrity', () => {
  it('E1: duplicate segment id is an error', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md' },
        { id: 's001', file: 'memory/segments/b.md' },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E1'), 'expected E1 duplicate id error');
  });

  it('E2: missing segment file is an error', () => {
    const index = { segments: [{ id: 's001', file: 'memory/segments/gone.md' }] };
    const r = lintIndex(index, noFilesExist);
    assert(hasCode(r.errors, 'E2'), 'expected E2 missing file error');
  });

  it('E2: segment with no file field is an error', () => {
    const index = { segments: [{ id: 's001' }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E2'), 'expected E2 for missing file field');
  });

  it('E3: two entries pointing at the same file is an error', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md' },
        { id: 's002', file: 'memory/segments/a.md' },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E3'), 'expected E3 duplicate file reference');
  });

  it('clean index produces zero errors', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md', confidence: 'certified', certifiedBy: 'Renato', certifiedAt: '2026-11-01' },
        { id: 's002', file: 'memory/segments/b.md', confidence: 'observed' },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assertEqual(r.errors.length, 0, 'errors on a clean index');
  });
});

// ============================================
// SUITE 2 — Supersession integrity (E4-E5)
// ============================================
describe('[Suite 2/5] Supersession integrity', () => {
  it('E4: supersedes pointing at unknown id is an error', () => {
    const index = { segments: [{ id: 's002', file: 'memory/segments/b.md', supersedes: ['s999'] }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E4'), 'expected E4 unknown supersedes target');
  });

  it('E5: one-way supersedes without supersededBy is an error', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md' },
        { id: 's002', file: 'memory/segments/b.md', supersedes: ['s001'] },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E5'), 'expected E5 non-reciprocal supersession');
  });

  it('E5: reciprocal supersession pair passes', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md', supersededBy: ['s002'] },
        { id: 's002', file: 'memory/segments/b.md', supersedes: ['s001'] },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.errors, 'E5'), 'reciprocal pair should not raise E5');
    assertEqual(r.stats.supersededPairs, 1, 'supersededPairs count');
  });
});

// ============================================
// SUITE 3 — Confidence & certification (E6-E7, W1, W3)
// ============================================
describe('[Suite 3/5] Confidence and certification', () => {
  it('E6: confidence outside enum is an error', () => {
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', confidence: 'probably' }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E6'), 'expected E6 invalid confidence');
  });

  it('E6: all three valid confidence values pass', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md', confidence: 'certified', certifiedBy: 'Renato', certifiedAt: '2026-11-01' },
        { id: 's002', file: 'memory/segments/b.md', confidence: 'observed' },
        { id: 's003', file: 'memory/segments/c.md', confidence: 'inferred' },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.errors, 'E6'), 'valid enum values should pass');
  });

  it('E7: certified without certifiedBy is an error', () => {
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', confidence: 'certified', certifiedAt: '2026-11-01' }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E7'), 'expected E7 missing certifiedBy');
  });

  it('E7: certified without certifiedAt is an error', () => {
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', confidence: 'certified', certifiedBy: 'Renato' }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.errors, 'E7'), 'expected E7 missing certifiedAt');
  });

  it('W1: missing confidence field is a warning, not an error', () => {
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md' }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.warnings, 'W1'), 'expected W1 legacy warning');
    assertEqual(r.errors.length, 0, 'legacy entry must not be an error');
    assertEqual(r.stats.legacy, 1, 'legacy count');
  });

  it('W3: certified with corrections is flagged as stale certification', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md', confidence: 'certified', certifiedBy: 'Renato', certifiedAt: '2026-11-01', correctionCount: 2 },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.warnings, 'W3'), 'expected W3 stale certification');
  });

  it('W3: certified with zero corrections is not flagged', () => {
    const index = {
      segments: [
        { id: 's001', file: 'memory/segments/a.md', confidence: 'certified', certifiedBy: 'Renato', certifiedAt: '2026-11-01', correctionCount: 0 },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.warnings, 'W3'), 'zero corrections should not raise W3');
  });
});

// ============================================
// SUITE 4 — Receipts & staleness (W2, W4)
// ============================================
describe('[Suite 4/5] Receipts and staleness', () => {
  it('W2: accessCount > 0 without receipts is a warning', () => {
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', accessCount: 7 }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.warnings, 'W2'), 'expected W2 usage-with-no-trace');
  });

  it('W2: accessCount > 0 with receipts is not flagged', () => {
    const index = {
      segments: [{ id: 's001', file: 'memory/segments/a.md', accessCount: 7, lastUsedIn: ['task-abc'] }],
    };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.warnings, 'W2'), 'receipts should clear W2');
  });

  it('W2: accessCount 0 without receipts is not flagged', () => {
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', accessCount: 0 }] };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.warnings, 'W2'), 'zero access should not raise W2');
  });

  it('W4: HOT tier older than 90 days is flagged', () => {
    const old = new Date(Date.now() - 120 * 86400000).toISOString();
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', tier: 'HOT', lastUpdated: old }] };
    const r = lintIndex(index, allFilesExist);
    assert(hasCode(r.warnings, 'W4'), 'expected W4 stale HOT');
  });

  it('W4: HOT tier recently updated is not flagged', () => {
    const fresh = new Date(Date.now() - 5 * 86400000).toISOString();
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', tier: 'HOT', lastUpdated: fresh }] };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.warnings, 'W4'), 'fresh HOT should not raise W4');
  });

  it('W4: WARM tier old entry is not flagged (only HOT)', () => {
    const old = new Date(Date.now() - 120 * 86400000).toISOString();
    const index = { segments: [{ id: 's001', file: 'memory/segments/a.md', tier: 'WARM', lastUpdated: old }] };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.warnings, 'W4'), 'WARM should not raise W4');
  });
});

// ============================================
// SUITE 5 — Stats & resilience
// ============================================
describe('[Suite 5/5] Stats and resilience', () => {
  it('stats count certified/observed/inferred/legacy correctly', () => {
    const index = {
      segments: [
        { id: 's1', file: 'a.md', confidence: 'certified', certifiedBy: 'X', certifiedAt: '2026-11-01' },
        { id: 's2', file: 'b.md', confidence: 'observed' },
        { id: 's3', file: 'c.md', confidence: 'inferred' },
        { id: 's4', file: 'd.md' },
      ],
    };
    const r = lintIndex(index, allFilesExist);
    assertEqual(r.stats.certified, 1, 'certified');
    assertEqual(r.stats.observed, 1, 'observed');
    assertEqual(r.stats.inferred, 1, 'inferred');
    assertEqual(r.stats.legacy, 1, 'legacy');
    assertEqual(r.stats.segments, 4, 'total');
  });

  it('empty segments array does not throw', () => {
    const r = lintIndex({ segments: [] }, allFilesExist);
    assertEqual(r.errors.length, 0, 'errors on empty');
    assertEqual(r.warnings.length, 0, 'warnings on empty');
  });

  it('missing segments key does not throw', () => {
    const r = lintIndex({}, allFilesExist);
    assertEqual(r.stats.segments, 0, 'segments on index without segments key');
  });

  it('malformed supersedes (non-array) is ignored, not crashed on', () => {
    const index = { segments: [{ id: 's1', file: 'a.md', supersedes: 's0' }] };
    const r = lintIndex(index, allFilesExist);
    assertEqual(r.errors.length, 0, 'non-array supersedes should be ignored');
  });

  it('date parsing failure does not throw', () => {
    const index = { segments: [{ id: 's1', file: 'a.md', tier: 'HOT', lastUpdated: 'not-a-date' }] };
    const r = lintIndex(index, allFilesExist);
    assert(!hasCode(r.warnings, 'W4'), 'invalid date should not trigger W4');
  });
});

// ============================================
// SUITE 6 — Rebuild preservation (regression: rebuild used to erase metadata)
// ============================================
describe('[Suite 6/6] Rebuild must preserve the epistemic layer', () => {
  const fs = require('fs');
  const os = require('os');
  const { execFileSync } = require('child_process');

  // rebuild() resolves its workspace at module load time, so it cannot be
  // redirected by setting process.env after require. The only honest way to
  // test it against a temp workspace is a child process with the env set.
  const REBUILD_SCRIPT = path.resolve(__dirname, '..', 'scripts', 'ssc-rebuild.cjs');

  it('rebuild preserves confidence/certifiedBy/supersedes/lastUsedIn/correctionCount', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ssc-rebuild-test-'));
    const memDir = path.join(tmp, 'memory');
    const segDir = path.join(memDir, 'segments');
    const dailyDir = path.join(memDir, 'daily');
    fs.mkdirSync(segDir, { recursive: true });
    fs.mkdirSync(dailyDir, { recursive: true });

    fs.writeFileSync(path.join(segDir, 's900-test.md'), '# s900 test\n\nA fact worth keeping.\n', 'utf8');

    const seeded = {
      version: '4.0',
      segments: [
        {
          id: 's900-test',
          file: 'memory/segments/s900-test.md',
          summary: 'seeded summary',
          tier: 'HOT',
          weight: 1.5,
          keywords: ['seeded'],
          tags: ['test'],
          accessCount: 4,
          confidence: 'certified',
          certifiedBy: 'Renata',
          certifiedAt: '2026-11-01T10:00:00.000Z',
          supersedes: ['s899-old'],
          supersededBy: [],
          lastUsedIn: ['task-xyz'],
          correctionCount: 2,
        },
      ],
      daily: [],
    };
    fs.writeFileSync(path.join(memDir, 'index.json'), JSON.stringify(seeded, null, 2), 'utf8');

    try {
      execFileSync(process.execPath, [REBUILD_SCRIPT], {
        env: { ...process.env, OPENCLAW_WORKSPACE: tmp },
        stdio: 'pipe',
      });
    } catch (err) {
      throw new Error(`rebuild failed to run: ${err.message}`);
    }

    const after = JSON.parse(fs.readFileSync(path.join(memDir, 'index.json'), 'utf8'));
    const seg = after.segments.find((s) => s.id === 's900-test');
    assert(!!seg, 'segment vanished after rebuild');

    assertEqual(seg.confidence, 'certified', 'confidence erased by rebuild');
    assertEqual(seg.certifiedBy, 'Renata', 'certifiedBy erased by rebuild');
    assertEqual(seg.certifiedAt, '2026-11-01T10:00:00.000Z', 'certifiedAt erased by rebuild');
    assertEqual(seg.correctionCount, 2, 'correctionCount erased by rebuild');
    assert(Array.isArray(seg.supersedes) && seg.supersedes[0] === 's899-old', 'supersedes erased by rebuild');
    assert(Array.isArray(seg.lastUsedIn) && seg.lastUsedIn[0] === 'task-xyz', 'lastUsedIn erased by rebuild');
    assertEqual(seg.tier, 'HOT', 'tier was reset by rebuild');
    assertEqual(seg.weight, 1.5, 'weight was reset by rebuild');

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(46));
if (failed === 0) {
  console.log(`   ALL TESTS PASSED: ${passed}/${passed} assertions`);
} else {
  console.log(`   FAILED: ${failed} of ${passed + failed} assertions`);
  for (const f of failures) console.log(`   - ${f.name}: ${f.message}`);
}
console.log('='.repeat(46) + '\n');

process.exit(failed === 0 ? 0 : 1);
