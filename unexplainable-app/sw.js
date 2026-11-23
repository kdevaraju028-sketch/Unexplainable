// Bump CACHE name whenever you change index.html so phones pick up the update.
const CACHE = 'unexplainable-v30';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-32.png', './three.module.min.js', './firebase-app-compat.js', './firebase-auth-compat.js', './firebase-firestore-compat.js', './firebase-messaging-compat.js', './firebase-config.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Open instantly from cache (works offline), refresh the cache quietly in the background.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => cached || caches.match('./index.html'));
      return cached || net;
    })
  );
});

// A push message arrived (this also works when the app is closed)
self.addEventListener('push', e => {
  let p = {}; try { const j = e.data ? e.data.json() : {}; p = j.data || j || {}; } catch (x) {}
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.some(c => c.visibilityState === 'visible' && c.focused)) return;          // the app is open in front and shows its own banner
    const call = p.kind === 'call';
    await self.registration.showNotification(p.title || 'UNEXPLAINABLE', {
      body: p.body || '', tag: p.tag || 'unex', icon: 'icon-192.png', badge: 'favicon-32.png', renotify: true, requireInteraction: true,
      vibrate: call ? [400, 200, 400, 200, 400] : [150, 80, 150], data: { kind: p.kind, rid: p.rid, id: p.id }
    });
  })());
});
// Tapping a notification brings the app to the front and opens the chat
self.addEventListener('notificationclick', e => {
  e.notification.close(); const d = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => 'focus' in x);
    if (c) { c.postMessage({ notif: d }); return c.focus(); }
    return self.clients.openWindow('./?n=' + encodeURIComponent(JSON.stringify(d)));
  }));
});
