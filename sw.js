const CACHE_NAME = 'taxi-study-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './data.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
  ];

self.addEventListener('install', (event) => {
    event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => {
                  console.log('Caching assets');
                  return cache.addAll(ASSETS);
          }).then(() => self.skipWaiting())
        );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
          caches.keys().then((cacheNames) => {
                  return Promise.all(
                            cacheNames.map((cacheName) => {
                                        if (cacheName !== CACHE_NAME) {
                                                      console.log('Deleting old cache:', cacheName);
                                                      return caches.delete(cacheName);
                                        }
                            })
                          );
          })
        );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
          caches.match(event.request).then((response) => {
                  return response || fetch(event.request);
          })
        );
});
