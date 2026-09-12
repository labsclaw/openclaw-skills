#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const workspace = process.env.OPENCLAW_WORKSPACE || path.resolve(__dirname, '..', '..', '..');
const router = path.resolve(__dirname, '..', 'scripts', 'ssc-router.cjs');
const indexPath = path.join(workspace, 'memory', 'index.json');
const before = fs.readFileSync(indexPath, 'utf8');

function run(args) {
  const result = spawnSync(process.execPath, [router, ...args], {
    encoding: 'utf8',
    env: { ...process.env, OPENCLAW_WORKSPACE: workspace },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

const prefixFlags = run(['--hybrid', 'query', 'heartbeat', '--no-vector', '--dry-run', '--json']);
assert.equal(prefixFlags.query, 'heartbeat');
assert.equal(prefixFlags.strategy, 'bm25-only');

const suffixFlags = run(['query', '--hybrid', 'heartbeat', '--no-vector', '--dry-run', '--json']);
assert.equal(suffixFlags.query, 'heartbeat');
assert.equal(suffixFlags.strategy, 'bm25-only');

assert.equal(fs.readFileSync(indexPath, 'utf8'), before, '--dry-run must preserve index.json');
console.log('PASS test-ssc-cli');
