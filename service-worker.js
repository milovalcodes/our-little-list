const CACHE = 'our-little-list-v45';

// Deliberately NOT versioned with the shell. These entries are keyed by a
// version-pinned URL, so they can never go stale — and putting them in CACHE
// meant the activate step below threw them away on every single deploy, which
// quietly undid the whole point of caching them.
const LIBRARY_CACHE = 'our-little-list-libraries';

const PAGES = [
  './', './index.html', './her.html', './him.html', './admire.html', './profiles.html',
  './status.html', './dates.html', './tasks.html', './reminders.html', './notes.html',
  './location.html', './activity.html', './phone-check.html', './notifications.html', './help.html', './today.html', './memories.html'
];

const ASSETS = [
  ...PAGES,
  './styles.css', './shared.js', './profile-store.js', './profile-names.js',
  './profiles.js', './status.js', './dates.js', './dashboard.js', './activity.js',
  './phone-check.js', './tasks.js', './reminders.js', './notes.js', './location.js', './live-notes.js',
  './notifications.js', './notification-policy.js', './notification-preferences.js',
  './ui-helpers.js', './emoji-picker.js', './firebase-data.js', './firebase-config.js', './time-format.js', './data-hub.js',
  './push-config.js', './push-client.js', './presence.js', './help-panel.js', './today.js', './memories.js', './auto-location.js',
  './household.js', './viewer.js', './entry.js',
  './sun-moon-personalized.png', './sun-profile.png', './moon-profile.png', './icon-192.png',
  './notification-icon.png', './notification-badge.png', './notification-icon.svg', './notification-badge.svg', './manifest.webmanifest'
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
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE && key !== LIBRARY_CACHE)
        .map(key => caches.delete(key))))
      .then(() => pruneLibraries())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

// The app cannot start without these: firebase-data.js imports the SDK at
// runtime, and the map needs Leaflet. Every URL here is version-pinned, so the
// bytes behind it never change and keeping them forever is safe. Map tiles are
// deliberately absent — those are endless, and stale ones are worse than none.
const PINNED_LIBRARIES = [
  'https://www.gstatic.com/firebasejs/12.19.0/',
  'https://unpkg.com/leaflet@1.9.4/'
];

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    if (PINNED_LIBRARIES.some(prefix => request.url.startsWith(prefix))) {
      event.respondWith(
        caches.open(LIBRARY_CACHE).then(cache => cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response && response.ok) {
              // waitUntil, or the worker can be killed before this lands and the
              // library is never actually kept.
              event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
            }
            return response;
          });
        }))
      );
    }
    return;
  }

  if (request.mode === 'navigate') {
    // Store one copy per page, not one copy for every harmless ?as= parameter.
    const pageKey = new Request(`${url.origin}${url.pathname}`);
    const network = fetch(request).then(response => {
      // Only a good page is worth keeping. Catching a 404 mid-deploy used to
      // overwrite the precached page, and that error page then became the
      // offline copy until the next successful load.
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(pageKey, copy)).catch(() => {});
      }
      return response;
    });
    network.catch(() => {});
    // Once the cached page has been served the worker is free to be shut down,
    // which would abandon the refresh that is meant to keep it current.
    event.waitUntil(network.catch(() => {}));
    event.respondWith(
      // Network first, but not network-until-the-bitter-end: a phone on one bar
      // used to stare at a blank screen for as long as the request took. After
      // three seconds the cached page is shown, while that same request carries
      // on in the background and updates the cache for next time.
      Promise.race([
        network,
        new Promise((_, reject) => setTimeout(() => reject(new Error('slow network')), 3000))
      ])
        .catch(async () => {
          // Fall back to this exact page before falling back to the front door,
          // so going offline on the list does not dump you at the door picker.
          // With nothing cached at all there is nothing to do but keep waiting.
          return (await caches.match(pageKey))
            || (await caches.match('./index.html'))
            || network.catch(() => Response.error());
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
  const silent = payload.silent === true;
  const vibrate = Array.isArray(payload.vibrate)
    ? payload.vibrate.map(Number).filter(value => Number.isFinite(value) && value >= 0).slice(0, 7)
    : [90, 70, 90];
  // A push that resolves without showing anything breaks the userVisibleOnly
  // promise, and the browser posts its own "site updated in the background"
  // notice instead. The tag already replaces a duplicate in place, which is the
  // de-duplication this was reaching for.
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body,
      icon: './notification-icon.png',
      badge: './notification-badge.png',
      silent,
      vibrate: silent ? [] : vibrate,
      tag,
      renotify: false,
      requireInteraction: payload.kind === 'reminder',
      data: { url: target }
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

// A bumped library version leaves its predecessor behind forever otherwise.
async function pruneLibraries() {
  try {
    const cache = await caches.open(LIBRARY_CACHE);
    const stale = (await cache.keys()).filter(entry => !PINNED_LIBRARIES.some(prefix => entry.url.startsWith(prefix)));
    await Promise.all(stale.map(entry => cache.delete(entry)));
  } catch (_) { /* tidying only */ }
}

function safeAppUrl(value) {
  const fallback = new URL('./index.html', self.location.href).href;
  try {
    const target = new URL(value || fallback, self.location.href);
    return target.origin === self.location.origin && target.href.startsWith(self.registration.scope) ? target.href : fallback;
  } catch (_) {
    return fallback;
  }
}
