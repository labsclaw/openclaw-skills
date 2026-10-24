// Native CLI catalog only. Login/eligibility/inference remain separate checks.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function parseCatalog(raw) {
  const clean = raw.replace(/\u001b\[[0-9;]*m/g, '').replace(/\r/g, '').trim();
  const records = [...clean.matchAll(/^opencode\/([^\s]+)\n/gm)];
  if (!records.length || records[0].index !== 0) throw new Error('INVALID_CATALOG');
  const seen = new Set();
  return records.map((match, i) => {
    const value = JSON.parse(clean.slice(match.index + match[0].length, records[i + 1]?.index ?? clean.length));
    if (value.id !== match[1] || value.providerID !== 'opencode' || seen.has(value.id)) throw new Error('INVALID_CATALOG');
    seen.add(value.id);
    const zero = n => typeof n === 'number' && Number.isFinite(n) && n === 0;
    const isFree = zero(value.cost?.input) && zero(value.cost?.output) &&
      Object.values(value.cost?.cache ?? {}).every(zero);
    // Return an allowlisted shape, never headers/options or other auth-bearing metadata.
    return { id: value.id, name: typeof value.name === 'string' ? value.name : value.id,
      isFree, cost: { input: value.cost?.input, output: value.cost?.output },
      contextWindow: value.limit?.context, maxTokens: value.limit?.output };
  });
}

function collect({ env = process.env, run = spawnSync } = {}) {
  const native = path.join(env.APPDATA || '', 'npm', 'node_modules', 'opencode-ai', 'bin', 'opencode.exe');
  const binary = env.OPENCODE_BIN || (process.platform === 'win32' && fs.existsSync(native) ? native : 'opencode');
  const base = { provider: 'opencode', source: 'opencode-cli', checkedAt: new Date().toISOString(),
    authenticated: null, inferenceHealthy: null, catalogOnly: true };
  let result;
  try {
    result = run(binary, ['models', 'opencode', '--verbose', '--refresh', '--pure'], {
      env, encoding: 'utf8', timeout: 45000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, shell: false,
    });
  } catch { return { ...base, status: 'unavailable', error: 'CLI_START_FAILED', total: 0, free: 0, models: [] }; }
  if (result.error || result.status !== 0) return { ...base, status: 'unavailable',
    error: result.error?.code === 'ETIMEDOUT' ? 'CLI_TIMEOUT' : 'CLI_FAILED', total: 0, free: 0, models: [] };
  try {
    const all = parseCatalog(result.stdout);
    const models = all.filter(m => m.isFree);
    return { ...base, status: 'catalog_only', total: all.length, free: models.length, models, error: null };
  } catch { return { ...base, status: 'unavailable', error: 'INVALID_CATALOG', total: 0, free: 0, models: [] }; }
}

module.exports = { parseCatalog, collect };
if (require.main === module) {
  const result = collect();
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.error ? 1 : 0;
}
