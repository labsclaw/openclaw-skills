#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function findPowerShell() {
  for (const command of ['pwsh', 'powershell']) {
    const probe = spawnSync(command, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], { encoding: 'utf8' });
    if (probe.status === 0) return command;
  }
  return null;
}

const powerShell = findPowerShell();
if (!powerShell) {
  console.log('SKIP test-setup: PowerShell unavailable');
  process.exit(0);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ultra-memory-setup-'));
const setup = path.resolve(__dirname, '..', 'scripts', 'setup.ps1');
try {
  const result = spawnSync(powerShell, ['-NoProfile', '-File', setup, '-Force'], {
    encoding: 'utf8',
    env: { ...process.env, OPENCLAW_WORKSPACE: root },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const required = [
    'memory/ssc-router.ps1',
    'scripts/ssc-router.cjs',
    'scripts/ssc-hybrid.cjs',
    'scripts/ssc-crag.cjs',
    'scripts/ssc-vec-rebuild.cjs',
    'scripts/ssc-vector-manifest.cjs',
    'scripts/memory-classify.cjs',
    'scripts/pre-compact-guard.cjs',
  ];
  for (const relative of required) assert.ok(fs.existsSync(path.join(root, relative)), `missing ${relative}`);
  const stats = spawnSync(process.execPath, [path.join(root, 'scripts', 'ssc-router.cjs'), 'stats'], {
    encoding: 'utf8',
    env: { ...process.env, OPENCLAW_WORKSPACE: root },
  });
  assert.equal(stats.status, 0, stats.stderr);
  assert.match(stats.stdout, /SSC Router v4\.1/);
  console.log('PASS test-setup');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
