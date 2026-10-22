// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 LabsClaw contributors
import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pack, read } from './context-pack.mjs';

const cli = fileURLToPath(new URL('./context-pack.mjs', import.meta.url));
const entry = (id, file = `${id}.txt`, extra = {}) => ({ id, path: file, startLine: 1, endLine: 1, required: false, score: 0.5, ...extra });
async function fixture(t, files = { 'a.txt': 'hello\n' }, entries = [entry('a')]) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-pack-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo');
  await fs.mkdir(repo);
  for (const [name, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(repo, name)), { recursive: true });
    await fs.writeFile(path.join(repo, name), content);
  }
  const input = path.join(dir, 'candidates.json'), out = path.join(dir, 'packet.json'), manifest = path.join(dir, 'packet.manifest.json');
  await fs.writeFile(input, JSON.stringify({ schemaVersion: 1, task: 'Locate behavior', candidates: entries }));
  return { dir, repo, input, out, manifest, budgetBytes: 65536 };
}
const parse = async filename => JSON.parse(await fs.readFile(filename, 'utf8'));
async function noOutputs(f) {
  await assert.rejects(fs.access(f.out));
  await assert.rejects(fs.access(f.manifest));
}

test('multilingual content obeys exact UTF-8 budget including metadata and newline', async t => {
  const f = await fixture(t, { 'a.txt': 'Olá 世界 🦉\n' }, [entry('a', 'a.txt', { required: true })]);
  const full = await pack(f);
  const disk = await fs.readFile(f.out);
  assert.equal(full.bytes, disk.byteLength);
  assert.ok(disk.byteLength > disk.toString().length);
  assert.equal(disk.at(-1), 10);
  await pack({ ...f, budgetBytes: disk.byteLength });
  const old = await fs.readFile(f.out, 'utf8');
  await assert.rejects(pack({ ...f, budgetBytes: disk.byteLength - 1 }), /exceeds budget/);
  assert.equal(await fs.readFile(f.out, 'utf8'), old);
});

test('required content overflow fails before creating output files', async t => {
  const f = await fixture(t, { 'a.txt': 'x'.repeat(5000) }, [entry('a', 'a.txt', { required: true })]);
  await assert.rejects(pack({ ...f, budgetBytes: 1500 }), /Required content/);
  await noOutputs(f);
});

test('reference metadata overflow fails requesting a narrower query', async t => {
  const f = await fixture(t);
  await assert.rejects(pack({ ...f, budgetBytes: 100 }), /narrower query/);
  await noOutputs(f);
});

test('manifest growth beyond read limit fails before writes and preserves previous outputs', async t => {
  const count = 7000;
  const lines = Array.from({ length: count }, (_, i) => `distinct source line ${i + 1}\n`);
  const entries = lines.map((_, i) => entry(`line-${i + 1}`, 'a.txt', { startLine: i + 1, endLine: i + 1 }));
  const f = await fixture(t, { 'a.txt': lines.join('') }, entries);
  assert.ok((await fs.stat(f.input)).size < 2 * 1024 * 1024, 'real input stays within the accepted input limit');
  // Real descriptors add hashes, references, and pretty-printing. The generous
  // packet budget must not allow publication of a manifest read cannot open.
  const generous = { ...f, budgetBytes: 8 * 1024 * 1024 };
  await assert.rejects(pack(generous), /Manifest exceeds 2 MiB read limit.*narrower query/);
  await noOutputs(f);
  await fs.writeFile(f.out, 'previous packet\n');
  await fs.writeFile(f.manifest, 'previous manifest\n');
  await assert.rejects(pack(generous), /Manifest exceeds 2 MiB read limit/);
  assert.equal(await fs.readFile(f.out, 'utf8'), 'previous packet\n');
  assert.equal(await fs.readFile(f.manifest, 'utf8'), 'previous manifest\n');
});

test('deferred source is recoverable by ID and content hash reference', async t => {
  const f = await fixture(t, { 'a.txt': 'a'.repeat(5000), 'b.txt': 'b'.repeat(5000) }, [entry('a'), entry('b')]);
  const summary = await pack({ ...f, budgetBytes: 2000 });
  assert.equal(summary.deferred, 2);
  const packet = await parse(f.out), manifest = await parse(f.manifest);
  assert.equal(packet.selected.length, 0);
  assert.equal(packet.deferred[0].reason, 'budget');
  assert.ok(manifest.entries.every(e => e.sha256.length === 64 && !('content' in e)));
  const result = await read({ ...f, id: 'a' });
  assert.equal(result.entry.content, 'a'.repeat(5000));
  assert.deepEqual(await read({ ...f, id: packet.deferred[0].ref }), result);
  await assert.rejects(read({ ...f, id: 'a', budgetBytes: 100 }), /exceeds budget/);
});

