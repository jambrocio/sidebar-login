/**
 * Service Worker PWA — COTIC: SISTEMA POS & GESTIÓN DE PRODUCTOS
 * Provee soporte offline básico sin interferir con la actualización de versiones ni la API.
 */
const CACHE_NAME = 'cotic-pwa-v2.4.1';
const APP_SHELL_ASSETS = ['/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(oldKey => caches.delete(oldKey))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. NUNCA interceptar peticiones al backend, actuator, health, ni a la verificación de versión o sw
  if (
    url.port === '8080' ||
    url.port === '8081' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/actuator/') ||
    url.pathname.includes('/health') ||
    url.pathname === '/version.json' ||
    url.pathname === '/sw.js' ||
    url.pathname === '/' ||
    url.pathname === '/index.html' ||
    url.origin !== self.location.origin
  ) {
    return; // Bypass total al navegador y al servidor Nginx
  }

  // 2. Para otros recursos estáticos (fuentes, iconos): Cache con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
