// Loopback-only static server for the Tidewatch showcase. Serves an allowlist of files collected at startup;
// no directory listings, no writes. Set TIDEWATCH_PORT to change the port (default 4180).
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../showcase/tidewatch/game/', import.meta.url));
const port = Number(process.env.TIDEWATCH_PORT || 4180);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const allowed = new Set();
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) await collect(file); else if (entry.isFile() && types[path.extname(file)]) allowed.add(file);
  }
}
await collect(root);
createServer(async (req, res) => {
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host) || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(403).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root) || !allowed.has(file)) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Tidewatch: http://127.0.0.1:${port}`));
