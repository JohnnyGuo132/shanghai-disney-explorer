import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const source = html.match(/<script id="startup-loader">([\s\S]*?)<\/script>/)?.[1];
assert.ok(source, 'Initial loading controls must be delivered with the HTML');

function loader() {
  const elements = {
    'load-status': { textContent: '正在连接三维游览' },
    'load-hint': { textContent: '' },
    'load-retry': { hidden: true },
  };
  const timers = new Map(), events = new Map();
  let clock = 100, reloads = 0;
  const context = {
    window: {}, document: { getElementById: id => elements[id] },
    performance: { now: () => clock++, getEntriesByType: () => [] },
    location: { reload: () => reloads++ },
    setTimeout: callback => { timers.set(1, callback); return 1; },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, callback) => events.set(name, callback),
  };
  vm.runInNewContext(source, context);
  return { boot: context.window.__wonderBoot, elements, timers, events, reloads: () => reloads };
}

test('Slow or unavailable engine still offers retry without a loaded module', () => {
  const l = loader();
  l.timers.get(1)();
  assert.match(l.elements['load-hint'].textContent, /Wi-Fi/);
  assert.equal(l.elements['load-retry'].hidden, false);
  l.elements['load-retry'].onclick();
  assert.equal(l.reloads(), 1);
});

test('Specific graphics failure survives a later module import rejection', () => {
  const l = loader();
  l.boot.fail('无法启动三维画面', '需要 WebGL 2');
  l.boot.fail('网络错误');
  l.boot.stage('scene', '正在下载');
  assert.equal(l.elements['load-status'].textContent, '无法启动三维画面');
  assert.equal(l.elements['load-hint'].textContent, '需要 WebGL 2');
  assert.equal(l.boot.snapshot().phase, 'error');
  assert.equal(l.timers.size, 0);
});

test('Successful rendering cancels the slow hint and records readiness', () => {
  const l = loader();
  l.boot.stage('engine', '正在准备');
  l.boot.stage('scene', '正在呈现');
  l.boot.ready();
  assert.equal(l.boot.snapshot().phase, 'ready');
  assert.ok(l.boot.snapshot().marks.ready > l.boot.snapshot().marks.html);
  assert.equal(l.timers.size, 0);
  l.events.get('offline')();
  assert.equal(l.boot.snapshot().phase, 'ready');
});

test('Disconnect during loading shows a recoverable network failure', () => {
  const l = loader();
  l.events.get('offline')();
  assert.match(l.elements['load-status'].textContent, /网络已断开/);
  assert.equal(l.elements['load-retry'].hidden, false);
  assert.equal(l.timers.size, 0);
});
