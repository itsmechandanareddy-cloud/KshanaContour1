const CACHE_NAME = 'kshana-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Skip non-http requests (chrome-extension, etc)
  if (!url.startsWith('http')) return;
  // Skip POST/PUT/DELETE requests
  if (event.request.method !== 'GET') return;
  // Network-first for API calls
  if (url.includes('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  // Network-first for everything else (ensure fresh content)
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => {}));
      }
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || new Response('', { status: 503 })))
  );
});
