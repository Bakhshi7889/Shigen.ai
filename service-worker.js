const CACHE_NAME = 'shigen-chat-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.js',
  '/manifest.json',
  '/logo.svg',
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/client',
  'https://esm.sh/react@^19.1.0/jsx-runtime'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Use addAll for atomic operation, but be mindful of failures.
        // A more robust approach might add URLs individually and handle failures.
        return cache.addAll(urlsToCache).catch(error => {
            console.error('Failed to cache one or more resources during install', error);
        });
      })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  
  // For navigation requests, use a network-first strategy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests (CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then(networkResponse => {
        // Don't cache API calls or other non-static assets
        if (request.url.includes('pollinations.ai') || request.url.includes('chrome-extension')) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
          // If both cache and network fail, you can provide a generic fallback.
          // For now, we'll just let the browser handle the failed fetch.
      });
    })
  );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
