/**
 * Service Worker PWA — BevAdmin Pro (Multi-Tienda & Arqueo de Caja)
 * Provee caché de activos estáticos exclusivamente para el App Shell del Frontend.
 */
const CACHE_NAME = 'bevadmin-pwa-v2';
const APP_SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.ico'];

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

  // 1. NUNCA interceptar peticiones a la API del backend, actuador, healthcheck o puertos de microservicios
  if (
    url.port === '8080' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/actuator/') ||
    url.pathname.includes('/health') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 2. Manejo de activos estáticos del frontend
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) {
            return cached;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
      )
  );
});
