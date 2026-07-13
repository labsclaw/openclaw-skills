#!/usr/bin/env node
/**
 * CDP Bridge Integration Test — ultra-chrome-assistente-skill
 *
 * Verifies the REAL bridge transport: Chrome DevTools Protocol (port 9222),
 * driven by extension/chromeAssistente.js. (chrome.sockets is unavailable in
 * stable desktop Chrome, so the bridge uses CDP.)
 *
 *   1. Launch Chrome with --remote-debugging-port=9222 + extension loaded
 *   2. Use chromeAssistente SDK to connect via CDP
 *   3. navigateAndExtract(example.com) -> snapshot with agentic-purpose-ids
 *   4. click / fill work on the live DOM
 *
 * Requirements: Chrome installed, ws package (npm install ws)
 * Usage: node tests/test_cdp_bridge.js
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const ChromeAssistente = require('../extension/chromeAssistente.js');

const CHROME_PATH = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const EXTENSION_PATH = path.resolve(__dirname, '..', 'extension');
const CDP_PORT = 9222;
const PROFILE_DIR = path.join(process.env.TEMP || '/tmp', `openclaw-cdp-${Date.now()}`);

let chromeProcess = null;
let passed = 0, failed = 0;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET' }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.end();
  });
}

function startChrome() {
  chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE_DIR}`,
    `--load-extension=${EXTENSION_PATH}`, '--no-first-run', '--no-default-browser-check',
  ], { stdio: 'ignore', detached: true });
  return new Promise((resolve, reject) => {
    let tries = 0;
    const t = setInterval(async () => {
      try { await httpGet(`http://localhost:${CDP_PORT}/json/version`); clearInterval(t); resolve(); }
      catch { if (++tries > 15) { clearInterval(t); reject(new Error('Chrome did not start')); } }
    }, 1000);
  });
}

function stopChrome() {
  if (chromeProcess) { try { chromeProcess.kill(); } catch {} }
  try { fs.rmSync(PROFILE_DIR, { recursive: true, force: true }); } catch {}
}

function assert(cond, name) {
  if (cond) { console.log(`    ✅ ${name}`); passed++; }
  else { console.log(`    ❌ ${name}`); failed++; }
}

async function run() {
  console.log('\n🧪 ultra-chrome-assistente-skill — CDP Bridge Test\n');
  await startChrome();
  console.log('  Chrome started ✅');
  await new Promise(r => setTimeout(r, 2500));

  console.log('\n  chromeAssistente.connect (CDP)');
  const ca = new ChromeAssistente();
  const health = await ca.connect({ port: CDP_PORT });
  console.log('    ✅ connected via CDP');
  assert(health.transport === 'cdp', 'healthCheck reports transport=cdp');

  console.log('\n  navigateAndExtract via CDP bridge');
  const snap = await ca.navigateAndExtract({ url: 'https://example.com' });
  assert(!!snap, 'navigateAndExtract returns a snapshot');
  assert(Array.isArray(snap.elements), 'snapshot has elements array');
  assert(snap.elements.length > 0, `snapshot found ${snap.elements.length} interactive element(s)`);
  assert(snap.elements.every(e => e.id && e.id.startsWith('elem_')), 'every element has agentic-purpose-id');

  console.log('\n  detectChallenge (should be empty on example.com)');
  const challenges = await ca.detectChallenge();
  assert(Array.isArray(challenges), 'detectChallenge returns array');
  assert(challenges.length === 0, 'no false-positive challenge on example.com');

  console.log('\n  captureAuth shape');
  const auth = await ca.captureAuth({});
  assert(auth && typeof auth === 'object', 'captureAuth returns object');

  await ca.ws.close();
  stopChrome();

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${'─'.repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => { console.error('\n❌ Fatal:', err.message); stopChrome(); process.exit(1); });
