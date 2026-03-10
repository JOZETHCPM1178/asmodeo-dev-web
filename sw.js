const CACHE = 'asmodeo-v3';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { self.clients.claim(); });

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('firestore') || e.request.url.includes('googleapis') || e.request.url.includes('cloudinary')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// Notificación push con imagen miniatura
self.addEventListener('push', e => {
  const d = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(d.title || '⚡ ASMODEO DEV', {
    body: d.body || '¡Nueva publicación disponible!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    image: d.image || null,
    data: { url: d.url || '/' },
    vibrate: [200, 100, 200],
    tag: 'asmodeo-notif',
    renotify: true
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
