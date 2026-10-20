// Bump CACHE on every deploy so clients pick up the new files.
const CACHE = 'nato-drill-v5';

const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'fonts/black-ops-one-400.woff2',
  'fonts/ibm-plex-mono-400.woff2',
  'fonts/ibm-plex-mono-600.woff2',
  'icons/apple-touch-icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

const INDEX_URL = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('nato-drill-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      if (req.mode === 'navigate') {
        const index = await cache.match(INDEX_URL);
        if (index) return index;
      }
      throw err;
    }
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const port = event.ports && event.ports[0];
  if (data.type === 'skip-waiting') {
    self.skipWaiting();
  } else if (data.type === 'check-offline' && port) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const found = await Promise.all(ASSETS.map((url) => cache.match(url)));
      port.postMessage({ ok: found.every(Boolean), cache: CACHE });
    })());
  }
});
