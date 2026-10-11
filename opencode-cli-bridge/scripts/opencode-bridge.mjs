#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const HEADLESS_ENV = {
  OPENCODE_DISABLE_EMBEDDED_WEB_UI: '1',
  OPENCODE_DISABLE_SHARE: '1',
  OPENCODE_AUTO_SHARE: '0',
  OPENCODE_DISABLE_AUTOUPDATE: '1',
  BROWSER: 'true',
};

function whichOpencode() {
  if (process.platform === 'win32') {
    const npmRoot = process.env.APPDATA ? resolve(process.env.APPDATA, 'npm') : resolve(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm');
    const exe = resolve(npmRoot, 'node_modules', 'opencode-ai', 'bin', 'opencode.exe');
    if (existsSync(exe)) return exe;
    return 'opencode';
  }
  return 'opencode';
}

function detectOMO() {
  try {
    const res = spawnSync(whichOpencode(), ['agent', 'list'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, ...HEADLESS_ENV } });
    if (res.error) return false;
    const out = (res.stdout || '') + (res.stderr || '');
    const t = out.toLowerCase();
    return t.includes('sisyphus') || t.includes('prometheus') || t.includes('atlas') || t.includes('hephaestus') || t.includes('ultraworker');
  } catch (e) { return false; }
}

function chooseAgent(requested, omo) {
  if (requested) return requested;
  if (omo) return 'Sisyphus - ultraworker';
  return 'build';
}

function main() {
  const args = process.argv.slice(2);
  const promptIdx = args.indexOf('--prompt');
  let prompt = promptIdx >= 0 ? args[promptIdx + 1] : '';
  if (!prompt) {
    for (let i = args.length - 1; i >= 0; i--) {
      if (!args[i].startsWith('--')) { prompt = args[i]; break; }
    }
  }
  const cwdIdx = args.indexOf('--cwd'); const cwd = cwdIdx >= 0 ? args[cwdIdx + 1] : process.cwd();
  const agentIdx = args.indexOf('--agent'); const reqAgent = agentIdx >= 0 ? args[agentIdx + 1] : undefined;
  const modelIdx = args.indexOf('--model'); const model = modelIdx >= 0 ? args[modelIdx + 1] : undefined;
  const timeoutIdx = args.indexOf('--timeoutSec'); const timeoutSec = timeoutIdx >= 0 ? parseInt(args[timeoutIdx + 1]) : 600;
  const sessionIdx = args.indexOf('--session'); const sessionId = sessionIdx >= 0 ? args[sessionIdx + 1] : undefined;

  const opencode = whichOpencode();
  const omo = detectOMO();
  const agent = chooseAgent(reqAgent, omo);
  const cliArgs = ['run', '--format', 'json', '--agent', agent];
  if (model) cliArgs.push('--model', model);
  if (sessionId) cliArgs.push('--session', sessionId);
  if (prompt) cliArgs.push(prompt);

  const env = { ...process.env, ...(process.platform === 'win32' && process.env.USERPROFILE ? { HOME: process.env.USERPROFILE } : {}), ...HEADLESS_ENV };
  const child = spawn(opencode, cliArgs, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true });
  if (!prompt) process.stdin.pipe(child.stdin); else child.stdin.end();
  let t; if (timeoutSec > 0) t = setTimeout(() => child.kill(), timeoutSec * 1000);
  let text = '', reasoning = '', buf = '';
  const emit = (r) => { try { process.stdout.write(JSON.stringify(r) + '\n'); } catch (e) {} };
  function handleLine(l) {
    const trimmed = (l || '').trim(); if (!trimmed) return;
    try {
      const e = JSON.parse(trimmed);
      if (e.type === 'reasoning') reasoning += (e.part?.text || '');
      if (e.type === 'text') { const c = e.part?.text || ''; text += c; emit({ type: 'text', text: c, sessionId: e.sessionID || e.sessionId }); }
      if (e.type === 'step_finish' && e.part?.tokens) emit({ type: 'usage', tokens: e.part.tokens, cost: e.part?.cost });
      if (e.type === 'error') emit({ type: 'error', error: e.error || e.message || JSON.stringify(e) });
    } catch (err) {}
  }
  child.stdout.on('data', c => { buf += c.toString(); const lines = buf.split(/\r?\n/); buf = lines.pop() || ''; for (let i = 0; i < lines.length; i++) handleLine(lines[i]); });
  child.stderr.on('data', c => { emit({ type: 'stderr', chunk: c.toString() }); });
  child.on('close', code => { if (t) clearTimeout(t); if (buf) handleLine(buf); emit({ type: 'done', exitCode: code || 0, agentUsed: agent, hasReasoning: reasoning.length > 0, textLen: text.length }); });
}
main();
