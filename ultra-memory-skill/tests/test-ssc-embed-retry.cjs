#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const { retryDelayMs } = require('../scripts/ssc-embed-provider.cjs');

assert.equal(retryDelayMs({ 'retry-after': '12' }, ''), 12000);
assert.equal(retryDelayMs({}, JSON.stringify({
  error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '41.5s' }] },
})), 41500);
assert.equal(retryDelayMs({ 'retry-after': '3' }, JSON.stringify({
  error: { details: [{ retryDelay: '9s' }] },
})), 9000);

async function testEffectiveWait() {
  const originalRequest = https.request;
  let attempt = 0;
  https.request = (_options, callback) => {
    const request = new EventEmitter();
    request.write = () => {};
    request.end = () => {
      const response = new EventEmitter();
      attempt++;
      response.statusCode = attempt === 1 ? 429 : 200;
      response.headers = attempt === 1 ? { 'retry-after': '3' } : {};
      callback(response);
      response.emit('data', attempt === 1 ? '{"error":{}}' : '{"ok":true}');
      response.emit('end');
    };
    request.destroy = () => {};
    return request;
  };
  try {
    delete require.cache[require.resolve('../scripts/ssc-embed-provider.cjs')];
    const { EmbedProvider } = require('../scripts/ssc-embed-provider.cjs');
    const provider = new EmbedProvider({ apiKey: 'test', maxRetries: 1 });
    const waits = [];
    let releaseSleep;
    provider._sleep = ms => {
      waits.push(ms);
      return new Promise(resolve => { releaseSleep = resolve; });
    };
    const pending = provider._request('/test', {});
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(waits, [3000]);
    assert.equal(attempt, 1, 'retry must wait for the sleep Promise');
    releaseSleep();
    await pending;
    assert.equal(attempt, 2);
  } finally {
    https.request = originalRequest;
  }
}

testEffectiveWait().then(() => console.log('PASS test-ssc-embed-retry')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
