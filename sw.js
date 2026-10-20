// Sınıf Defterim — çevrimdışı çalışma için önbellek
// Güncelleme yaptığında aşağıdaki sürüm numarasını artır.
const VERSION = 'artieksi-v12';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './pdf.min.js', './pdf.worker.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Önce önbellekten aç (internetsiz çalışır). İnternet varsa arkada yeni sürümü indir;
// yoksa hiç ağa çıkma (iPhone uçak modunda uyarı göstermesin).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const online = self.navigator ? self.navigator.onLine : true;
  e.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(e.request, { ignoreSearch: true }).then(hit => {
        if (hit && !online) return hit;
        const net = fetch(e.request).then(res => {
          if (res && res.ok && new URL(e.request.url).origin === location.origin) cache.put(e.request, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
