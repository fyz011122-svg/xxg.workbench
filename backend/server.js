/* 小小怪食堂 · 同步后端
   零依赖 Node 服务：托管主工作台 + 食堂点菜端，并提供订单 API。 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANTEEN = path.join(ROOT, 'canteen');
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PORT = process.env.PORT || 8080;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); }
  catch (e) { return []; }
}
function writeOrders(arr) { fs.writeFileSync(ORDERS_FILE, JSON.stringify(arr, null, 2)); }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8'
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

/* 静态文件服务：/canteen/* 取自 canteen 目录，其余取自 workbench 根 */
function serveStatic(req, res, urlPath) {
  let filePath;
  if (urlPath.startsWith('/canteen/')) {
    filePath = path.join(CANTEEN, urlPath.slice('/canteen/'.length));
  } else {
    filePath = path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath);
  }
  // 防目录穿越
  const safe = path.normalize(filePath);
  if (!safe.startsWith(ROOT) && !safe.startsWith(CANTEEN)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(safe, (err, st) => {
    if (err || !st.isFile()) {
      // SPA 兜底
      const fallback = safe.startsWith(CANTEEN) ? path.join(CANTEEN, 'index.html') : path.join(ROOT, 'index.html');
      fs.readFile(fallback, (e2, buf) => {
        if (e2) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(buf);
      });
      return;
    }
    const ext = path.extname(safe).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(safe).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // ---------- API ----------
  if (urlPath.startsWith('/api/')) {
    if (urlPath === '/api/health') return sendJSON(res, 200, { ok: true, time: Date.now() });

    if (urlPath === '/api/orders' && req.method === 'GET') {
      const since = parseInt((req.url.split('?')[1] || '').replace('since=', '')) || 0;
      const all = readOrders();
      const list = all.filter(o => (o.updatedAt || o.createdAt) >= since);
      return sendJSON(res, 200, { orders: list.reverse(), serverTime: Date.now() });
    }
    if (urlPath === '/api/orders' && req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const orders = readOrders();
          const order = {
            id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            items: data.items || [],
            total: data.total || 0,
            table: data.table || '',
            note: data.note || '',
            status: '待接单',          // 待接单 / 已接单 / 已完成 / 已取消
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          orders.push(order);
          writeOrders(orders);
          return sendJSON(res, 201, order);
        } catch (e) { return sendJSON(res, 400, { error: 'invalid body' }); }
      });
      return;
    }
    const m = urlPath.match(/^\/api\/orders\/(.+)$/);
    if (m && req.method === 'PATCH') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const patch = JSON.parse(body);
          const orders = readOrders();
          const idx = orders.findIndex(o => o.id === m[1]);
          if (idx < 0) return sendJSON(res, 404, { error: 'not found' });
          if (patch.status) orders[idx].status = patch.status;
          orders[idx].updatedAt = Date.now();
          writeOrders(orders);
          return sendJSON(res, 200, orders[idx]);
        } catch (e) { return sendJSON(res, 400, { error: 'invalid body' }); }
      });
      return;
    }
    return sendJSON(res, 404, { error: 'not found' });
  }

  // ---------- 静态 ----------
  serveStatic(req, res, urlPath);
});

server.listen(PORT, () => {
  console.log('小小怪食堂后端已启动:');
  console.log('  主工作台  http://localhost:' + PORT + '/');
  console.log('  点菜端    http://localhost:' + PORT + '/canteen/');
});
