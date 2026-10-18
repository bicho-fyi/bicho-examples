import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

async function run(file, values = {}) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('BICHO_')));
  const child = spawn(process.execPath, [file], { cwd: root, env: { ...env, ...values }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  const [code] = await once(child, 'exit');
  return { code, stdout, stderr };
}

async function withCollector(callback) {
  const requests = [];
  const server = createServer(async (incoming, outgoing) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    requests.push({ path: incoming.url, headers: incoming.headers, body: Buffer.concat(chunks).toString() });
    outgoing.writeHead(200, { 'Content-Type': 'application/json' });
    outgoing.end('{}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await callback(`http://127.0.0.1:${server.address().port}`, requests);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

for (const file of ['node/report.mjs', 'sentry-node/report.mjs']) {
  test(`${file} requires explicit configuration`, async () => {
    const result = await run(file);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /BICHO_/);
  });
}

test('Node example sends one tagged OTLP exception and awaits delivery', async () => {
  await withCollector(async (origin, requests) => {
    const result = await run('node/report.mjs', { BICHO_ENDPOINT: `${origin}/v1/logs`, BICHO_PUBLIC_KEY: 'example-key' });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout.trim(), /^[a-f0-9]{32}$/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/v1/logs');
    assert.equal(requests[0].headers['x-bicho-key'], 'example-key');
    const record = JSON.parse(requests[0].body).resourceLogs[0].scopeLogs[0].logRecords[0];
    const attributes = Object.fromEntries(record.attributes.map(item => [item.key, item.value.stringValue]));
    assert.equal(attributes.example, 'node');
    assert.equal(attributes['exception.type'], 'Error');
    assert.equal(attributes['log.record.uid'], result.stdout.trim());
  });
});

test('Node example rejects an unsupported ingest secret before sending', async () => {
  await withCollector(async (origin, requests) => {
    const result = await run('node/report.mjs', { BICHO_ENDPOINT: `${origin}/v1/logs`, BICHO_PUBLIC_KEY: 'example-key', BICHO_INGEST_SECRET: 'private-fixture' });
    assert.notEqual(result.code, 0);
    assert.equal(requests.length, 0);
    assert(!`${result.stdout}${result.stderr}`.includes('private-fixture'));
  });
});

test('Sentry example uses its DSN and optional backend header for one error event', async () => {
  await withCollector(async (origin, requests) => {
    const result = await run('sentry-node/report.mjs', { BICHO_SENTRY_DSN: origin.replace('://', '://example_key@') + '/1', BICHO_INGEST_SECRET: 'private-fixture' });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout.trim(), /^[a-f0-9]{32}$/);
    assert.equal(requests.length, 1);
    assert.match(requests[0].path, /^\/api\/1\/envelope\//);
    assert.equal(requests[0].headers['x-bicho-secret'], 'private-fixture');
    assert(!`${result.stdout}${result.stderr}`.includes('private-fixture'));
    const envelope = requests[0].body.trim().split('\n');
    assert.equal(JSON.parse(envelope[1]).type, 'event');
    const event = JSON.parse(envelope[2]);
    assert.equal(event.event_id, result.stdout.trim());
    assert.equal(event.tags.example, 'sentry-node');
    assert.equal(event.exception.values[0].type, 'Error');
  });
});
