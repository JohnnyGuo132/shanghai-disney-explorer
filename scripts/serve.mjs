import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A dependency-free local preview, including GitHub Pages project subpaths.
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
}
for (let i = 0; i < args.length; i += 2) {
  if (!['--port', '--base'].includes(args[i]) || !args[i + 1]) {
    throw new Error('Usage: npm run dev -- [--port 4173] [--base /shanghai-disney-explorer/]');
  }
}
const port = Number(option('--port', '4173'));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const base = option('--base', '/');
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('--base must be / or /repo-name/');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};
const server = http.createServer(async (req, res) => {
  const reply = (status, message, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    res.end(req.method === 'HEAD' ? undefined : message);
  };
  if (!['GET', 'HEAD'].includes(req.method)) return reply(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return reply(400, 'Invalid URL'); }
  if (base !== '/' && pathname === base.slice(0, -1)) {
    res.writeHead(308, { Location: base });
    return res.end();
  }
  if (!pathname.startsWith(base)) return reply(404, `Open ${base}`);
  const relative = pathname.slice(base.length);
  if (relative.includes('\\') || relative.includes('\0') || relative.split('/').some(p => p.startsWith('.') && p !== '.nojekyll')) {
    return reply(403, 'Forbidden');
  }
  let file = path.resolve(root, relative || 'index.html');
  const withinRoot = path.relative(root, file);
  if (withinRoot.startsWith('..') || path.isAbsolute(withinRoot)) return reply(403, 'Forbidden');
  try {
    let info = await stat(file);
    if (info.isDirectory()) { file = path.join(file, 'index.html'); info = await stat(file); }
    if (!info.isFile()) return reply(404, 'Not found');
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Content-Length': info.size, 'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch { reply(404, 'Not found'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try --port ${port + 1}.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}${base}\nPress Ctrl+C to stop.`));
