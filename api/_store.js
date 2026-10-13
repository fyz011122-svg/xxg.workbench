/* 订单存储（Vercel Blob）：所有 Serverless 函数共用 */
const { put, head, get } = require('@vercel/blob');
const KEY = 'orders.json';

// 读取指定 blob 的文本内容（兼容不同环境下 get() 返回的类型差异）
async function readBlobText(url) {
  const result = await get(url, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    access: 'private',
    useCache: false
  });
  if (!result || !result.blob) return '';
  const b = result.blob;
  if (typeof b.text === 'function') return await b.text();
  if (typeof b === 'string') return b;
  return Buffer.from(b).toString('utf8');
}

async function readOrders() {
  // 未连接 Blob 存储时返回 null，由调用方给出友好提示
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(KEY);
    const text = await readBlobText(meta.url);
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

module.exports = { readOrders, writeOrders, readBlobText };
