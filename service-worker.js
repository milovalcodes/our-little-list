const CACHE = 'our-little-list-v35';

const PAGES = [
  './', './index.html', './her.html', './him.html', './admire.html', './profiles.html',
  './status.html', './dates.html', './tasks.html', './reminders.html', './notes.html',
  './location.html', './activity.html', './phone-check.html', './help.html', './today.html', './memories.html'
];

const ASSETS = [
  ...PAGES,
  './styles.css', './shared.js', './profile-store.js', './profile-names.js',
  './profiles.js', './status.js', './dates.js', './admire.js', './dashboard.js', './activity.js',
  './phone-check.js', './tasks.js', './reminders.js', './notes.js', './location.js', './live-notes.js',
  './ui-helpers.js', './firebase-data.js', './firebase-config.js', './time-format.js', './data-hub.js',
  './push-config.js', './push-client.js', './presence.js', './help.js', './today.js', './memories.js', './auto-location.js',
  './household.js', './viewer.js', './entry.js',
  './sun-moon-personalized.png', './sun-profile.png', './moon-profile.png', './icon-192.png', './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // Do not activate a half-cached shell. The repository check verifies each
      // entry exists, and a transient network failure can safely retry later.
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Map tiles, Firebase and the Leaflet CDN are none of our business. Caching
  // them here bloated storage with opaque responses and served stale data.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Store one copy per page, not one copy for every harmless ?as= parameter.
    const pageKey = new Request(`${url.origin}${url.pathname}`);
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(pageKey, copy));
          return response;
        })
        .catch(async () => {
          // Fall back to this exact page before falling back to the front door,
          // so going offline on the list does not dump you at the door picker.
          return (await caches.match(pageKey))
            || (await caches.match('./index.html'))
            || Response.error();
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    })
  );
});

self.addEventListener('push', event => {
  let payload = { title: 'Our Little List', body: 'a little something for you ♡', url: './index.html' };
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch (_) {
    const text = event.data?.text();
    if (text) payload.body = text;
  }

  const body = payload.late ? `${payload.body} (a little late, sorry)` : payload.body;
  const tag = payload.tag || 'our-little-list';
  const target = safeAppUrl(payload.url);
  event.waitUntil(
    self.registration.getNotifications({ tag }).then(existing => {
      if (existing.length) return;
      return self.registration.showNotification(payload.title, {
        body,
        icon: './sun-moon-personalized.png',
        badge: './sun-moon-personalized.png',
        tag,
        renotify: false,
        requireInteraction: payload.kind === 'reminder',
        data: { url: target }
      });
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = safeAppUrl(event.notification.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      // Reuse a window that is already open instead of piling up new ones.
      for (const client of windows) {
        if (client.url === target && 'focus' in client) return client.focus();
      }
      for (const client of windows) {
        if ('navigate' in client && 'focus' in client) return client.navigate(target).then(() => client.focus());
      }
      return self.clients.openWindow(target);
    })
  );
});

function safeAppUrl(value) {
  const fallback = new URL('./index.html', self.location.href).href;
  try {
    const target = new URL(value || fallback, self.location.href);
    return target.origin === self.location.origin && target.href.startsWith(self.registration.scope) ? target.href : fallback;
  } catch (_) {
    return fallback;
  }
}
