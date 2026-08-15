#!/usr/bin/env node
/**
 * WOY — servidor estático local (cero dependencias).
 *
 * Reemplaza a serve.py: el python3 de CommandLineTools no tiene permiso TCC
 * sobre ~/Documents, así que preview_start no podía arrancarlo.
 *
 * Arrancar:  node serve.js   →  http://localhost:4599
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const PUERTO = 4599;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, `http://localhost:${PUERTO}`).pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';

  // No salir de la raíz del proyecto
  const destino = path.join(RAIZ, path.normalize(ruta));
  if (!destino.startsWith(RAIZ)) {
    res.writeHead(403); return res.end('Prohibido');
  }

  fs.readFile(destino, (err, datos) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado: ' + ruta);
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, must-revalidate',
    });
    res.end(datos);
  });
});

server.listen(PUERTO, '127.0.0.1', () => {
  console.log(`WOY serving on http://localhost:${PUERTO}`);
});
