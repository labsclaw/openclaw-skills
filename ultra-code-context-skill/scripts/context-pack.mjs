// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 LabsClaw contributors
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const HASH = /^[a-f0-9]{64}$/;
const fail = message => { throw new Error(message); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const encode = value => JSON.stringify(value, null, 2) + '\n';
const bytes = value => Buffer.byteLength(encode(value), 'utf8');
const scoreOK = score => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1;
const inside = (root, target) => { const rel = path.relative(root, target); return rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
const equivalent = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
async function jsonFile(filename) {
  const data = await fs.readFile(filename);
  if (data.length > MAX_FILE_BYTES) fail('JSON input exceeds 2 MiB limit');
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data)); }
  catch { fail('Invalid UTF-8 JSON input'); }
}
function candidate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !ID.test(raw.id)) fail('Invalid candidate ID');
  if (typeof raw.path !== 'string' || !raw.path || raw.path.includes('\0') || raw.path.includes('\\') || raw.path.includes(':') || path.posix.isAbsolute(raw.path) || raw.path.split('/').some(p => p === '..' || p === '.' || !p)) fail('Candidate path must be normalized repo-relative, without traversal');
  if (!Number.isSafeInteger(raw.startLine) || !Number.isSafeInteger(raw.endLine) || raw.startLine < 1 || raw.endLine < raw.startLine) fail('Invalid candidate line range');
  if (typeof raw.required !== 'boolean') fail('Candidate required must be boolean');
  if (raw.score !== undefined && !scoreOK(raw.score)) fail('Invalid candidate base score');
  return { id: raw.id, path: raw.path, startLine: raw.startLine, endLine: raw.endLine, required: raw.required, score: raw.score ?? 0 };
}
function candidates(raw) {
  if (!Array.isArray(raw)) fail('Candidates must be an array');
  const entries = raw.map(candidate), ids = new Set();
  for (const entry of entries) { if (ids.has(entry.id)) fail('Duplicate candidate ID'); ids.add(entry.id); }
  return entries;
}
async function rootPath(repo) {
  const root = await fs.realpath(repo);
  if (!(await fs.stat(root)).isDirectory()) fail('Repo must be a directory');
  return root;
}
async function source(root, entry, cache) {
  const cached = cache?.get(entry.path);
  if (cached) {
    if (entry.endLine > cached.lines.length) fail('Candidate line range exceeds source');
    return { absolute: cached.absolute, sha256: cached.sha256, content: cached.lines.slice(entry.startLine - 1, entry.endLine).join('') };
  }
  const absolute = await fs.realpath(path.join(root, ...entry.path.split('/')));
  if (!inside(root, absolute)) fail('Source resolves outside repo');
  const stat = await fs.stat(absolute);
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) fail('Source must be a regular file no larger than 2 MiB');
  const buffer = await fs.readFile(absolute);
  if (buffer.length > MAX_FILE_BYTES || buffer.includes(0)) fail('Binary or oversized source rejected');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { fail('Source must be UTF-8 text'); }
  // C0 control characters other than line separators and tabs indicate binary data.
  if (/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) fail('Binary source rejected');
  const lines = text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) ?? [];
  if (lines.at(-1) === '') lines.pop();
  if (entry.endLine > lines.length) fail('Candidate line range exceeds source');
  const sha256 = hash(buffer);
  cache?.set(entry.path, { absolute, sha256, lines });
  return { absolute, sha256, content: lines.slice(entry.startLine - 1, entry.endLine).join('') };
}
function descriptor(entry, sha256) {
  const ref = 'sha256:' + hash(`${entry.path}\0${entry.startLine}\0${entry.endLine}\0${sha256}`);
  return { ...entry, sha256, ref };
}
function budget(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) fail('Budget must be a positive integer byte count');
  return n;
}
// Resolve existing ancestors too, so aliases through symlinked output directories are caught.
async function canonical(filename) {
  const resolved = path.resolve(filename);
  try { return await fs.realpath(resolved); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const parent = path.dirname(resolved);
    if (parent === resolved) throw error;
    return path.join(await canonical(parent), path.basename(resolved));
  }
}
async function protectOutputs(outputs, protectedFiles) {
  const destinations = await Promise.all(outputs.map(canonical));
  const protectedPaths = await Promise.all(protectedFiles.filter(Boolean).map(canonical));
  if (equivalent(destinations[0], destinations[1]) || destinations.some(d => protectedPaths.some(p => equivalent(d, p)))) fail('Output would overwrite source, input, or another output');
  // A hardlink has a distinct realpath but aliases the same source inode.
  const existing = await Promise.all([...destinations, ...protectedPaths].map(p => fs.stat(p).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e))));
  for (let i = 0; i < destinations.length; i++) for (let j = 0; j < existing.length; j++) {
    if (i !== j && existing[i] && existing[j] && existing[i].dev === existing[j].dev && existing[i].ino === existing[j].ino) fail('Output aliases a protected file');
  }
}
export async function pack({ repo, input, out, budgetBytes, scores }) {
  const limit = budget(budgetBytes), root = await rootPath(repo), data = await jsonFile(input);
  if (data?.schemaVersion !== 1 || typeof data.task !== 'string') fail('Expected schemaVersion 1 and task string');
  let entries = candidates(data.candidates);
  const warnings = [];
  let ranking = 'base-score';
  if (scores) {
    try {
      const overrides = await jsonFile(scores), known = new Set(entries.map(e => e.id)), seen = new Set();
      if (!Array.isArray(overrides)) fail('Scores must be an array');
      for (const item of overrides) {
        if (!item || !known.has(item.id) || seen.has(item.id) || !scoreOK(item.score)) fail('Invalid scores');
        seen.add(item.id);
      }
      const map = new Map(overrides.map(e => [e.id, e.score]));
      entries = entries.map(e => ({ ...e, score: map.get(e.id) ?? e.score }));
      ranking = 'external-scores-with-base-fallback';
    } catch { warnings.push('Invalid or unreadable external scores; all base scores retained.'); }
  }
  entries.sort((a, b) => Number(b.required) - Number(a.required) || b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const loaded = [], sourceCache = new Map();
  for (const entry of entries) {
    const file = await source(root, entry, sourceCache);
    loaded.push({ descriptor: descriptor(entry, file.sha256), content: file.content, absolute: file.absolute });
  }
  const manifest = { schemaVersion: 1, task: data.task, contentOrigin: 'untrusted-source', ranking, warnings, entries: loaded.map(e => e.descriptor) };
  if (bytes(manifest) > MAX_FILE_BYTES) fail('Manifest exceeds 2 MiB read limit; request a narrower query');
  const manifestPath = out.endsWith('.json') ? out.slice(0, -5) + '.manifest.json' : out + '.manifest.json';
  await protectOutputs([out, manifestPath], [input, scores, ...loaded.map(e => e.absolute)]);
  const packet = { schemaVersion: 1, task: data.task, contentOrigin: 'untrusted-source', ranking, warnings, selected: [], deferred: [] };
  for (const item of loaded) {
    if (item.descriptor.required) packet.selected.push({ ...item.descriptor, content: item.content });
    else packet.deferred.push({ ...item.descriptor, reason: 'budget' });
  }
  if (bytes(packet) > limit) fail('Required content or reference metadata exceeds budget; request a narrower query');
  for (const item of loaded.filter(e => !e.descriptor.required)) {
    const deferred = packet.deferred;
    packet.deferred = deferred.filter(e => e.id !== item.descriptor.id);
    packet.selected.push({ ...item.descriptor, content: item.content });
    if (bytes(packet) > limit) { packet.selected.pop(); packet.deferred = deferred; }
  }
  // All validation and budget checks precede the first write. Stage both payloads first.
  const staged = [];
  try {
    for (const [filename, payload] of [[out, packet], [manifestPath, manifest]]) {
      const temp = path.resolve(filename) + `.tmp-${process.pid}-${staged.length}`;
      await fs.writeFile(temp, encode(payload), { flag: 'wx' });
      staged.push({ temp, filename });
    }
    for (const item of staged) await fs.rename(item.temp, item.filename);
  } finally { for (const item of staged) await fs.unlink(item.temp).catch(() => {}); }
  return { selected: packet.selected.length, deferred: packet.deferred.length, bytes: bytes(packet), budgetBytes: limit, manifest: manifestPath, warnings };
}
export async function read({ repo, manifest: filename, id, budgetBytes }) {
  const root = await rootPath(repo), limit = budget(budgetBytes), data = await jsonFile(filename);
  if (data?.schemaVersion !== 1 || typeof data.task !== 'string') fail('Invalid manifest schema');
  const entries = candidates(data.entries);
  for (let i = 0; i < entries.length; i++) {
    if (!HASH.test(data.entries[i].sha256 ?? '') || data.entries[i].ref !== descriptor(entries[i], data.entries[i].sha256).ref) fail('Invalid manifest hash or reference');
  }
  const raw = data.entries.find(e => e.id === id || e.ref === id);
  if (!raw) fail('Unknown reference ID');
  const entry = candidate(raw);
  let file;
  try { file = await source(root, entry); } catch { fail('Stale or unavailable source; regenerate the packet'); }
  if (file.sha256 !== raw.sha256) fail('Stale source hash; regenerate the packet');
  const result = { schemaVersion: 1, task: data.task, contentOrigin: 'untrusted-source', entry: { ...descriptor(entry, file.sha256), content: file.content } };
  if (bytes(result) > limit) fail('Recovered entry exceeds budget; request a narrower range');
  return result;
}
function args(argv) {
  const [command, ...rest] = argv;
  const allowed = command === 'pack' ? ['repo', 'input', 'out', 'budget-bytes', 'scores'] : command === 'read' ? ['repo', 'manifest', 'id', 'budget-bytes'] : fail('Expected pack or read command');
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.startsWith('--') ? rest[i].slice(2) : '';
    if (!allowed.includes(key) || options[key] !== undefined || rest[i + 1] === undefined || rest[i + 1].startsWith('--')) fail('Unknown, duplicate, or incomplete flag');
    options[key] = rest[i + 1];
  }
  for (const key of allowed.filter(k => k !== 'scores')) if (options[key] === undefined) fail(`Missing --${key}`);
  return { command, options: { ...options, budgetBytes: options['budget-bytes'] } };
}
if (process.argv[1] && equivalent(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) {
  try {
    const { command, options } = args(process.argv.slice(2));
    const result = command === 'pack' ? await pack(options) : await read(options);
    process.stdout.write(encode(result));
  } catch (error) {
    const message = error.code ? `Filesystem operation failed (${error.code})` : error.message;
    process.stderr.write(`context-pack: ${message}\n`);
    process.exitCode = 1;
  }
}
