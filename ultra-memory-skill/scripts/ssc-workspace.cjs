'use strict';
const fs = require('node:fs');
const path = require('node:path');
function resolveWorkspace(startDir) {
  // An explicit scope is authoritative, including a typo. Never fall through.
  if (process.env.OPENCLAW_WORKSPACE !== undefined) {
    const root = path.resolve(process.env.OPENCLAW_WORKSPACE);
    if (!process.env.OPENCLAW_WORKSPACE || !fs.existsSync(path.join(root, 'memory')) ||
        !fs.statSync(path.join(root, 'memory')).isDirectory()) {
      throw new Error('Invalid OPENCLAW_WORKSPACE: expected an explicit workspace with memory/');
    }
    return root;
  }
  let dir = path.resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'memory', 'index.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Cannot locate workspace. Set OPENCLAW_WORKSPACE explicitly.');
}
module.exports = { resolveWorkspace };
