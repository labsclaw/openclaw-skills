/*!
 * SPDX-License-Identifier: Apache-2.0
 * opencode-bridge.mjs - headless OpenCode CLI bridge for agent delegation.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const HEADLESS_ENV = {
  OPENCODE_DISABLE_EMBEDDED_WEB_UI: '1',
  OPENCODE_DISABLE_SHARE: '1',
  OPENCODE_AUTO_SHARE: '0',
  OPENCODE_DISABLE_AUTOUPDATE: '1',
};

const OMO_MARKERS = ['sisyphus', 'prometheus', 'atlas', 'hephaestus', 'ultraworker'];

function npmRoot() {
  const appData = process.env.APPDATA;
  if (appData) return resolve(appData, 'npm');
  const profile = process.env.USERPROFILE;
  if (profile) return resolve(profile, 'AppData', 'Roaming', 'npm');
  return null;
}

function resolveExecutable() {
  if (process.platform === 'win32') {
    const root = npmRoot();
    if (root) {
      const exe = resolve(root, 'node_modules', 'opencode-ai', 'bin', 'opencode.exe');
      if (existsSync(exe)) return { command: exe, shell: false };
      const cmd = resolve(root, 'opencode.cmd');
      if (existsSync(cmd)) return { command: cmd, shell: true };
    }
  }
  return { command: 'opencode', shell: process.platform === 'win32' };
}

function buildEnv() {
  const env = { ...process.env, ...HEADLESS_ENV };
  if (process.platform === 'win32' && !env.HOME && process.env.USERPROFILE) {
    env.HOME = process.env.USERPROFILE;
  }
  return env;
}

function detectOMO(command, shell) {
  try {
    const result = spawnSync(command, ['agent', 'list'], {
      encoding: 'utf8',
      timeout: 20000,
      shell,
      windowsHide: true,
      env: buildEnv(),
    });
    if (result.error) return false;
    const combined = `${result.stdout || ''}${result.stderr || ''}`.toLowerCase();
    return OMO_MARKERS.some((marker) => combined.includes(marker));
  } catch {
    return false;
  }
}

function chooseAgent(requested, orchestratorAvailable) {
  if (requested) return requested;
  if (orchestratorAvailable) return 'Sisyphus - ultraworker';
  return 'build';
}

function parseArgs(argv) {
  const value = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 && index + 1 < argv.length ? argv[index + 1] : undefined;
  };
  const positional = [...argv].reverse().find((item) => !item.startsWith('--'));
  return {
    prompt: value('--prompt') ?? positional ?? '',
    cwd: value('--cwd') ?? process.cwd(),
    agent: value('--agent'),
    model: value('--model'),
    sessionId: value('--session'),
    timeoutSec: Number.parseInt(value('--timeoutSec') ?? '600', 10),
  };
}

function killTree(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill('SIGKILL');
  }
}

function emit(record) {
  try {
    process.stdout.write(`${JSON.stringify(record)}\n`);
  } catch {
    /* stdout closed */
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const { command, shell } = resolveExecutable();
  const orchestratorAvailable = detectOMO(command, shell);
  const agent = chooseAgent(options.agent, orchestratorAvailable);

  const cliArgs = ['run', '--format', 'json', '--agent', agent];
  if (options.model) cliArgs.push('--model', options.model);
  if (options.sessionId) cliArgs.push('--session', options.sessionId);
  if (options.prompt) cliArgs.push(options.prompt);

  const child = spawn(command, cliArgs, {
    cwd: options.cwd,
    env: buildEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
    shell,
    windowsHide: true,
  });

  if (options.prompt) child.stdin.end();
  else process.stdin.pipe(child.stdin);

  const timer = options.timeoutSec > 0
    ? setTimeout(() => {
        emit({ type: 'error', error: `timeout after ${options.timeoutSec}s` });
        killTree(child);
      }, options.timeoutSec * 1000)
    : null;

  let text = '';
  let reasoning = '';
  let buffer = '';

  const handleLine = (line) => {
    const trimmed = (line ?? '').trim();
    if (!trimmed) return;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (event.type === 'reasoning') reasoning += event.part?.text ?? '';
    if (event.type === 'text') {
      const chunk = event.part?.text ?? '';
      text += chunk;
      emit({ type: 'text', text: chunk, sessionId: event.sessionID ?? event.sessionId });
    }
    if (event.type === 'step_finish' && event.part?.tokens) {
      emit({ type: 'usage', tokens: event.part.tokens, cost: event.part?.cost });
    }
    if (event.type === 'error') {
      emit({ type: 'error', error: event.error ?? event.message ?? JSON.stringify(event) });
    }
  };

  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) handleLine(line);
  });

  child.stderr.on('data', (chunk) => emit({ type: 'stderr', chunk: chunk.toString() }));

  child.on('error', (error) => emit({ type: 'error', error: error.message }));

  child.on('close', (code) => {
    if (timer) clearTimeout(timer);
    if (buffer) handleLine(buffer);
    emit({
      type: 'done',
      exitCode: code ?? 1,
      agentUsed: agent,
      hasReasoning: reasoning.length > 0,
      textLen: text.length,
    });
  });
}

main();
