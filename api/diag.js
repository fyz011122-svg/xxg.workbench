/* GET /api/diag —— 诊断 Blob 写入/读取能力（用独立探针文件，不污染 orders.json） */
const { put, head, del } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  const out = { hasToken: !!process.env.BLOB_READ_WRITE_TOKEN, steps: [] };
  const KEY = 'diag-probe.json';
  try {
    await put(KEY, JSON.stringify({ t: Date.now() }), {
      access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
    });
    out.steps.push('put: ok');
    const meta = await head(KEY);
    out.steps.push('head: ok');
    const r = await fetch(meta.downloadUrl || meta.url, { cache: 'no-store' });
    out.steps.push('read status: ' + r.status);
    out.readBack = (await r.text()).slice(0, 200);
    try { await del(meta.url || meta.downloadUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }); out.steps.push('del: ok'); }
    catch (e) { out.steps.push('del warn: ' + e.message); }
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = e && e.message ? e.message : String(e);
    if (e && e.code) out.code = e.code;
    if (e && e.stack) out.stack = (e.stack || '').split('\n').slice(0, 4).join(' | ');
  }
  res.status(200).json(out);
};
