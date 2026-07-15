#!/usr/bin/env node
/**
 * Tests for ultra-memory-skill-distilled-final.md
 * Validates completeness against the original 1165-line skill.
 */

const fs = require('fs');
const path = require('path');

const DISTILLED = fs.readFileSync(
  path.resolve(__dirname, '..', 'ultra-memory-skill-distilled-final.md'),
  'utf-8'
);

const ORIGINAL = fs.readFileSync(
  path.resolve(__dirname, '..', 'SKILL.md.pre-distill-backup'),
  'utf-8'
);

// ============================================
// TEST FRAMEWORK
// ============================================

let passed = 0;
let failed = 0;

function describe(name, fn) {
  console.log(`\n  ${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`    ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`    ❌ ${name}`);
    console.log(`       ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertIncludes(text, search, msg) {
  if (!text.includes(search)) throw new Error(`${msg || 'assertIncludes'}: "${search.slice(0, 60)}" not found`);
}

function assertNotIncludes(text, search, msg) {
  if (text.includes(search)) throw new Error(`${msg || 'assertNotIncludes'}: "${search.slice(0, 60)}" should not be present`);
}

// ============================================
// TESTS
// ============================================

console.log('\n🧪 ultra-memory-skill-distilled — Completeness Tests\n');

// --- Structure ---
describe('Line count', () => {
  const lines = DISTILLED.split('\n').length;
  it(`under 400 lines (got ${lines})`, () => {
    assert(lines < 400, `Expected < 400, got ${lines}`);
  });
  it(`over 150 lines (not too aggressive)`, () => {
    assert(lines > 150, `Expected > 150, got ${lines}`);
  });
});

// --- Core sections present ---
describe('Core sections', () => {
  const sections = [
    'SSC Router',
    'Tiered Storage',
    'Staleness Grading',
    'Memory Decay',
    'What to Persist',
    'Learning Signals',
    'Self-Reflection Protocol',
    'Unknown Detection',
    'Namespace Priority',
    'Anti-Patterns',
    'Verification',
    'When NOT to Use',
    'When to Use',
    'Quick Reference',
  ];
  for (const s of sections) {
    it(`contains "${s}"`, () => {
      assertIncludes(DISTILLED, s, `Missing section: ${s}`);
    });
  }
});

// --- Sections from MiniMax that we pulled in ---
describe('MiniMax contributions', () => {
  it('has "When to Use" before "When NOT to Use"', () => {
    const whenUse = DISTILLED.indexOf('## When to Use');
    const whenNot = DISTILLED.indexOf('## When NOT to Use');
    assert(whenUse >= 0, '"When to Use" missing');
    assert(whenNot >= 0, '"When NOT to Use" missing');
    assert(whenUse < whenNot, '"When to Use" should come before "When NOT to Use"');
  });

  it('has Replay Briefings', () => {
    assertIncludes(DISTILLED, 'Replay Briefings');
  });

  it('has Promotion Cheat-Sheet', () => {
    assertIncludes(DISTILLED, 'Promotion Cheat-Sheet');
  });

  it('has Annual Maintenance', () => {
    assertIncludes(DISTILLED, 'Annual Maintenance');
  });

  it('has TL;DR at the end', () => {
    const lines = DISTILLED.split('\n');
    const last10 = lines.slice(-10).join('\n');
    assertIncludes(last10, 'TL;DR', 'TL;DR should be in the last 10 lines');
  });
});

// --- SSC Router preserved ---
describe('SSC Router integrity', () => {
  it('has score formula', () => {
    assertIncludes(DISTILLED, 'keyword_hits');
  });

  it('has "no LLM" claim', () => {
    assertIncludes(DISTILLED, 'No LLM');
  });

  it('has verification commands', () => {
    assertIncludes(DISTILLED, 'Test-Path');
  });
});

// --- Staleness grades ---
describe('Staleness Grading', () => {
  const grades = ['Fresh', 'Current', 'Aging', 'Stale', 'Historical'];
  for (const g of grades) {
    it(`has grade "${g}"`, () => {
      assertIncludes(DISTILLED, g, `Missing grade: ${g}`);
    });
  }
});

// --- Memory Decay ---
describe('Memory Decay', () => {
  it('has formula with 0.4, 0.3, 0.3', () => {
    assertIncludes(DISTILLED, '0.4');
    assertIncludes(DISTILLED, '0.3');
  });

  it('has threshold values (< 0.1, < 0.3, >= 0.5)', () => {
    assertIncludes(DISTILLED, '< 0.1');
    assertIncludes(DISTILLED, '< 0.3');
    assertIncludes(DISTILLED, '≥ 0.5');
  });
});

// --- Learning Signals ---
describe('Learning Signals', () => {
  it('has correction triggers', () => {
    assertIncludes(DISTILLED, 'corrections.md');
  });

  it('has 3x promotion rule', () => {
    assertIncludes(DISTILLED, '3x');
  });

  it('has "ignore" list', () => {
    assertIncludes(DISTILLED, 'Ignore');
  });
});

// --- Anti-patterns ---
describe('Anti-Patterns', () => {
  it('has at least 10 anti-patterns', () => {
    const matches = DISTILLED.match(/\| \d+ \|/g) || [];
    assert(matches.length >= 10, `Expected >= 10 numbered items, got ${matches.length}`);
  });

  it('mentions "live state wins"', () => {
    assertIncludes(DISTILLED.toLowerCase(), 'live state wins');
  });
});

// --- Verification commands ---
describe('Verification commands', () => {
  it('has Test-Path', () => {
    assertIncludes(DISTILLED, 'Test-Path');
  });

  it('has Test-NetConnection', () => {
    assertIncludes(DISTILLED, 'Test-NetConnection');
  });

  it('has curl', () => {
    assertIncludes(DISTILLED, 'curl');
  });
});

// --- Bug check: no invented structures ---
describe('Bug check — no invented structures', () => {
  it('no "Three memory types" section', () => {
    assertNotIncludes(DISTILLED, 'Three memory types', 'MiniMax bug: invented section should be removed');
  });

  it('no semantic-patterns.json reference', () => {
    assertNotIncludes(DISTILLED, 'semantic-patterns.json', 'MiniMax bug: invented file');
  });

  it('no episodic/ directory reference', () => {
    assertNotIncludes(DISTILLED, 'episodic/', 'MiniMax bug: invented directory');
  });

  it('no working/current_session.json reference', () => {
    assertNotIncludes(DISTILLED, 'working/current_session.json', 'MiniMax bug: invented file');
  });
});

// --- Token savings ---
describe('Key claims preserved', () => {
  it('91.4% token savings', () => {
    assertIncludes(DISTILLED, '91.4%');
  });

  it('0 LLM calls', () => {
    assertIncludes(DISTILLED, '0 LLM');
  });
});

// --- Namespace Priority ---
describe('Namespace Priority', () => {
  it('has priority table', () => {
    assertIncludes(DISTILLED, 'project:{name}');
    assertIncludes(DISTILLED, 'domain:{type}');
    assertIncludes(DISTILLED, 'global');
  });
});

// --- Quick Reference ---
describe('Quick Reference', () => {
  it('has memory segments path', () => {
    assertIncludes(DISTILLED, 'segments/s00N');
  });

  it('has corrections.md', () => {
    assertIncludes(DISTILLED, 'corrections.md');
  });

  it('has hot.md', () => {
    assertIncludes(DISTILLED, 'hot.md');
  });

  it('has index.json', () => {
    assertIncludes(DISTILLED, 'index.json');
  });
});

// ============================================
// SUMMARY
// ============================================

console.log(`\n${'─'.repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'─'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
