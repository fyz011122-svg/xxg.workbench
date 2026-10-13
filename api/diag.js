/* GET /api/diag —— 诊断订单读写（用真实逻辑，测完恢复，不污染 orders.json） */
const { readOrders, writeOrders } = require('./_store');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const out = { hasToken: !!process.env.BLOB_READ_WRITE_TOKEN, steps: [] };
  try {
    const before = await readOrders();
    out.steps.push('读取现有订单: ' + (Array.isArray(before) ? before.length + ' 条' : String(before)));
    const probe = { id: 'diag_' + Date.now(), items: [{ name: '探针菜' }], total: 1, status: '待接单', createdAt: Date.now(), updatedAt: Date.now() };
    const list = Array.isArray(before) ? before : [];
    list.push(probe);
    await writeOrders(list);
    out.steps.push('写入探针: ok');
    // 存储层可能有秒级同步延迟，最多等 ~8 秒轮询读回
    let found = false, after = null;
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1600));
      after = await readOrders();
      found = Array.isArray(after) && after.some((o) => o.id === probe.id);
      out.steps.push('第' + (i + 1) + '次读回(' + ((i + 1) * 1.6).toFixed(1) + '秒后): ' + (Array.isArray(after) ? after.length + ' 条' + (found ? '，含探针✓' : '') : String(after)));
      if (found) break;
    }
    out.ok = found;
    if (!found) out.steps.push('✗ 8秒内始终读不到探针');
    // 恢复：移除探针，写回原数据（不污染真实订单）
    if (Array.isArray(before)) { await writeOrders(before); out.steps.push('已恢复原数据'); }
  } catch (e) {
    out.ok = false;
    out.error = e && e.message ? e.message : String(e);
    if (e && e.code) out.code = e.code;
  }
  res.status(200).json(out);
};
