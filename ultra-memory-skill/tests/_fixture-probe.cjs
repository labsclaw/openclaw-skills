#!/usr/bin/env node
/**
 * _fixture-probe.cjs — detects whether workspace-specific test fixtures exist.
 *
 * Some assertions in test-ssc-v4.cjs were written against the original author's
 * workspace (C:\Users\ClawLabs). They fail on any other workspace not because the
 * code is wrong, but because the data is absent. Those assertions must SKIP with a
 * clear message instead of reporting a false failure — a false failure is worse
 * than a skip, because it hides real regressions in the noise.
 *
 * Exports a function returning flags for each fixture the suite depends on.
 */

const fs = require('fs');
const path = require('path');

const FIXTURES = {
  // Tier 1.5 dedicated report that must outrank a historical daily entry
  hasAwesomeFixture: { segmentId: 'awesome-llm-apps-luna-analysis', tier: 1.5 },
  // Historical daily entry that must remain retrievable
  hasDailyFixture: { dailyId: '2026-07-21' },
};

function loadIndex() {
  const workspaceDir =
    process.env.OPENCLAW_WORKSPACE || path.resolve(__dirname, '..', '..', '..');
  const indexPath = path.join(workspaceDir, 'memory', 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return null;
  }
}

function probe() {
  const index = loadIndex();
  const flags = { indexFound: !!index };

  if (!index) {
    flags.hasAwesomeFixture = false;
    flags.hasDailyFixture = false;
    return flags;
  }

  const segments = Array.isArray(index.segments) ? index.segments : [];
  const daily = Array.isArray(index.daily) ? index.daily : [];

  const seg = segments.find((s) => s && s.id === FIXTURES.hasAwesomeFixture.segmentId);
  flags.hasAwesomeFixture = !!seg && seg.tier === FIXTURES.hasAwesomeFixture.tier;
  flags.hasDailyFixture = daily.some((d) => d && d.id === FIXTURES.hasDailyFixture.dailyId);

  return flags;
}

module.exports = probe;
