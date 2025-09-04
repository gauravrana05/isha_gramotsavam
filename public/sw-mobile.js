/**
 * Mobile-optimized Service Worker
 * Implements caching strategies optimized for mobile devices
 */

const CACHE_NAME = 'gramotsavam-mobile-v1';
const STATIC_CACHE = 'gramotsavam-static-v1';
const DYNAMIC_CACHE = 'gramotsavam-dynamic-v1';
const IMAGE_CACHE = 'gramotsavam-images-v1';
const API_CACHE = 'gramotsavam-api-v1';

// Cache size limits for mobile
const CACHE_LIMITS = {
  [STATIC_CACHE]: 50, // 50 items
  [DYNAMIC_CACHE]: 100, // 100 items
  [IMAGE_CACHE]: 200, // 200 images
  [API_CACHE]: 500 // 500 API responses
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/en/dashboard',
  '/en/mobile/dashboard',
  '/en/mobile/team',
  '/en/mobile/live',
  '/en/mobile/media',
  '/en/mobile/chat',
  '/offline.html',
  '/manifest.json',
  '/icons/android/android-launchericon-192-192.png',
  '/icons/android/android-launchericon-512-512.png'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/trpc\/sync\//,
  /\/api\/trpc\/bulk\//,
  /\/api\/trpc\/teams\./,
  /\/api\/trpc\/matches\./,
  /\/api\/trpc\/notifications\./
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('SW: Installing mobile service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('SW: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating mobile service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/trpc/')) {
    // API requests - Network First with cache fallback
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(request)) {
    // Images - Cache First with network fallback
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request)) {
    // Static assets - Cache First
    event.respondWith(handleStaticRequest(request));
  } else {
    // HTML pages - Network First with cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with mobile-optimized caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API should be cached
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (!shouldCache) {
    return fetch(request);
  }

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      await cache.put(request, networkResponse.clone());
      await limitCacheSize(API_CACHE, CACHE_LIMITS[API_CACHE]);
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('SW: Network failed for API, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical APIs
    if (url.pathname.includes('/sync/') || url.pathname.includes('/bulk/')) {
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'This data will be available when you\'re back online'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle image requests with aggressive caching
async function handleImageRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache images aggressively
      const cache = await caches.open(IMAGE_CACHE);
      await cache.put(request, networkResponse.clone());
      await limitCacheSize(IMAGE_CACHE, CACHE_LIMITS[IMAGE_CACHE]);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Failed to load image:', request.url);
    
    // Return placeholder image for failed loads
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" fill="#999">Image unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Handle static assets
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful page responses
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
      await limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS[DYNAMIC_CACHE]);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed for page, trying cache:', request.url);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    throw error;
  }
}

// Utility functions
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(new URL(request.url).pathname);
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.startsWith('/_next/static/');
}

// Limit cache size to prevent storage issues on mobile
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Remove oldest items (FIFO)
    const itemsToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(itemsToDelete.map(key => cache.delete(key)));
    console.log(`SW: Cleaned up ${itemsToDelete.length} items from ${cacheName}`);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/android/android-launchericon-192-192.png',
    badge: data.badge || '/icons/android/android-launchericon-96-96.png',
    image: data.image,
    data: data.data,
    actions: data.actions,
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked');
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  let url = data.url || '/en/dashboard';
  
  // Handle different actions
  if (action === 'view') {
    url = data.url || '/en/dashboard';
  } else if (action === 'reply') {
    url = '/en/mobile/chat';
  } else if (action === 'dismiss') {
    return; // Just close the notification
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync implementation
async function doBackgroundSync() {
  try {
    console.log('SW: Performing background sync');
    
    // This would sync offline data with the server
    // Implementation depends on your offline storage strategy
    
    // Example: Sync offline mutations
    const response = await fetch('/api/trpc/queue.processMutations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [] }) // Get from IndexedDB
    });
    
    if (response.ok) {
      console.log('SW: Background sync completed successfully');
    }
  } catch (error) {
    console.error('SW: Background sync failed:', error);
    throw error; // This will retry the sync
  }
}
