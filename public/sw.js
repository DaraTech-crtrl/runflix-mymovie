// PWA service worker — installability + offline navigation fallback
const CACHE_SHELL = 'runflix-shell-v5';
const SHELL_URLS = ['/offline.html', '/favicon.png', '/manifest.json', '/logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_SHELL).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Only handle http/https schemes
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Bypass service worker for API, proxies, and dynamic server state (never cache these)
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/img-proxy') ||
    url.pathname.startsWith('/api_proxy') ||
    url.pathname.includes('maintenance_api.php') ||
    url.pathname.includes('analytics_api.php') ||
    url.pathname.includes('admin_auth_api.php') ||
    url.pathname.includes('watch_progress_api.php') ||
    url.pathname.endsWith('/maintenance.json') ||
    url.pathname.endsWith('/analytics.json') ||
    url.pathname.endsWith('/watch_progress.json')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Strictly only intercept real navigations for the offline fallback shell
      if (request.mode === 'navigate') {
        return fetch(request).catch(() => {
          return caches.match('/offline.html').then((cached) => {
            return (
              cached ||
              new Response('Offline — check your connection and retry.', {
                status: 503,
                headers: { 'Content-Type': 'text/html' },
              })
            );
          });
        });
      }

      return fetch(request).catch(() => {
        // Return a basic error response instead of throwing/rejecting uncaught promise
        return new Response('Network error occurred', {
          status: 488,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
