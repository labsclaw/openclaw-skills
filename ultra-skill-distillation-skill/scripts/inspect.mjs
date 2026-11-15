// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_FILES = 500;
const MAX_BYTES = 5 * 1024 * 1024;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const portable = name => name.split(path.sep).join('/');

function withoutFences(text) {
  let fence;
  return text.split(/\r?\n/).map(line => {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.char}{${fence.length},}\\s*$`).test(line)) fence = undefined;
      return '';
    }
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (opening && !(opening[1][0] === '`' && opening[2].includes('`'))) {
      fence = { char: opening[1][0], length: opening[1].length };
      return '';
    }
    return line;
  }).join('\n');
}

async function inspect(root) {
  const files = [];
  const problems = [];
  async function walk(directory) {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const info = await lstat(absolute);
      if (info.isSymbolicLink()) throw new Error(`Symbolic link not allowed: ${absolute}`);
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      if (info.isDirectory()) await walk(absolute);
      else if (info.isFile()) {
        if (files.length >= MAX_FILES) throw new Error(`More than ${MAX_FILES} files: ${root}`);
        if (info.size > MAX_BYTES) throw new Error(`File exceeds ${MAX_BYTES} bytes: ${absolute}`);
        const bytes = await readFile(absolute);
        if (bytes.length > MAX_BYTES) throw new Error(`File grew beyond limit: ${absolute}`);
        const relative = portable(path.relative(root, absolute));
        files.push({ path: relative, bytes: bytes.length, sha256: sha(bytes) });
        if (path.extname(relative).toLowerCase() === '.md') {
          // Deliberately limited to inline Markdown links; see evaluation.md.
          const text = withoutFences(bytes.toString('utf8'));
          for (const match of text.matchAll(/!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+["'][^\n]*["'])?\s*\)/g)) {
            let href = match[1].replace(/^<|>$/g, '');
            if (/^(?:file:|[a-z]:)/i.test(href)) {
              problems.push(`${relative}: local file URI or drive path not allowed ${href}`);
              continue;
            }
            if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href) && !/^[a-z]:[\\/]/i.test(href)) continue;
            try { href = decodeURIComponent(href.split(/[?#]/)[0]); }
            catch { problems.push(`${relative}: malformed link ${href}`); continue; }
            if (!href) continue;
            const destination = path.resolve(directory, href);
            const delta = path.relative(root, destination);
            if (path.isAbsolute(href) || /^[a-z]:[\\/]/i.test(href) || delta === '..' || delta.startsWith(`..${path.sep}`) || path.isAbsolute(delta)) {
              problems.push(`${relative}: link outside package ${href}`);
              continue;
            }
            try { await lstat(destination); }
            catch { problems.push(`${relative}: missing link ${href}`); }
          }
        }
      } else throw new Error(`Non-regular entry not allowed: ${absolute}`);
    }
  }
  await walk(root);
  if (!files.some(file => file.path === 'SKILL.md')) throw new Error(`Missing SKILL.md: ${root}`);
  const entry = files.find(file => file.path === 'SKILL.md');
  return {
    digest: `sha256:${sha(JSON.stringify(files.map(({ path: name, sha256 }) => [name, sha256])))}`,
    entryBytes: entry.bytes,
    packageBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    fileCount: files.length,
    files,
    problems,
  };
}

async function checkedRoot(value) {
  const absolute = path.resolve(value);
  const info = await lstat(absolute);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Expected a non-symlink directory: ${absolute}`);
  // Reject symlink/junction ancestors as well as the final component.
  for (let current = absolute; ; current = path.dirname(current)) {
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink ancestor not allowed: ${current}`);
    if (path.dirname(current) === current) break;
  }
  return realpath(absolute);
}

export async function compare(originalPath, candidatePath) {
  if (!originalPath || !candidatePath) throw new Error('Usage: node inspect.mjs <original-directory> <candidate-directory>');
  const originalRoot = await checkedRoot(originalPath);
  const candidateRoot = await checkedRoot(candidatePath);
  const delta = path.relative(originalRoot, candidateRoot);
  const reverse = path.relative(candidateRoot, originalRoot);
  const isChild = value => value !== '..' && !value.startsWith(`..${path.sep}`) && !path.isAbsolute(value);
  if (isChild(delta) || isChild(reverse)) throw new Error('Original and candidate must be separate, non-overlapping directories');
  const original = await inspect(originalRoot);
  const candidate = await inspect(candidateRoot);
  const before = new Set(original.files.map(file => file.path));
  const after = new Set(candidate.files.map(file => file.path));
  const problems = [...original.problems.map(item => `original: ${item}`), ...candidate.problems.map(item => `candidate: ${item}`)];
  const result = {
    schemaVersion: 1,
    semanticVerdict: 'not-evaluated',
    original,
    candidate,
    entryBytesDelta: candidate.entryBytes - original.entryBytes,
    packageBytesDelta: candidate.packageBytes - original.packageBytes,
    removedFiles: [...before].filter(name => !after.has(name)),
    addedFiles: [...after].filter(name => !before.has(name)),
    problems,
  };
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node inspect.mjs <original-directory> <candidate-directory>');
    const result = await compare(process.argv[2], process.argv[3]);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.problems.length) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
