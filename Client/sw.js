const CACHE_NAME = 'vetlogic-v1';
// Basic assets to cache for offline capabilities
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Simple cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});