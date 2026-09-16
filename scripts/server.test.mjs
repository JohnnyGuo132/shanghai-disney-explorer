import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createPreviewServer } from './serve.mjs';

function request(server, requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: requestPath, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

for (const base of ['/', '/shanghai-disney-explorer/']) {
  test(`HTTP contract at ${base}`, async t => {
    const temporary = await mkdtemp(path.join(tmpdir(), 'disney-preview-test-'));
    const root = path.join(temporary, 'site'), outside = path.join(temporary, 'outside');
    await mkdir(root); await mkdir(outside);
    const html = '<!doctype html><title>Preview 测试</title>';
    const wasm = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);
    await Promise.all([
      writeFile(path.join(root, 'index.html'), html),
      writeFile(path.join(root, 'app.js'), 'export const ok = true;'),
      writeFile(path.join(root, 'decoder.wasm'), wasm),
      writeFile(path.join(outside, 'private.txt'), 'MUST NOT BE SERVED')
    ]);
    // Junctions need no developer-mode privilege on Windows.
    await symlink(outside, path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const server = await createPreviewServer({ root, base });
    t.after(async () => {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      const target = path.resolve(temporary);
      assert.equal(path.dirname(target), path.resolve(tmpdir()));
      assert.ok(path.basename(target).startsWith('disney-preview-test-'));
      await rm(target, { recursive: true, force: true });
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');

    await t.test('GET and HEAD preserve MIME and byte length, including WASM', async () => {
      const get = await request(server, `${base}?v=release`);
      assert.equal(get.status, 200); assert.equal(get.body.toString(), html);
      assert.match(get.headers['content-type'], /^text\/html/);
      assert.equal(Number(get.headers['content-length']), Buffer.byteLength(html));
      assert.equal(get.headers['x-content-type-options'], 'nosniff');
      const head = await request(server, base, 'HEAD');
      assert.equal(head.status, 200); assert.equal(head.body.length, 0);
      assert.equal(head.headers['content-length'], get.headers['content-length']);
      const module = await request(server, `${base}app.js`);
      assert.match(module.headers['content-type'], /^text\/javascript/);
      const decoder = await request(server, `${base}decoder.wasm`);
      assert.equal(decoder.status, 200); assert.equal(decoder.headers['content-type'], 'application/wasm');
      assert.deepEqual(decoder.body, wasm);
    });
    await t.test('unknown files return 404, unsupported methods return 405', async () => {
      assert.equal((await request(server, `${base}missing.glb`)).status, 404);
      const missingHead = await request(server, `${base}missing.glb`, 'HEAD');
      assert.equal(missingHead.status, 404); assert.equal(missingHead.body.length, 0);
      const post = await request(server, base, 'POST');
      assert.equal(post.status, 405); assert.equal(post.headers.allow, 'GET, HEAD');
      assert.equal((await request(server, `${base}%zz`)).status, 400);
    });
    await t.test('dot traversal, encoded separators, hidden paths and symlink escape are denied', async () => {
      for (const suffix of ['../outside/private.txt', '%2e%2e/outside/private.txt', '..%2foutside/private.txt',
        '%2e%2e%5coutside%5cprivate.txt', '.git/config', '.env', '%00index.html', 'escape/private.txt']) {
        const response = await request(server, base + suffix);
        assert.equal(response.status, 403, suffix);
        assert.ok(!response.body.toString().includes('MUST NOT BE SERVED'));
      }
    });
    if (base !== '/') await t.test('subpath redirect and prefix boundary', async () => {
      const redirect = await request(server, base.slice(0, -1));
      assert.equal(redirect.status, 308); assert.equal(redirect.headers.location, base);
      assert.equal((await request(server, '/')).status, 404);
      assert.equal((await request(server, `${base.slice(0, -1)}-other/index.html`)).status, 404);
    });
  });
}
