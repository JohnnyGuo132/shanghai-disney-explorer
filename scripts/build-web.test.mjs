import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebBuild, applyWebBuild } from './build-web.mjs';
import { createPreviewServer } from './serve.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));

test('committed bundle contains its complete module graph, legal notices and current inline styles', async () => {
  const result = await createWebBuild();
  await applyWebBuild(result, { check: true });
  const output = result.metafile.outputs['dist/app.bundle.js'];
  assert.deepEqual(output.imports, []);
  assert.ok(result.metafile.inputs['dist/vendor/three.module.js']);
  assert.ok(result.metafile.inputs['dist/vendor/three.core.js']);
  assert.ok(result.stats.bundleBytes < result.stats.sourceBytes);
  assert.match(result.outputFiles.get('dist/app.bundle.js').toString(), /app\.bundle\.js\.LEGAL\.txt/);
  assert.match(result.outputFiles.get('dist/app.bundle.js.LEGAL.txt').toString(), /three\.js|Three\.js/);
});

test('generated artifacts and runtime resource paths remain usable below a repository prefix', async t => {
  const server = await createPreviewServer({ root: path.join(project, 'dist'), base: '/shanghai-disney-explorer/' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/shanghai-disney-explorer/`;
  for (const name of ['app.bundle.js', 'app.bundle.js.LEGAL.txt', 'index.html', 'explore.html']) {
    const response = await fetch(new URL(name, base));
    assert.equal(response.status, 200, name);
    assert.match(response.headers.get('content-type'), name.endsWith('.js') ? /javascript/ : name.endsWith('.html') ? /text\/html/ : /text\/plain/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path.join(project, 'dist', name)));
  }
  const bundle = await readFile(path.join(project, 'dist/app.bundle.js'), 'utf8');
  // These strings are consumed by fetch/Three's loaders relative to the page.
  // The decoder stays a separate worker asset; it is not a static JS import.
  for (const asset of ['./assets/geography/park-local.json', './assets/landmarks/layout.json', './vendor/draco/']) {
    assert.ok(bundle.includes(asset), `Bundle lost document-relative asset path ${asset}`);
    assert.ok(new URL(asset, base).pathname.startsWith('/shanghai-disney-explorer/'));
  }
});

test('check detects transitive source, CSS and license drift without modifying generated files', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'disney-web-build-test-'));
  t.after(async () => {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(tmpdir()));
    assert.ok(path.basename(target).startsWith('disney-web-build-test-'));
    await rm(target, { recursive: true, force: true });
  });
  await mkdir(path.join(root, 'dist/vendor'), { recursive: true });
  const write = (name, content) => writeFile(path.join(root, 'dist', name), content);
  await Promise.all([
    write('explore.js', "import { revision } from 'three'; window.sceneRevision = revision;\n"),
    write('vendor/three.module.js', '/*! Fixture license. */\nexport const revision = 1;\n'),
    write('explore.css', ':root { color: green; }\n'),
    ...['index.html', 'explore.html'].map(name => write(name, '<!doctype html><style id="app-style"></style><main>Keep this content</main>\n'))
  ]);
  const build = () => createWebBuild({ root });
  await assert.rejects(applyWebBuild(await build(), { check: true }), /stale or missing/);
  await applyWebBuild(await build());
  await applyWebBuild(await build(), { check: true });
  const initial = await readFile(path.join(root, 'dist/app.bundle.js'));
  await write('vendor/three.module.js', '/*! Fixture license. */\nexport const revision = 2;\n');
  await assert.rejects(applyWebBuild(await build(), { check: true }), /app\.bundle\.js/);
  assert.deepEqual(await readFile(path.join(root, 'dist/app.bundle.js')), initial, 'check must not rewrite stale files');
  await applyWebBuild(await build());
  await write('explore.css', ':root { color: blue; }\n');
  await assert.rejects(applyWebBuild(await build(), { check: true }), /index\.html.*explore\.html/);
  await applyWebBuild(await build());
  assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /color: blue;[\s\S]*Keep this content/);
  await write('app.bundle.js.LEGAL.txt', 'damaged notice\n');
  await assert.rejects(applyWebBuild(await build(), { check: true }), /LEGAL\.txt/);
});
