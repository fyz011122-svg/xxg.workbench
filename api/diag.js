/* GET /api/diag —— 诊断 Blob 读写（用独立探针文件，绝不碰真实 orders.json） */
const { put, head, get, del } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const out = { hasToken: !!process.env.BLOB_READ_WRITE_TOKEN, steps: [] };
  const KEY = 'diag-probe.json';
  try {
    await put(KEY, JSON.stringify({ t: Date.now() }), {
      access: 'private', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0, contentType: 'application/json'
    });
    out.steps.push('写入探针: ok');
    let found = false, text = '';
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1600));
      const meta = await head(KEY);
      const result = await get(meta.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      text = await result.blob.text();
      out.steps.push('第' + (i + 1) + '次读回(' + ((i + 1) * 1.6).toFixed(1) + '秒后): ' + (text && text.length > 2 ? '有数据✓' : '空'));
      if (text && text.length > 2) { found = true; break; }
    }
    out.ok = found;
    if (!found) out.steps.push('✗ 8秒内仍读不到');
  } catch (e) {
    out.ok = false;
    out.error = e && e.message ? e.message : String(e);
    if (e && e.code) out.code = e.code;
  } finally {
    try { const m = await head(KEY); await del(m.url, { token: process.env.BLOB_READ_WRITE_TOKEN }); out.steps.push('已清理探针文件'); } catch (_) {}
  }
  res.status(200).json(out);
};
