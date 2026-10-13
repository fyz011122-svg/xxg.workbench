/* PATCH /api/orders/:id  更新订单状态 */
const { readOrders, writeOrders } = require('../_store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'method not allowed' });

  const orders = await readOrders();
  if (orders === null) {
    return res.status(503).json({ error: 'Blob 存储未连接：请在 Vercel 项目 → Storage 里创建 Blob 并连接后重新部署' });
  }

  const id = req.query.id;
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });

  const patch = req.body && typeof req.body === 'object' ? req.body : {};
  if (patch.status) orders[idx].status = patch.status;
  orders[idx].updatedAt = Date.now();
  await writeOrders(orders);
  res.status(200).json(orders[idx]);
};
