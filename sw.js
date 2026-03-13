// ── NAVA PEACE · Service Worker ───────────────────────────────────────────────
// Handles Web Push notifications so users get reminded even when app is closed.

const CACHE_NAME = 'nava-peace-v1';

// ── INSTALL ───────────────────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── PUSH ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', function (event) {
  let payload = { title: 'NAVA PEACE', body: 'Time to choose peace today 🕊', url: '/peace.html' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:     payload.body,
      icon:     '/logo.png',
      badge:    '/logo.png',
      tag:      'nava-peace-reminder',   // replaces previous notif of same type
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: payload.url },
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = event.notification.data?.url || '/peace.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus existing tab if already open
      for (const client of list) {
        if (client.url.includes('nava-peace.app') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      // Otherwise open new tab
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
