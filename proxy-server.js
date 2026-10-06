const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT       = 3000;
const API_HOST   = 'discoverai.levelworks.co';

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {

  // ── CORS preflight ───────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY',
    });
    return res.end();
  }

  // ── Proxy /api/* → real API ──────────────────────────────────
  if (req.url.startsWith('/api/')) {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);

      const options = {
        hostname: API_HOST,
        path:     req.url,
        method:   req.method,
        headers:  {
          'content-type':   'application/json',
          'content-length': body.length,
          'x-api-key':      req.headers['x-api-key'] || '',
          'host':           API_HOST,
        },
      };

      const proxy = https.request(options, upstream => {
        res.writeHead(upstream.statusCode, {
          'content-type':                 upstream.headers['content-type'] || 'application/json',
          'access-control-allow-origin':  '*',
        });
        upstream.pipe(res);
      });

      proxy.on('error', err => {
        console.error('Proxy error:', err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: err.message }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  // ── Serve static files ───────────────────────────────────────
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const tryFiles = [
    path.join(__dirname, urlPath),
    path.join(__dirname, urlPath + '.html'),
    path.join(__dirname, urlPath, 'index.html'),
  ];

  const tryNext = (candidates) => {
    if (!candidates.length) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found: ' + urlPath);
    }
    const filePath = candidates[0];
    const ext = path.extname(filePath).toLowerCase();
    fs.readFile(filePath, (err, data) => {
      if (err) return tryNext(candidates.slice(1));
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
      res.end(data);
    });
  };

  tryNext(tryFiles);

}).listen(PORT, () => {
  console.log(`\n  Proxy server → http://localhost:${PORT}`);
  console.log(`  /api/* proxied to https://${API_HOST}\n`);
});
