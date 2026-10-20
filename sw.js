// Sınıf Defterim — çevrimdışı çalışma için önbellek
// Güncelleme yaptığında aşağıdaki sürüm numarasını artır.
const VERSION = 'artieksi-v18';
const FILES = ['./', './index.html', './manifest.webmanifest', './sd-icon-180.png', './sd-icon-192.png', './sd-icon-512.png', './pdf.min.js', './pdf.worker.min.js'];

// Kurulurken dosyaları tarayıcı önbelleğini atlayarak indir (eski kopya gelmesin).
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => { if (r.ok) return c.put(f, r); }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const online = self.navigator ? self.navigator.onLine : true;
  const isPage = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');

  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true }) || (isPage ? await cache.match('./index.html') : null);
    // İnternet yoksa hiç ağa çıkma (iPhone uçak modunda uyarı göstermesin).
    if (!online && hit) return hit;
    if (isPage) {
      // Sayfa: önce internetten en yeni sürüm (en fazla 3 sn), olmazsa telefondaki kopya.
      try {
        const res = await Promise.race([fetch(e.request, { cache: 'no-cache' }), timeout(3000)]);
        if (res && res.ok) { cache.put('./index.html', res.clone()); return res; }
      } catch (err) {}
      return hit || fetch(e.request);
    }
    // Diğer dosyalar: telefondaki kopya, arkada tazele.
    const net = fetch(e.request, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
