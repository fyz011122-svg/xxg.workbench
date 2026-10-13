/* 订单存储（Vercel Blob）：所有 Serverless 函数共用 */
const { put, head, get } = require('@vercel/blob');
const KEY = 'orders.json';

async function readOrders() {
  // 未连接 Blob 存储时返回 null，由调用方给出友好提示
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(KEY);
    // 私有库必须用官方 get()：access 必填；useCache:false 绕过 CDN 缓存保证读到最新
    const result = await get(meta.url, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
      access: 'private',
      useCache: false
    });
    if (!result) return [];
    const text = await result.blob.text();
    const arr = JSON.parse(text || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return []; // 文件尚不存在
  }
}

async function writeOrders(arr) {
  // allowOverwrite: 固定文件名覆盖写入
  // cacheControlMaxAge: 0 —— 关键！禁止 CDN 缓存，否则写完立刻读会拿到旧缓存数据
  await put(KEY, JSON.stringify(arr), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    contentType: 'application/json'
  });
}

module.exports = { readOrders, writeOrders };
