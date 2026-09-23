const CACHE = 'our-little-list-v32';

const PAGES = [
  './', './index.html', './her.html', './him.html', './admire.html', './profiles.html',
  './status.html', './dates.html', './tasks.html', './reminders.html', './notes.html',
  './location.html', './activity.html', './phone-check.html', './help.html'
];

const ASSETS = [
  ...PAGES,
  './styles.css', './shared.js', './profile-store.js', './profile-names.js',
  './profiles.js', './status.js', './dates.js', './admire.js', './dashboard.js', './activity.js',
  './phone-check.js', './tasks.js', './reminders.js', './notes.js', './location.js', './live-notes.js',
  './ui-helpers.js', './firebase-data.js', './firebase-config.js', './time-format.js', './data-hub.js',
  './push-config.js', './push-client.js', './presence.js', './help.js', './auto-location.js',
  './household.js', './viewer.js', './entry.js',
  './sun-moon-personalized.png', './sun-profile.png', './moon-profile.png', './icon-192.png', './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // One missing file used to fail the whole install and leave the site
      // running on the previous worker forever. Cache what we can.
      .then(cache => Promise.allSettled(ASSETS.map(asset => cache.add(asset))))
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
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          // Fall back to this exact page before falling back to the front door,
          // so going offline on the list does not dump you at the door picker.
          return (await caches.match(request, { ignoreSearch: true }))
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
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body,
      icon: './sun-moon-personalized.png',
      badge: './sun-moon-personalized.png',
      tag: payload.tag || 'our-little-list',
      renotify: true,
      requireInteraction: payload.kind === 'reminder',
      data: { url: payload.url || './index.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './index.html', self.location.origin).href;
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
