// PWA Service Worker for TimeMachine
const CACHE_NAME = 'timemachine-v5'; // Bump version to force update
const urlsToCache = [
  // Don't cache index.html (/) - let it always fetch fresh
  './manifest.json',
  './logo.png',
  './favicon.ico'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first for HTML, cache first for assets
self.addEventListener('fetch', (event) => {
  // Skip API requests - let them go directly to the network
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Network-first strategy for HTML documents (including /)
  if (event.request.mode === 'navigate' || event.request.url.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Don't cache HTML files
          return response;
        })
        .catch(() => {
          // If offline and request fails, try cache as fallback
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Don't cache JavaScript and CSS files to prevent component loading issues
  if (event.request.url.endsWith('.js') || event.request.url.endsWith('.css')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Cache-first strategy for other static assets (images, fonts, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((fetchResponse) => {
          // Cache new assets (except JS/CSS)
          return caches.open(CACHE_NAME).then((cache) => {
            // Only cache successful responses and non-JS/CSS files
            if (fetchResponse.status === 200) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
  );
});