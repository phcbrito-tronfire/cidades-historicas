// Servidor local simples para testar o site: node serve.js  →  http://localhost:8123
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8123;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  // (testes) POST /__shot?n=nome com o corpo "data:image/...;base64,..." grava _arquivos/shots/nome.png|jpg —
  // imagem do jogo para conferir mesmo com o navegador de teste escondido. Só no servidor local.
  if (req.method === 'POST' && req.url.startsWith('/__shot')) {
    const n = (new URL(req.url, 'http://x').searchParams.get('n') || 'shot').replace(/[^\w-]/g, '');
    let body = ''; req.on('data', (c) => { body += c; if (body.length > 2e7) req.destroy(); });
    req.on('end', () => {
      const m = body.match(/^data:image\/(png|jpeg);base64,(.+)$/); if (!m) { res.writeHead(400); return res.end(); }
      const dir = path.join(ROOT, '_arquivos', 'shots'); fs.mkdirSync(dir, { recursive: true });
      const f = path.join(dir, n + (m[1] === 'png' ? '.png' : '.jpg')); fs.writeFileSync(f, Buffer.from(m[2], 'base64'));
      res.writeHead(200); res.end(f);
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Cidades Históricas em http://localhost:${PORT}`));
