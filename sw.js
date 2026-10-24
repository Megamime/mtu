const CACHE_NAME = 'megami-cache-v21';
const FONT_CACHE = 'megami-fonts-v1';
const NETWORK_TIMEOUT_MS = 3000;
const CORE_ASSETS = [
  './',
  './index.html',
  './desktop.html',
  './mobile.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== FONT_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Uygulama dosyaları: önce ağdan dene (her zaman en güncel sürüm), ama ağ NETWORK_TIMEOUT_MS içinde
// cevap vermezse (zayıf/asılı bağlantı) cache'teki sürümle hemen aç. Eskiden ağ asılı kalırsa uygulama da asılı kalıyordu.
function networkFirst(request) {
  return new Promise(resolve => {
    let settled = false;
    const fromCache = () => caches.match(request, { ignoreSearch: true });
    const timer = setTimeout(() => {
      fromCache().then(hit => { if (hit && !settled) { settled = true; resolve(hit); } });
    }, NETWORK_TIMEOUT_MS);
    fetch(request).then(resp => {
      clearTimeout(timer);
      if (resp && resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {});
      }
      if (!settled) { settled = true; resolve(resp); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then(hit => {
        if (settled) return;
        settled = true;
        resolve(hit || Response.error());
      });
    });
  });
}

// Google Fonts (CSS + font dosyaları): değişmezler, ilk indirmeden sonra cache'ten anında gelir; çevrimdışı da çalışır.
function cacheFirstFonts(request) {
  return caches.open(FONT_CACHE).then(cache =>
    cache.match(request).then(hit => hit || fetch(request).then(resp => {
      if (resp && (resp.status === 200 || resp.type === 'opaque')) cache.put(request, resp.clone()).catch(() => {});
      return resp;
    }))
  );
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirstFonts(req).catch(() => fetch(req)));
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith(networkFirst(req));
});
