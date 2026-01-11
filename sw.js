const CACHE_NAME = 'code-manager-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate and clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Background sync for notifications
self.addEventListener('sync', event => {
  if (event.tag === 'check-expirations') {
    event.waitUntil(checkExpiredCodes());
  }
});

// Periodic background sync for code expiration checks
async function checkExpiredCodes() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'CHECK_EXPIRATIONS'
    });
  });
}

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Code Manager';
  const options = {
    body: data.body || 'Notification from Code Manager',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
