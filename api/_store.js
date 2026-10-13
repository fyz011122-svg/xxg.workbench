/* 订单存储（Vercel Blob）：所有 Serverless 函数共用 */
const { put, head } = require('@vercel/blob');
const KEY = 'orders.json';

async function readOrders() {
  // 未连接 Blob 存储时返回 null，由调用方给出友好提示
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(KEY);
    // 私有库用 downloadUrl（临时签名地址）；公开库两者等价
    const res = await fetch(meta.downloadUrl || meta.url, { cache: 'no-store' });
    const text = await res.text();
    const arr = JSON.parse(text || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return []; // 文件尚不存在
  }
}

async function writeOrders(arr) {
  // 私有库写入（新版 SDK 支持 access: 'private'）
  // allowOverwrite: true —— 文件名固定为 orders.json，每次写入允许覆盖旧内容，
  // 否则文件已存在时会抛 BlobError（重试 3 次后失败）
  await put(KEY, JSON.stringify(arr), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
}

module.exports = { readOrders, writeOrders };
