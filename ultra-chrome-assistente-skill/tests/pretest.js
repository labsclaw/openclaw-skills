// pretest.js — guards against the 3 critical bugs found in PR #6 review:
//  1. openclawClient.js must be CommonJS-loadable via require() (no `export` w/o type:module)
//  2. package.json must not advertise the dead WS 3032 bridge
//  3. chromeAssistente.js must not use Node-only require('ws')/require('http')
//
// Exits non-zero if any guard fails, so `npm test` aborts before running suites.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'extension');

function fail(msg) { console.error('  ❌ ' + msg); process.exit(1); }
function ok(msg) { console.log('  ✅ ' + msg); }

console.log('\n🔍 pretest — PR #6 guards\n');

// Guard 1 + 3: both SDK files must load via require() in a plain Node context.
// This exercises the *real* entry points the tests use and rejects ESM `export`
// (SyntaxError) and Node-only `require('ws')`/`require('http')` at load time.
try {
  const Client = require(path.join(EXT, 'openclawClient.js'));
  assert(typeof Client === 'function' || (Client && typeof Client.OpenClawClient === 'function'),
    'openclawClient.js should export OpenClawClient');
  ok('openclawClient.js loads via require() (CommonJS)');
} catch (e) {
  fail('openclawClient.js failed to load via require(): ' + e.message);
}

try {
  const CA = require(path.join(EXT, 'chromeAssistente.js'));
  assert(typeof CA === 'function', 'chromeAssistente.js should export ChromeAssistente');
  ok('chromeAssistente.js loads via require() (no Node-only requires)');
} catch (e) {
  fail('chromeAssistente.js failed to load via require(): ' + e.message);
}

// Guard 2: package.json description must not mention the dead WS 3032 bridge.
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (/3032|websocket bridge/i.test(pkg.description || '')) {
  fail('package.json description still advertises the dead WS 3032 bridge: "' + pkg.description + '"');
} else {
  ok('package.json description is honest (no WS 3032 claim)');
}

// Extra: no lingering require('ws') / require('http') inside the SDK files.
const caSrc = fs.readFileSync(path.join(EXT, 'chromeAssistente.js'), 'utf8');
if (/require\(\s*['"]ws['"]\s*\)|require\(\s*['"]http['"]\s*\)/.test(caSrc)) {
  fail('chromeAssistente.js still contains require("ws")/require("http")');
} else {
  ok('chromeAssistente.js uses global WebSocket/fetch (browser-safe)');
}

console.log('\n  pretest passed ✅\n');
