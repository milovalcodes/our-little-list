const CACHE = 'our-little-list-v100';

// Deliberately NOT versioned with the shell. These entries are keyed by a
// version-pinned URL, so they can never go stale — and putting them in CACHE
// meant the activate step below threw them away on every single deploy, which
// quietly undid the whole point of caching them.
importScripts('./old-links.js');
importScripts('./seasonal-assets.js');

const LIBRARY_CACHE = 'our-little-list-libraries';

const PAGES = [
  // Old addresses (reminders, activity, profiles…) are no longer pages:
  // old-links.js maps them to where those things live now.
  './', './index.html', './her.html', './him.html', './old-links.js',
  './status.html', './dates.html', './tasks.html', './notes.html',
  './phone-check.html', './games.html', './activities.html', './today.html', './memories.html', './guide.html'
];

const ASSETS = [
  ...PAGES,
  './appearance-boot.js',
  './alter-ego.js',
  './timed-games.js','./timed-game.js','./daily-puzzles.js','./memory-catalog.js','./weekly-report.js','./weekly-tracker.js','./puzzle-catalog.js', './seasonal-puzzles.js','./puzzle-bank.js','./league-scores.js',
  './styles.css', './diary.css', './seasonal.css', './seasonal-theme.js', './shared.js', './app-chrome.js', './guide.js', './profile-store.js', './profile-route.js', './couple-game.js', './arcade-game.js', './profile-names.js',
  './profiles.js', './status.js', './dates.js', './dashboard.js', './activities.js', './activity-clock.js', './daily-word.js', './daily-words.js', './word-game.js', './word-lexicon.js', './word-scores.js', './word-crowns.js', './word-tiebreaker.js', './word-celebration.js', './word-coronation.js', './phone-check.js', './tasks.js', './notes.js', './location.js', './live-notes.js',
  './notification-policy.js', './notification-preferences.js',
  './ui-helpers.js', './emoji-picker.js', './firebase-data.js', './firebase-config.js', './time-format.js', './data-hub.js',
  './push-config.js', './push-client.js', './presence.js', './help-panel.js', './today.js', './memories.js', './auto-location.js',
  './household.js', './viewer.js', './entry.js', './place-presets.js', './location-tags.js',
  './moment-picker.js', './records.js', './recurrence.js', './needs-you.js', './journey.js', './trip.js', './status-presets.js', './activity-feed.js', './activity-summary.js', './availability.js', './fridge.js', './pings-settings.js', './undo-delete.js', './settings-account.js', './setup-nudge.js', './daily-question.js', './question-prompts.js', './page-boot.js', './device-mode.js', './focus-ask.js', './delivery-policy.js', './inline-actions.js',
  './sun-moon-personalized.png', './sun-profile.png', './moon-profile.png', './seasonal-spooky.svg', './seasonal-christmas.svg', './icon-192.png',
  './notification-icon.png', './notification-badge.png', './manifest.webmanifest',
  './seasonal-assets.js', './season-mark-spooky.svg', './season-mark-christmas.svg',
  './sun-profile-spooky.png', './moon-profile-spooky.png', './sun-moon-spooky.png',
  './sun-profile-christmas.png', './moon-profile-christmas.png', './sun-moon-christmas.png',
  './icon-spooky-192.png', './icon-spooky-180.png', './notification-badge-spooky.png',
  './icon-christmas-192.png', './icon-christmas-180.png', './notification-badge-christmas.png'
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
        .filter(key => key.startsWith('our-little-list-') && key !== CACHE && key !== LIBRARY_CACHE)
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
  if (url.href === new URL('./manifest.webmanifest', self.location.href).href) {
    // Same URL and app identity in every season; never make duplicate installs.
    // Recompute even offline, when the stored manifest belongs to last month.
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const response = cached || await fetch(request);
      const manifest = globalThis.LittleSeasonAssets.manifest(await response.json());
      return new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type':'application/manifest+json', 'Cache-Control':'no-cache' }
      });
    })());
    return;
  }
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
    const moved = self.oldPageTarget(request.url);
    if (moved) { event.respondWith(Response.redirect(moved, 302)); return; }
    // Store one copy per page, not one copy for every harmless ?as= parameter.
    const pageKey = new Request(`${url.origin}${url.pathname}`);
    const network = fetch(request).then(async response => {
      // Only a good page is worth keeping. Catching a 404 mid-deploy used to
      // overwrite the precached page, and that error page then became the
      // offline copy until the next successful load.
      if (response && response.ok && response.type === 'basic') {
        const copy = response.clone();
        await caches.open(CACHE).then(cache => cache.put(pageKey, copy)).catch(() => {});
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

  const cached = caches.match(request, { ignoreSearch: false });
  const network = fetch(request).then(async response => {
    if (response && response.status === 200 && response.type === 'basic') {
      try { const cache = await caches.open(CACHE); await cache.put(request, response.clone()); }
      catch (_) { /* A full device cache must not break an otherwise good response. */ }
    }
    return response;
  }).catch(async () => (await cached) || Response.error());
  // The cached response can resolve immediately, but refreshing its bytes must
  // keep the worker alive until cache.put actually finishes.
  event.waitUntil(network.then(() => {}));
  event.respondWith(cached.then(value => value || network));
});

const SHOWN_IN_PAGE = new Set(['note', 'item', 'date', 'help', 'help-answer', 'status', 'focus']);
const PAGES_WITH_POPUPS = /\/(her|him|today|tasks|notes|dates|memories|status)\.html(?:[?#]|$)/;

self.addEventListener('push', event => {
  let payload = { title: 'Our Little App', body: 'a little something for you ♡', url: './index.html' };
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
  const artwork = globalThis.LittleSeasonAssets.forSeason(globalThis.LittleSeasonAssets.seasonForDate());
  const options = {
    body,
    icon: './' + (artwork.notification || 'notification-icon.png'),
    badge: './' + (artwork.badge || 'notification-badge.png'),
    silent,
    // Chrome refuses a silent notification that carries a vibration pattern
    // at all — an empty one included: "Silent notifications must not specify
    // vibration patterns." Passing `vibrate: []` in quiet mode made every push
    // throw here, show nothing, and leave Chrome to post its own generic "this
    // site has been updated in the background" line instead.
    ...(silent ? {} : { vibrate: vibrate }),
    tag,
    renotify: false,
    requireInteraction: payload.kind === 'reminder',
    data: { url: target }
  };
  event.waitUntil((async () => {
    // With the app open and in front, live-notes.js already popped this up in
    // the page with its own sound. A push still has to show something (iOS
    // drops subscriptions that don't), so show it quietly and take it back
    // out of the tray a moment later instead of buzzing twice.
    // Only for the kinds live-notes.js pops up in the page, and only on pages
    // that load it. Arrivals, memories, reactions and a timed ask's nudge
    // have no in-page popup, so they always ring normally.
    const windows = await Promise.resolve().then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true })).catch(() => []);
    const watching = SHOWN_IN_PAGE.has(payload.kind) && windows.some(client =>
      client.visibilityState === 'visible' && client.focused && PAGES_WITH_POPUPS.test(client.url || ''));
    const { vibrate: _buzz, ...quiet } = options;
    const shown = watching ? { ...quiet, silent: true } : options;
    await self.registration.showNotification(payload.title, shown)
      // Whatever else goes wrong with the options, a push has to show
      // something. The plainest possible notification still carries the words
      // and still opens the right page.
      .catch(() => self.registration.showNotification(payload.title || 'Our Little App', {
        body,
        tag,
        data: { url: target }
      }));
    if (watching) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      const lingering = await self.registration.getNotifications({ tag }).catch(() => []);
      lingering.forEach(notification => notification.close());
      return;
    }
    // The app icon's number (iPhone home-screen apps since iOS 16.4). Home
    // replaces it with the real count when the app opens.
    try {
      const waiting = await self.registration.getNotifications();
      await self.navigator.setAppBadge?.(Math.max(1, waiting.length));
    } catch (_) { /* no badge support */ }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = safeAppUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = (await self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .filter(client => client.url.startsWith(self.registration.scope));
    // Don't reload a form or draft when the right page is already open.
    // A message also reopens the exact item when its hash has not changed.
    const pageOf = value => { const url=new URL(value);return url.origin+url.pathname+url.search; };
    const same = windows.find(client => pageOf(client.url) === pageOf(target));
    if (same) {
      try {
        await same.focus();
        const handled=await new Promise(resolve=>{
          const channel=new MessageChannel();
          const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value);};
          const timer=setTimeout(()=>finish(false),1200);
          channel.port1.onmessage=()=>finish(true);
          same.postMessage({type:'OPEN_NOTIFICATION',url:target},[channel.port2]);
        });
        if(handled)return;
        // Older cached pages, or a page still signing in, have no listener yet.
        const navigated=await same.navigate(target);
        if(navigated){await navigated.focus();return;}
      }
      catch (_) { /* closed between lookup and focus; try another window */ }
    }
    for (const client of windows) {
      if(client===same)continue;
      try { const navigated=await client.navigate(target);if(navigated){await navigated.focus();return;} }
      catch (_) { /* a failed navigation must not eat the notification tap */ }
    }
    await self.clients.openWindow(target);
  })());
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
    const asked = new URL(value || fallback, self.location.href);
    const target = new URL(self.oldPageTarget(asked.href) || asked.href);
    return target.origin === self.location.origin && target.href.startsWith(self.registration.scope) ? target.href : fallback;
  } catch (_) {
    return fallback;
  }
}
