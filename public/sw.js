const CACHE = 'meal-tracker-shell-v4';
const APP_SHELL = ['/', '/manifest.webmanifest', '/meal-tracker-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Authentication and Neon Data API calls are cross-origin. Let the browser
  // handle their cookies and CORS directly, especially in iOS standalone PWAs.
  if (new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(data.title ?? 'Meal Tracker', {
    body: data.body ?? 'Tens um novo lembrete.',
    icon: '/meal-tracker-icon.svg',
    badge: '/meal-tracker-icon.svg',
    data: { url: data.url ?? '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/'));
});
