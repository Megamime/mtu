const CACHE_NAME = 'megami-cache-v2';
const CORE_ASSETS = [
  './index.html',
  './desktop.html',
  './mobile.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Core dosyalar için: önce ağdan dene (her zaman en güncel sürüm), başarısız olursa (offline) cache'e düş.
// Diğer her şey için de aynı mantık.
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(networkResp => {
      if (networkResp && networkResp.status === 200) {
        const clone = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return networkResp;
    }).catch(() => caches.match(e.request))
  );
});
