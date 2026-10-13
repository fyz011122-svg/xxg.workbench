const CACHE = 'canteen-v3';
const ASSETS = [
  '/canteen/', '/canteen/index.html', '/canteen/manifest.webmanifest',
  '/canteen/assets/style.css', '/canteen/assets/db.js', '/canteen/assets/app.js',
  '/canteen/icons/icon-192.png', '/canteen/icons/icon-512.png'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // API 不缓存
  // 网络优先：先取最新文件，失败才用缓存（保证更新能立即生效）
  e.respondWith(fetch(e.request).then(res => {
    if (res && res.status === 200 && res.type === 'basic') { const cl = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
