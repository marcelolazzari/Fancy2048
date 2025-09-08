/**
 * Fancy 2048 - Service Worker
 * Progressive Web App functionality with advanced caching strategies
 */

const CACHE_NAME = 'fancy2048-v1.0.0';
const CACHE_STRATEGY = {
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Core app resources that should be cached
const CORE_ASSETS = [
  './',
  './index.html',
  './pages/',
  './pages/index.html',
  './pages/stats.html',
  './manifest.json',
  './src/css/main.css',
  './src/css/stats.css',
  './src/js/error-handler.js',
  './src/js/app.js',
  './src/js/utils.js',
  './src/js/storage.js',
  './src/js/game-engine.js',
  './src/js/ai-solver.js',
  './src/js/touch-handler.js',
  './src/js/ui-controller.js',
  './src/js/stats.js',
  './src/assets/icon-192.svg',
  './src/assets/icon-512.svg',
  './src/assets/favicon.svg'
];

// Resources that can be cached opportunistically
const OPTIONAL_ASSETS = [
  './robots.txt',
  './sitemap.xml',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
];

// Cache configuration for different resource types
const CACHE_CONFIG = {
  html: {
    strategy: CACHE_STRATEGY.NETWORK_FIRST,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 10
  },
  css: {
    strategy: CACHE_STRATEGY.STALE_WHILE_REVALIDATE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 20
  },
  js: {
    strategy: CACHE_STRATEGY.STALE_WHILE_REVALIDATE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 30
  },
  images: {
    strategy: CACHE_STRATEGY.CACHE_FIRST,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 50
  },
  fonts: {
    strategy: CACHE_STRATEGY.CACHE_FIRST,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 10
  }
};

/**
 * Service Worker Install Event
 * Pre-cache core app resources
 */
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Core assets cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Failed to cache core assets:', error);
      })
  );
});

/**
 * Service Worker Activate Event
 * Clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Cache cleanup completed');
        // Take control of all clients
        return self.clients.claim();
      })
  );
});

/**
 * Service Worker Fetch Event
 * Handle network requests with appropriate caching strategy
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests except for fonts
  if (url.origin !== self.location.origin && !isFontRequest(request)) {
    return;
  }
  
  const resourceType = getResourceType(request);
  const config = CACHE_CONFIG[resourceType] || CACHE_CONFIG.html;
  
  event.respondWith(
    handleRequest(request, config)
      .catch(error => {
        console.error('[ServiceWorker] Request failed:', error);
        return getOfflineFallback(request);
      })
  );
});

/**
 * Handle request based on caching strategy
 */
async function handleRequest(request, config) {
  const cache = await caches.open(CACHE_NAME);
  
  switch (config.strategy) {
    case CACHE_STRATEGY.CACHE_FIRST:
      return cacheFirst(request, cache);
    
    case CACHE_STRATEGY.NETWORK_FIRST:
      return networkFirst(request, cache);
    
    case CACHE_STRATEGY.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cache);
    
    case CACHE_STRATEGY.NETWORK_ONLY:
      return fetch(request);
    
    case CACHE_STRATEGY.CACHE_ONLY:
      return cache.match(request);
    
    default:
      return networkFirst(request, cache);
  }
}

/**
 * Cache First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request, cache) {
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse && !isExpired(cachedResponse)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Network First Strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cache immediately, update in background
 */
async function staleWhileRevalidate(request, cache) {
  const cachedResponse = await cache.match(request);
  
  // Start network request (don't await)
  const networkResponsePromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.log('[ServiceWorker] Background update failed:', error);
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If no cache, wait for network
  return networkResponsePromise;
}

/**
 * Get resource type from request
 */
function getResourceType(request) {
  const url = request.url;
  const extension = url.split('.').pop()?.toLowerCase();
  
  if (request.destination === 'document' || extension === 'html') {
    return 'html';
  }
  
  if (request.destination === 'style' || extension === 'css') {
    return 'css';
  }
  
  if (request.destination === 'script' || extension === 'js') {
    return 'js';
  }
  
  if (request.destination === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return 'images';
  }
  
  if (request.destination === 'font' || ['woff', 'woff2', 'ttf', 'otf'].includes(extension)) {
    return 'fonts';
  }
  
  return 'html';
}

/**
 * Check if request is for fonts
 */
function isFontRequest(request) {
  return request.destination === 'font' || 
         request.url.includes('fonts.googleapis.com') ||
         request.url.includes('fonts.gstatic.com');
}

/**
 * Check if cached response is expired
 */
function isExpired(response) {
  const cacheTime = response.headers.get('sw-cache-time');
  if (!cacheTime) return false;
  
  const age = Date.now() - parseInt(cacheTime);
  const resourceType = getResourceType({ url: response.url });
  const config = CACHE_CONFIG[resourceType] || CACHE_CONFIG.html;
  
  return age > config.maxAge;
}

/**
 * Add cache timestamp to response
 */
function addCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-time', Date.now().toString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Get offline fallback for failed requests
 */
async function getOfflineFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try to get cached version
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // For HTML requests, return the main game page
  if (request.destination === 'document') {
    const mainPage = await cache.match('./pages/index.html') || 
                     await cache.match('./pages/') || 
                     await cache.match('./index.html') || 
                     await cache.match('./');
    if (mainPage) {
      return mainPage;
    }
  }
  
  // For other resources, return a generic offline response
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}

/**
 * Background Sync for game data
 */
self.addEventListener('sync', event => {
  if (event.tag === 'game-data-sync') {
    event.waitUntil(syncGameData());
  }
});

/**
 * Sync game data when connection is restored
 */
async function syncGameData() {
  try {
    // Get pending game data from IndexedDB or localStorage
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_GAME_DATA',
        timestamp: Date.now()
      });
    });
    
    console.log('[ServiceWorker] Game data sync completed');
  } catch (error) {
    console.error('[ServiceWorker] Game data sync failed:', error);
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New achievement unlocked!',
    icon: '/src/assets/icon-192.svg',
    badge: '/src/assets/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: './'
    },
    actions: [
      {
        action: 'open',
        title: 'Open Game',
        icon: '/src/assets/icon-192.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/src/assets/icon-192.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Fancy 2048', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url || './')
    );
  }
});

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    
    case 'CLAIM_CLIENTS':
      self.clients.claim();
      break;
    
    case 'CACHE_GAME_DATA':
      cacheGameData(payload);
      break;
    
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

/**
 * Cache game data manually
 */
async function cacheGameData(data) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'sw-cache-time': Date.now().toString()
      }
    });
    
    await cache.put('./game-data', response);
    console.log('[ServiceWorker] Game data cached');
  } catch (error) {
    console.error('[ServiceWorker] Failed to cache game data:', error);
  }
}

/**
 * Get current cache status
 */
async function getCacheStatus() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    return {
      name: CACHE_NAME,
      size: keys.length,
      assets: keys.map(request => request.url)
    };
  } catch (error) {
    console.error('[ServiceWorker] Failed to get cache status:', error);
    return null;
  }
}

console.log('[ServiceWorker] Script loaded');
