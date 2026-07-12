// ── NAVA PEACE · Service Worker ───────────────────────────────────────────────
// Handles: Push notifications + Static asset caching (PWA offline support)

const CACHE_VERSION = 'nava-peace-v6';
const STATIC_ASSETS = [
  '/',
  '/peace.html',
  '/splash.html',
  '/profile.html',
  '/market.html',
  '/wallet.html',
  '/stats.html',
  '/map.html',
  '/about.html',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/nasalization.woff',
  '/telegram.js',
  '/supabase_config.js',
  '/discovery.js',
  '/share-card.js',
  '/lang.js',
];

// ── INSTALL — pre-cache static shell ─────────────────────────────────────────
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function() {
        // Ignore individual failures (some assets may not exist yet)
      });
    })
  );
});

// ── ACTIVATE — delete old caches ─────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_VERSION; })
            .map(function(k)   { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// ── FETCH — network-first for API, cache-first for static ────────────────────
self.addEventListener('fetch', function(event) {
  const url = event.request.url;

  // Never intercept: Supabase, Telegram API, external CDNs
  if (url.includes('supabase.co') ||
      url.includes('telegram.org') ||
      url.includes('api.telegram.org') ||
      url.includes('cdn.jsdelivr.net') ||
      !url.startsWith('https://nava-peace.app')) {
    return;
  }

  event.respondWith(
    // Network first — fallback to cache
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && event.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(function(cache) { cache.put(event.request, clone); });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});

// ── PUSH ──────────────────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  let payload = { title: 'NAVA PEACE', body: 'Time to choose peace today 🕊', url: '/peace.html' };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:     payload.body,
      icon:     '/icon-192.png',
      badge:    '/icon-192.png',
      tag:      'nava-peace-reminder',
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: payload.url },
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const target = event.notification.data?.url || '/peace.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (const client of list) {
        if (client.url.includes('nava-peace.app') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
