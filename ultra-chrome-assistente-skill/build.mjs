// build.mjs - Build step for the extension.
// - If `tsc` (TypeScript) is available, compile openclawClient.ts -> openclawClient.js
// - Otherwise the committed openclawClient.js is used as-is (already ES-module compatible)
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const ext = join(root, 'extension');

async function tryTsc() {
  try {
    execSync('npx --no-install tsc --version', { stdio: 'ignore' });
  } catch {
    console.log('[build] typescript not installed; using committed openclawClient.js');
    return false;
  }
  try {
    execSync(
      `npx tsc extension/openclawClient.ts --module esnext --target es2020 --moduleResolution bundler --outDir extension --allowJs false`,
      { cwd: root, stdio: 'inherit' }
    );
    console.log('[build] openclawClient.ts compiled -> extension/openclawClient.js');
    return true;
  } catch (e) {
    console.warn('[build] tsc failed; keeping committed openclawClient.js', e.message);
    return false;
  }
}

if (existsSync(join(ext, 'openclawClient.ts'))) {
  await tryTsc();
} else {
  console.log('[build] no openclawClient.ts; nothing to compile');
}
console.log('[build] done.');
