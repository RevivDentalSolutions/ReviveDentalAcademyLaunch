import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../api/ai.js';
import unavailable from '../api/unavailable.js';

test('deployed AI handler imports without opening a port; health and anonymous protection work', async () => {
 const server = app.listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(base + '/api/ai/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).generationEnabled, false);
  const denied = await fetch(base + '/api/ai/generate-course', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:'test'})});
  assert.equal(denied.status, 401);
 } finally { await new Promise(resolve => server.close(resolve)); }
});

test('unreleased payment and render APIs fail closed with an actionable response', () => {
 let status, body;
 unavailable({}, {status(n){status=n;return this},json(v){body=v}});
 assert.equal(status,503);
 assert.match(body.error,/paused/);
});
