const CACHE_NAME = 'megami-cache-v1';
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

// Cache-first for core app files; network-first for everything else (e.g. fonts, external images)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isCore = url.origin === location.origin;

  if (isCore) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(networkResp => {
          if (networkResp && networkResp.status === 200) {
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return networkResp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  } else {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});
