import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dist');
const host = process.env.HOST ?? 'localhost';
const startPort = Number(process.env.PORT ?? 8080);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.mjz': 'application/octet-stream',
  '.onnx': 'application/octet-stream',
  '.ttf': 'font/ttf',
};

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  let filePath = path.join(root, decoded);
  if (!filePath.startsWith(root)) {
    return null;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(root, 'index.html');
  }
  return filePath;
}

function listen(port) {
  const server = http.createServer((req, res) => {
    const filePath = resolvePath(req.url ?? '/');
    if (!filePath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath);
      res.setHeader('Content-Type', contentTypes[ext] ?? 'application/octet-stream');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.end(data);
    });
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < 65535) {
      listen(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, host, () => {
    console.log(`Serving ${root}`);
    console.log(`Open http://${host}:${port}`);
  });
}

listen(startPort);
