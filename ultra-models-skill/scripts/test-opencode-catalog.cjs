const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCatalog, collect } = require('./opencode-catalog.cjs');
const row = (id, cost = { input: 0, output: 0, cache: { read: 0, write: 0 } }) =>
  `opencode/${id}\n${JSON.stringify({ id, providerID: 'opencode', cost, headers: { authorization: 'fixture-secret' }, options: { apiKey: 'fixture-secret' } })}\n`;
test('strict records and safe shape; no header/options forwarding', () => {
  const data = parseCatalog('\u001b[32m' + row('sample-free') + row('paid', { input: 1, output: 1 }));
  assert.equal(data.length, 2);
  assert.equal(data[0].isFree, true);
  assert.equal(data[1].isFree, false);
  assert.equal(JSON.stringify(data).includes('fixture-secret'), false);
});
test('suffix alone never proves free; unknown/paid cache prices excluded', () => {
  for (const cost of [{ input: 1, output: 0 }, { output: 0 }, { input: '0', output: 0 }, { input: 0, output: 0, cache: { read: 1 } }]) {
    assert.equal(parseCatalog(row('paid-free', cost))[0].isFree, false);
  }
});
test('partial, empty, duplicate, mismatched or non-JSON output fails closed', () => {
  for (const raw of ['', row('a') + 'opencode/b\n{', row('a') + row('a'), row('a').replace('"providerID":"opencode"', '"providerID":"other"'), 'unexpected\n' + row('a')]) {
    assert.throws(() => parseCatalog(raw));
  }
});
test('native command is bounded/no shell; listing makes no auth/health claim', () => {
  const data = collect({ env: { OPENCODE_BIN: 'fixture.exe' }, run: (bin, args, options) => {
    assert.equal(bin, 'fixture.exe');
    assert.deepEqual(args, ['models', 'opencode', '--verbose', '--refresh', '--pure']);
    assert.equal(options.shell, false);
    assert.equal(options.windowsHide, true);
    assert.equal(options.timeout, 45000);
    return { status: 0, stdout: row('free') + row('paid-free', { input: 2, output: 1 }) };
  } });
  assert.equal(data.status, 'catalog_only');
  assert.equal(data.total, 2);
  assert.equal(data.free, 1);
  assert.equal(data.authenticated, null);
  assert.equal(data.inferenceHealthy, null);
});
test('failed process cannot turn partial output or secret stderr into success', () => {
  for (const response of [{ status: 1, stdout: row('a'), stderr: 'fixture-secret' }, { status: null, error: { code: 'ETIMEDOUT' } }, { status: 0, stdout: '' }]) {
    const data = collect({ run: () => response });
    assert.equal(data.status, 'unavailable');
    assert.equal(data.models.length, 0);
    assert.equal(JSON.stringify(data).includes('fixture-secret'), false);
  }
});
