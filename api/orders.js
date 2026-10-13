/* GET /api/orders?since=  拉取订单（新→旧）
   POST /api/orders       创建订单 */
const { readOrders, writeOrders } = require('./_store');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  await new Promise((resolve) => {
    req.on('data', (c) => { raw += c; });
    req.on('end', resolve);
  });
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const orders = await readOrders();
  if (orders === null) {
    return res.status(503).json({ error: 'Blob 存储未连接：请在 Vercel 项目 → Storage 里创建 Blob 并连接后重新部署' });
  }

  if (req.method === 'GET') {
    const since = parseInt((req.query && req.query.since) || 0) || 0;
    const list = orders.filter((o) => (o.updatedAt || o.createdAt) >= since).reverse();
    return res.status(200).json({ orders: list, serverTime: Date.now() });
  }

  if (req.method === 'POST') {
    try {
      const data = await readBody(req);
      const order = {
        id: 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        items: Array.isArray(data.items) ? data.items : [],
        total: Number(data.total) || 0,
        table: data.table || '',
        note: data.note || '',
        status: '待接单',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      orders.push(order);
      await writeOrders(orders);
      return res.status(201).json(order);
    } catch (e) {
      console.error('[下单失败]', e);
      // 把具体错误返回给前端，方便排查
      return res.status(500).json({ error: '下单失败：' + (e && e.message ? e.message : String(e)) });
    }
  }

  res.status(405).json({ error: 'method not allowed' });
};
