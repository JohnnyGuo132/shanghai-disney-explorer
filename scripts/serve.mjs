import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};
const isInside = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

// Local-only preview. Authentication for a private production host belongs at its gateway.
export async function createPreviewServer({ root = defaultRoot, base = '/' } = {}) {
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('--base must be / or /repo-name/');
  const realRoot = await realpath(root);
  return http.createServer(async (req, res) => {
    const reply = (status, message, headers = {}) => {
      res.writeHead(status, {
        'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(message),
        'X-Content-Type-Options': 'nosniff', ...headers
      });
      res.end(req.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(req.method)) return reply(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    let pathname;
    // Validate before URL normalization, which would erase literal or encoded dot segments.
    try { pathname = decodeURIComponent((req.url || '/').split('?')[0]); }
    catch { return reply(400, 'Invalid URL'); }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') ||
        pathname.split('/').some(segment => segment.startsWith('.') && segment !== '.nojekyll')) {
      return reply(403, 'Forbidden');
    }
    if (base !== '/' && pathname === base.slice(0, -1)) return reply(308, '', { Location: base });
    if (!pathname.startsWith(base)) return reply(404, `Open ${base}`);
    const relative = pathname.slice(base.length);
    let file = path.resolve(realRoot, relative || 'index.html');
    if (!isInside(realRoot, file)) return reply(403, 'Forbidden');
    try {
      file = await realpath(file);
      if (!isInside(realRoot, file)) return reply(403, 'Forbidden');
      let info = await stat(file);
      if (info.isDirectory()) {
        file = await realpath(path.join(file, 'index.html'));
        if (!isInside(realRoot, file)) return reply(403, 'Forbidden');
        info = await stat(file);
      }
      if (!info.isFile()) return reply(404, 'Not found');
      res.writeHead(200, {
        'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': info.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'
      });
      if (req.method === 'HEAD') return res.end();
      const stream = createReadStream(file);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch { reply(404, 'Not found'); }
  });
}

async function main() {
  const args = process.argv.slice(2), options = { port: 4173, base: '/' };
  for (let i = 0; i < args.length; i += 2) {
    if (!['--port', '--base'].includes(args[i]) || !args[i + 1]) {
      throw new Error('Usage: node scripts/serve.mjs [--port 4173] [--base /repo-name/]');
    }
    options[args[i].slice(2)] = args[i + 1];
  }
  const port = Number(options.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
  const server = await createPreviewServer(options);
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try --port ${port + 1}.` : error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}${options.base}\nPress Ctrl+C to stop.`));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
