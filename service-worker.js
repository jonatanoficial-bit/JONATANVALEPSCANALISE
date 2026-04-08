const CACHE_NAME = 'jonatan-psicanalise-cache-v2';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './about.html',
  './retorno.html',
  './style.css',
  './script.js',
  './site-config.js',
  './manifest.json',
  './assets/logo.png',
  './assets/headshot.png',
  './assets/library.png',
  './assets/elegant.png',
  './assets/studio.png',
  './assets/icon-192x192.png',
  './assets/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }
        return null;
      })
    ))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
