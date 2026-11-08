#!/usr/bin/env node
/**
 * Minimal static preview server for the already-built deploy/ folder.
 * Uses only Node built-ins so it still works when node_modules is absent.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const root = resolve(arg('--root', 'deploy'));
const host = arg('--host', '0.0.0.0');
const port = Number(arg('--port', '8000'));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Port invalide: ${port}`);
if (!existsSync(resolve(root, 'index.html'))) throw new Error(`index.html introuvable dans ${root}; lancez npm run build:lowmem d'abord.`);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};
const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://preview.local').pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return;
  }

  let filePath = resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(rootPrefix)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = resolve(filePath, 'index.html');

  // SPA fallback for client-side routes, but not for missing assets.
  if (!existsSync(filePath) && !extname(pathname)) filePath = resolve(root, 'index.html');
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
    return;
  }

  const isCompressedWasm = pathname.endsWith('.wasm.gz');
  const headers = {
    'Content-Length': statSync(filePath).size,
    'Content-Type': isCompressedWasm ? 'application/wasm' : (mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream'),
    'X-Content-Type-Options': 'nosniff',
  };
  if (isCompressedWasm) {
    headers['Content-Encoding'] = 'gzip';
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else if (pathname === '/index.html' || pathname === '/sw.js' || pathname === '/manifest.json') {
    headers['Cache-Control'] = 'no-cache';
  }

  response.writeHead(200, headers);
  if (request.method === 'HEAD') response.end();
  else createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`MSP preview disponible sur http://${host}:${port} depuis ${root}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
