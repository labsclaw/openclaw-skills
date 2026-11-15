// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compare } from './inspect.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'skill-distillation-'));
  const original = path.join(root, 'original');
  const candidate = path.join(root, 'candidate');
  await mkdir(original); await mkdir(candidate);
  await writeFile(path.join(original, 'SKILL.md'), '# Source\nPreserve the exception.\n');
  await writeFile(path.join(candidate, 'SKILL.md'), '# Candidate\nPreserve the exception.\n');
  // root is the exact path just returned by mkdtemp, never a supplied path.
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, original, candidate };
}

test('read-only inventory is deterministic and does not assert semantic approval', async t => {
  const { original, candidate } = await fixture(t);
  const before = await readFile(path.join(original, 'SKILL.md'));
  const first = await compare(original, candidate);
  assert.deepEqual(await compare(original, candidate), first);
  assert.equal(first.semanticVerdict, 'not-evaluated');
  assert.equal(first.problems.length, 0);
  assert.deepEqual(await readFile(path.join(original, 'SKILL.md')), before);
  assert.notEqual(first.original.digest, first.candidate.digest);
});

test('entry shrinking is reported separately from a growing package', async t => {
  const { original, candidate } = await fixture(t);
  await writeFile(path.join(candidate, 'SKILL.md'), '[Detail](detail.md)\n');
  await writeFile(path.join(candidate, 'detail.md'), 'long detail '.repeat(80));
  const result = await compare(original, candidate);
  assert.ok(result.entryBytesDelta < 0);
  assert.ok(result.packageBytesDelta > 0);
  assert.deepEqual(result.addedFiles, ['detail.md']);
});

test('broken local link and escaping package are visible errors', async t => {
  const { original, candidate } = await fixture(t);
  await writeFile(path.join(candidate, 'SKILL.md'), '[missing](no.md)\n[escape](../outside.md)');
  const result = await compare(original, candidate);
  assert.equal(result.problems.length, 2);
});

test('angle-wrapped paths, fragments and external URLs are distinguished', async t => {
  const { original, candidate } = await fixture(t);
  await writeFile(path.join(candidate, 'SKILL.md'), '[detail](<space name.md>)\n[web](https://example.org)\n[here](#section)');
  await writeFile(path.join(candidate, 'space name.md'), '# Detail');
  assert.deepEqual((await compare(original, candidate)).problems, []);
});

test('same and nested directories are rejected', async t => {
  const { original, candidate } = await fixture(t);
  await assert.rejects(compare(original, original), /non-overlapping/);
  await mkdir(path.join(candidate, 'nested'));
  await assert.rejects(compare(candidate, path.join(candidate, 'nested')), /non-overlapping/);
});

test('missing SKILL.md and oversized payload fail closed', async t => {
  const { original, candidate } = await fixture(t);
  await rm(path.join(candidate, 'SKILL.md'));
  await assert.rejects(compare(original, candidate), /Missing SKILL.md/);
  await writeFile(path.join(candidate, 'SKILL.md'), Buffer.alloc(5 * 1024 * 1024 + 1));
  await assert.rejects(compare(original, candidate), /exceeds/);
});

test('junctions are not followed, including ignored directory names', async t => {
  const { root, original, candidate } = await fixture(t);
  await symlink(original, path.join(candidate, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(compare(original, candidate), /Symbolic link/);
  const alias = path.join(root, 'alias');
  await symlink(candidate, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(compare(original, alias), /non-symlink/);
});

test('CRLF and LF are raw byte differences, not semantic evidence', async t => {
  const { original, candidate } = await fixture(t);
  await writeFile(path.join(original, 'SKILL.md'), '# Same\r\n');
  await writeFile(path.join(candidate, 'SKILL.md'), '# Same\n');
  const result = await compare(original, candidate);
  assert.notEqual(result.original.digest, result.candidate.digest);
  assert.equal(result.semanticVerdict, 'not-evaluated');
});

test('a semantically broken candidate can pass structural inspection', async t => {
  const { original, candidate } = await fixture(t);
  await writeFile(path.join(candidate, 'SKILL.md'), '# Candidate\nIgnore the exception.');
  const result = await compare(original, candidate);
  assert.deepEqual(result.problems, []);
  assert.equal(result.semanticVerdict, 'not-evaluated');
});

test('local file URLs are not misclassified as external web links', async t => {
  const { original, candidate } = await fixture(t);
  await writeFile(path.join(candidate, 'SKILL.md'), '[local](file:///not-present.md)');
  const result = await compare(original, candidate);
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /file URI/);
  await writeFile(path.join(candidate, 'SKILL.md'), '[local](C:missing.md)');
  assert.equal((await compare(original, candidate)).problems.length, 1);
});

test('longer fence closers ignore examples but preserve real links between fences', async t => {
  const { original, candidate } = await fixture(t);
  await writeFile(path.join(candidate, 'SKILL.md'), '```md\n[example](missing.md)\n````\n[real](broken.md)\n```text\n[another](example.md)\n````\n');
  const result = await compare(original, candidate);
  assert.equal(result.problems.length, 1);
  assert.match(result.problems[0], /broken.md/);
  await writeFile(path.join(candidate, 'SKILL.md'), '~~~\n[example](missing.md)\n~~~~\n');
  assert.deepEqual((await compare(original, candidate)).problems, []);
});