for (const change of ['modified', 'deleted', 'renamed']) {
  test(`read rejects ${change} sources instead of returning stale content`, async t => {
    const f = await fixture(t);
    await pack(f);
    const filename = path.join(f.repo, 'a.txt');
    if (change === 'modified') await fs.writeFile(filename, 'changed\n');
    else if (change === 'deleted') await fs.unlink(filename);
    else await fs.rename(filename, path.join(f.repo, 'renamed.txt'));
    await assert.rejects(read({ ...f, id: 'a' }), /Stale/);
  });
}

test('whole-file hash invalidates an unchanged selected range when other lines change', async t => {
  const f = await fixture(t, { 'a.txt': 'same\nold\n' });
  await pack(f);
  await fs.writeFile(path.join(f.repo, 'a.txt'), 'same\nnew\n');
  await assert.rejects(read({ ...f, id: 'a' }), /Stale source hash/);
});

test('per-pack source reuse validates each range and does not survive the next pack', async t => {
  const f = await fixture(t, { 'a.txt': 'first\nsecond\n' }, [entry('a'), entry('b', 'a.txt', { startLine: 3, endLine: 3 })]);
  await assert.rejects(pack(f), /line range exceeds source/);
  await noOutputs(f);
  await fs.writeFile(f.input, JSON.stringify({ schemaVersion: 1, task: 'fresh snapshot', candidates: [entry('a'), entry('b', 'a.txt', { startLine: 2, endLine: 2 })] }));
  await pack(f);
  const oldHash = (await parse(f.manifest)).entries[0].sha256;
  await fs.writeFile(path.join(f.repo, 'a.txt'), 'changed\nsecond\n');
  await pack(f);
  const packet = await parse(f.out);
  assert.equal(packet.selected[0].content, 'changed\n');
  assert.notEqual(packet.selected[0].sha256, oldHash);
  assert.equal(packet.selected[1].sha256, packet.selected[0].sha256);
});

test('traversal, absolute paths, and Windows paths are rejected', async t => {
  for (const unsafe of ['../outside.txt', '/outside.txt', 'C:/outside.txt', 'dir\\file.txt', 'a/./b', 'a//b']) {
    const f = await fixture(t, undefined, [entry('a', unsafe)]);
    await assert.rejects(pack(f), /repo-relative/);
    await noOutputs(f);
  }
});

test('symlink escape is rejected when the OS permits symlinks', async t => {
  const f = await fixture(t, {}, [entry('a')]);
  const outside = path.join(f.dir, 'outside.txt');
  await fs.writeFile(outside, 'secret');
  try { await fs.symlink(outside, path.join(f.repo, 'a.txt')); }
  catch (e) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(e.code)) { t.skip('OS does not permit file symlinks'); return; } throw e; }
  await assert.rejects(pack(f), /outside repo/);
  await noOutputs(f);
});

test('duplicate and invalid IDs and ranges fail before writes', async t => {
  for (const entries of [[entry('a'), entry('a')], [entry('../a')], [entry(42)], [entry('a', 'a.txt', { startLine: 0 })], [entry('a', 'a.txt', { endLine: 2 })], [entry('a', 'a.txt', { required: 'yes' })]]) {
    const f = await fixture(t, undefined, entries);
    await assert.rejects(pack(f), /Duplicate|Invalid|exceeds source|boolean/);
    await noOutputs(f);
  }
});

test('binary, invalid UTF-8, and oversized sources are rejected', async t => {
  for (const content of [Buffer.from([0x61, 0, 0x62]), Buffer.from([0xff]), Buffer.from([0x01]), Buffer.alloc(2 * 1024 * 1024 + 1, 'x')]) {
    const f = await fixture(t, { 'a.txt': content });
    await assert.rejects(pack(f), /Binary|UTF-8|2 MiB/);
    await noOutputs(f);
  }
});

test('invalid external scores fall back as a batch, preserving all references', async t => {
  const f = await fixture(t, { 'a.txt': 'a'.repeat(5000), 'b.txt': 'b'.repeat(5000) }, [entry('a', 'a.txt', { score: 0.9 }), entry('b')]);
  const scores = path.join(f.dir, 'scores.json');
  for (const overrides of [[{ id: 'a', score: 0.1 }, { id: 'missing', score: 1 }], [{ id: 'b', score: 0.9 }, { id: 'b', score: 0.8 }], [{ id: 'a', score: 2 }], { bad: true }]) {
    await fs.writeFile(scores, JSON.stringify(overrides));
    await pack({ ...f, scores, budgetBytes: 2000 });
    const packet = await parse(f.out), manifest = await parse(f.manifest);
    assert.equal(packet.ranking, 'base-score');
    assert.equal(packet.warnings.length, 1);
    assert.equal(manifest.entries.length, 2);
    assert.equal(manifest.entries[0].score, 0.9);
    assert.deepEqual(packet.deferred.map(e => e.id), ['a', 'b']);
  }
});

