// Local-only static server for the game and its attack gallery.
const http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path');
const root = path.join(__dirname, 'game');
http
  .createServer((req, res) => {
    let file;
    try {
      file = path.resolve(
        root,
        '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    if (file === root) file = path.join(root, 'index.html');
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.png': 'image/png',
      '.mp3': 'audio/mpeg',
      '.json': 'application/json',
      '.css': 'text/css',
    };
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  })
  .listen(4173, '127.0.0.1', () =>
    console.log('Digibonk: http://127.0.0.1:4173/attack-preview.html'),
  );
