const CACHE_NAME = 'nereapp-cache-v5';

const ASSETS_TO_CACHE = [
  './',
  './manifest.json',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// Quita la marca "redirected" para que se pueda servir desde el SW
async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Uno a uno: si un archivo falla, no se rompe toda la instalación
      await Promise.all(ASSETS_TO_CACHE.map(async (url) => {
        try {
          const res = await fetch(url, { redirect: 'follow' });
          if (res.ok) await cache.put(url, await cleanResponse(res));
        } catch (e) { /* ignorar */ }
      }));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Navegaciones: red primero, caché solo si no hay conexión
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(async () => {
        const cached = await caches.match('./');
        return cached || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Resto: caché primero, luego red
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then(async (res) => {
        if (res && res.ok) {
          const clean = await cleanResponse(res.clone());
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, clean);
        }
        return res;
      });
    })
  );
});
