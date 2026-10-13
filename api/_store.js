/* 订单存储（Vercel Blob）：所有 Serverless 函数共用 */
const { put, head } = require('@vercel/blob');
const KEY = 'orders.json';

async function readOrders() {
  // 未连接 Blob 存储时返回 null，由调用方给出友好提示
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(KEY);
    const res = await fetch(meta.url, { cache: 'no-store' });
    const text = await res.text();
    const arr = JSON.parse(text || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return []; // 文件尚不存在
  }
}

async function writeOrders(arr) {
  await put(KEY, JSON.stringify(arr), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json'
  });
}

module.exports = { readOrders, writeOrders };