test('valid scores rank optional entries, while required entries remain mandatory', async t => {
  const f = await fixture(t, { 'a.txt': 'a', 'b.txt': 'b', 'c.txt': 'c' }, [entry('c', 'c.txt', { required: true, score: 0 }), entry('b'), entry('a')]);
  const scores = path.join(f.dir, 'scores.json');
  await fs.writeFile(scores, JSON.stringify([{ id: 'b', score: 1 }, { id: 'c', score: 0 }]));
  await pack({ ...f, scores });
  const packet = await parse(f.out);
  assert.deepEqual(packet.selected.map(e => e.id), ['c', 'b', 'a']);
  assert.equal(packet.ranking, 'external-scores-with-base-fallback');
});

test('repeat runs are deterministic; ties use stable IDs, independent of input order', async t => {
  const f = await fixture(t, { 'a.txt': 'a', 'b.txt': 'b' }, [entry('b'), entry('a')]);
  await pack(f);
  const first = await fs.readFile(f.out), manifest = await fs.readFile(f.manifest);
  await pack(f);
  assert.deepEqual(await fs.readFile(f.out), first);
  assert.deepEqual(await fs.readFile(f.manifest), manifest);
  assert.deepEqual((await parse(f.out)).selected.map(e => e.id), ['a', 'b']);
});

test('output cannot overwrite source, input, score input, or source through hardlink', async t => {
  const f = await fixture(t);
  for (const out of [path.join(f.repo, 'a.txt'), f.input]) await assert.rejects(pack({ ...f, out }), /overwrite|aliases/);
  const scores = path.join(f.dir, 'scores.json');
  await fs.writeFile(scores, '[]');
  await assert.rejects(pack({ ...f, out: scores, scores }), /overwrite|aliases/);
  const alias = path.join(f.dir, 'alias.json');
  await fs.link(path.join(f.repo, 'a.txt'), alias);
  await assert.rejects(pack({ ...f, out: alias }), /aliases/);
  assert.equal(await fs.readFile(path.join(f.repo, 'a.txt'), 'utf8'), 'hello\n');
});

test('distinct output inodes beyond Number precision do not become false aliases', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.out, 'previous packet');
  await fs.writeFile(f.manifest, 'previous manifest');
  const first = 2n ** 53n, second = first + 1n;
  assert.equal(Number(first), Number(second), 'fixture forces the precision collision on every platform');
  const identities = new Map([[await fs.realpath(f.out), first], [await fs.realpath(f.manifest), second]]);
  const realStat = fs.stat;
  t.mock.method(fs, 'stat', async (filename, options) => {
    const stat = await realStat(filename, options);
    const ino = identities.get(filename);
    if (ino !== undefined) {
      stat.dev = options?.bigint ? 999n : 999;
      stat.ino = options?.bigint ? ino : Number(ino);
    }
    return stat;
  });
  await pack(f);
  const packet = await fs.readFile(f.out), manifest = await fs.readFile(f.manifest);
  assert.equal(JSON.parse(packet).selected[0].content, 'hello\n');
  await pack(f);
  assert.deepEqual(await fs.readFile(f.out), packet);
  assert.deepEqual(await fs.readFile(f.manifest), manifest);
});

test('tampered manifest hashes and references are rejected', async t => {
  const f = await fixture(t);
  await pack(f);
  const manifest = await parse(f.manifest);
  manifest.entries[0].ref = 'sha256:' + '0'.repeat(64);
  await fs.writeFile(f.manifest, JSON.stringify(manifest));
  await assert.rejects(read({ ...f, id: 'a' }), /Invalid manifest/);
});

test('CLI pack summary, read content, and strict flags work end to end', async t => {
  const f = await fixture(t);
  const flags = ['--repo', f.repo, '--input', f.input, '--out', f.out, '--budget-bytes', '4096'];
  const packed = spawnSync(process.execPath, [cli, 'pack', ...flags], { encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  assert.equal(JSON.parse(packed.stdout).selected, 1);
  assert.ok(!packed.stdout.includes('hello'));
  const recovered = spawnSync(process.execPath, [cli, 'read', '--repo', f.repo, '--manifest', f.manifest, '--id', 'a', '--budget-bytes', '4096'], { encoding: 'utf8' });
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(JSON.parse(recovered.stdout).entry.content, 'hello\n');
  for (const extra of [['--unknown', 'x'], ['--repo', f.repo], ['--scores']]) {
    const bad = spawnSync(process.execPath, [cli, 'pack', ...flags, ...extra], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.equal(bad.stdout, '');
    assert.match(bad.stderr, /Unknown, duplicate, or incomplete flag/);
  }
});
