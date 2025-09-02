const CACHE_NAME = 'fancy2048-v1.0.0';
const urlsToCache = [
  './',
  './pages/index.html',
  './pages/leaderboard.html',
  './styles/main.css',
  './styles/leaderboard.css',
  './scripts/game.js',
  './scripts/enhanced_ai.js',
  './scripts/advanced_ai_solver.js',
  './scripts/ai_learning_system.js',
  './scripts/logger.js',
  './scripts/statistics.js',
  './scripts/leaderboard-stats.js',
  './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🔧 Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('🚨 Service Worker: Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((fetchResponse) => {
            // Don't cache non-successful responses
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response for caching
            const responseToCache = fetchResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          });
      })
      .catch((error) => {
        console.error('🚨 Service Worker: Fetch failed:', error);
        // Return a fallback page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('./pages/index.html');
        }
      })
  );
});

// Background sync for game statistics (when online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-stats') {
    event.waitUntil(syncGameStats());
  }
});

// Function to sync game statistics
async function syncGameStats() {
  try {
    // This could sync stats to a server when implemented
    console.log('🔄 Service Worker: Syncing game statistics');
    // For now, just log that sync would happen
  } catch (error) {
    console.error('🚨 Service Worker: Stats sync failed:', error);
  }
}

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: './manifest.json',
      badge: './manifest.json',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };
    
    event.waitUntil(
      self.registration.showNotification('Fancy2048', options)
    );
  }
});
