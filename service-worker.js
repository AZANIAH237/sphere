const CACHE_NAME = 'code-manager-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// URLs of online icons to cache
const onlineIcons = [
  'https://img.icons8.com/color/96/000000/wifi-logo.png',
  'https://img.icons8.com/color/144/000000/wifi-logo.png',
  'https://img.icons8.com/color/192/000000/wifi-logo.png',
  'https://img.icons8.com/color/512/000000/wifi-logo.png'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache local files
        return cache.addAll(urlsToCache)
          .then(() => {
            // Cache online icons
            return Promise.all(
              onlineIcons.map(iconUrl => 
                fetch(iconUrl)
                  .then(response => cache.put(iconUrl, response))
                  .catch(err => console.log('Failed to cache icon:', iconUrl, err))
              )
            );
          });
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
  // Skip cross-origin requests (like external icons on first load)
  if (event.request.url.startsWith('http') && !event.request.url.startsWith(self.location.origin)) {
    // For online icons, try cache first, then network
    if (onlineIcons.includes(event.request.url)) {
      event.respondWith(
        caches.match(event.request)
          .then(response => response || fetch(event.request))
      );
    }
    return;
  }
  
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
    icon: 'https://img.icons8.com/color/192/000000/wifi-logo.png',
    badge: 'https://img.icons8.com/color/96/000000/wifi-logo.png',
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
