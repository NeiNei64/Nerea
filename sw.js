// 1. IMPORTANTE: Cambia el nombre de la versión de la caché cada vez que subas cambios
// Esto obliga al navegador a borrar la caché vieja y descargar la nueva.
const CACHE_NAME = 'nereapp-cache-v2'; 

// Archivos que se guardarán en caché para que la app funcione offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // Añade aquí el resto de tus iconos si quieres asegurarte de que se guarden
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png',
  './icons/apple-touch-icon.png'
];

// Evento de instalación: guarda los archivos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting(); // Fuerza la activación del nuevo Service Worker
    })
  );
});

// Evento de activación: limpia las cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Toma el control de las pestañas abiertas inmediatamente
    })
  );
});

// Evento fetch: intercepta las peticiones
self.addEventListener('fetch', (event) => {
  // Solo interceptamos peticiones GET (no POST, etc.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Si está en caché, lo devuelve
      }

      // Si no está en caché, lo busca en la red
      return fetch(event.request).then((networkResponse) => {
        
        // ✅ SOLUCIÓN CLOUDFLARE: Si la respuesta es una redirección, la limpiamos antes de guardarla
        let responseToCache = networkResponse;
        if (networkResponse.redirected) {
          responseToCache = new Response(networkResponse.body, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers: networkResponse.headers
          });
        }

        // Guardamos la respuesta limpia en la caché
        if (networkResponse.status === 200) {
          const responseClone = responseToCache.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        
        return networkResponse;
      }).catch(() => {
        // Si falla la red (offline), y es una petición de página, devolvemos el index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
