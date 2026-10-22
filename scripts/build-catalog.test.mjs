// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 LabsClaw contributors
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('catalog check accepts CRLF materialization but rejects stale content', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'catalog-eol-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const name of ['scripts', 'catalog', 'demo']) await fs.mkdir(path.join(root, name));
  const script = path.join(root, 'scripts', 'build-catalog.mjs');
  await fs.copyFile(new URL('./build-catalog.mjs', import.meta.url), script);
  await fs.writeFile(path.join(root, 'catalog', 'registry.json'), JSON.stringify({
    schemaVersion: 1, publication: { status: 'blocked', reason: 'isolated test fixture' },
    skills: [{ name: 'demo', path: 'demo' }]
  }));
  await fs.writeFile(path.join(root, 'demo', 'SKILL.md'), '---\nname: demo\ndescription: Fixture\n---\n');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  const generated = run();
  assert.equal(generated.status, 0, generated.stderr);
  const index = path.join(root, 'catalog', 'index.json');
  const lf = await fs.readFile(index, 'utf8');
  const baseline = run('--check');
  assert.equal(baseline.status, 0, baseline.stderr);
  await fs.writeFile(index, lf.replaceAll('\n', '\r\n'));
  const crlf = run('--check');
  assert.equal(crlf.status, 0, crlf.stderr);
  await fs.writeFile(index, lf.replace('Fixture', 'Stale fixture').replaceAll('\n', '\r\n'));
  const stale = run('--check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /stale/);
});
