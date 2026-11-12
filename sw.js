const CACHE_NAME = 'aesh-cache-v15'; // <-- CAMBIADO A v15
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
        return Promise.all(
            ASSETS.map(url => cache.add(url).catch(err => console.warn('Fallo al cachear:', url, err)))
        );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).then((networkRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkRes.clone());
          return networkRes;
        });
      });
    }).catch(() => {
        if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
        }
    })
  );
});
