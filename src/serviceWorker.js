const CACHE_NAME = 'fobi-cache-v1';
const urlsToCache = [
  '/',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/assets/icon/icon.png',
  '/assets/icon/kupnes.png',
  '/assets/icon/FOBI.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
}); 