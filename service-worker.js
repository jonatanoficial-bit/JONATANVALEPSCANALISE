/*
 * A simple service worker to enable offline caching for the
 * Jonatan Vale Psicanálise PWA. It caches the core pages and assets
 * during installation and serves them from the cache on subsequent
 * requests. Additional requests fall back to the network.
 */

const CACHE_NAME = 'jonatan-psicanalise-cache-v1';

// List of files to precache. Be sure to update this list when you
// add new assets or pages. These paths are relative to the site root.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/style.css',
  '/script.js',
  '/assets/logo.png',
  '/assets/headshot.png',
  '/assets/library.png',
  '/assets/elegant.png',
  '/assets/studio.png',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png'
];

// Install event: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate event: clear old caches if necessary
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: respond with cached assets when possible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});