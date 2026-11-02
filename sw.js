// Cache-first para que la app funcione sin conexión. Subí VERSION al cambiar archivos.
const VERSION = 'v1';
const CACHE = `tri703-${VERSION}`;
const ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'plan.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first para el plan (así llegan semanas nuevas), cache-first para el resto.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const networkFirst = url.pathname.endsWith('plan.js') || url.pathname.endsWith('app.js') || e.request.mode === 'navigate';
  if (networkFirst) {
    e.respondWith(
      fetch(e.request)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
    );
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
