// The app is installed on two phones' home screens. Until now it could not
// start without reaching gstatic for the Firebase SDK and then Firestore for
// every read, so a lift, a basement or one bar of signal left a shell and an
// error card. These pin the three things that make it survive that.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const serviceWorker = read('service-worker.js');
const data = read('firebase-data.js');
const hub = read('data-hub.js');

// 1. The libraries the app cannot boot without have to survive a dead network.
for (const pinned of ['https://www.gstatic.com/firebasejs/12.19.0/', 'https://unpkg.com/leaflet@1.9.4/']) {
  assert.ok(serviceWorker.includes(pinned), `${pinned} must be cached — the app cannot start without it`);
  assert.ok(data.includes(pinned) || read('status.html').includes(pinned), `${pinned} must still be the version actually loaded`);
}
assert.ok(!serviceWorker.includes('tile.openstreetmap.org'), 'map tiles are endless and must not be cached');
console.log(' ok  the SDK and the map library are kept, the tiles are not');

// The first version of this shipped with the libraries in the shell cache, and
// activate deletes every cache that is not the current shell — so every deploy
// threw away the one thing that lets the app start with no network. They have
// to live somewhere the version bump does not reach.
const libraryCache = serviceWorker.match(/const (LIBRARY_CACHE) = '([^']+)'/);
assert.ok(libraryCache, 'the libraries need a cache of their own');
assert.ok(!/const CACHE = '[^']*'[\s\S]*?our-little-list-libraries'.*\bv\d/.test(serviceWorker),
  'the library cache name must not carry the shell version');
const activate = serviceWorker.slice(serviceWorker.indexOf("addEventListener('activate'"), serviceWorker.indexOf("addEventListener('message'"));
assert.match(activate, /key !== CACHE && key !== LIBRARY_CACHE/,
  'activate must not delete the library cache when the shell version is bumped');
assert.ok(!serviceWorker.includes('caches.open(CACHE).then(cache => cache.put(request, copy)).catch'),
  'the libraries must not be written back into the shell cache');
console.log(' ok  a deploy bumping the shell version does not throw the libraries away');

// Serving a cached page and then being shut down mid-refresh means the cache
// never updates again on a consistently slow connection.
assert.match(serviceWorker, /event\.waitUntil\(network\.catch/, 'the background refresh is kept alive');
assert.match(serviceWorker, /event\.waitUntil\(cache\.put\(request/, 'the library write is kept alive');
console.log(' ok  background cache writes survive the worker being shut down');

// If the pinned version is ever bumped, the cache entry has to move with it, or
// the app silently keeps booting the old SDK offline and the new one online.
const sdkVersions = [...data.matchAll(/firebasejs\/([\d.]+)\//g)].map(m => m[1]);
const cachedVersion = serviceWorker.match(/firebasejs\/([\d.]+)\//)[1];
assert.ok(sdkVersions.length >= 3, 'all three SDK modules are imported');
assert.ok(sdkVersions.every(version => version === cachedVersion),
  `service worker caches ${cachedVersion} but the app imports ${[...new Set(sdkVersions)].join(', ')}`);
console.log(' ok  the cached SDK version is the one the app actually imports');

// 2. Reads have to come off the phone, not the network.
assert.match(data, /persistentLocalCache/, 'Firestore keeps the household on the device');
assert.match(data, /persistentMultipleTabManager/, 'more than one open tab must not fight over it');
assert.match(data, /catch \(_\)[\s\S]{0,400}getFirestore\(app\)/, 'starting Firestore twice must not take the page down');
console.log(' ok  the household is kept on the phone, and a double start cannot kill the page');

// 3. A write must not hold the UI hostage waiting for a server acknowledgement
//    that will not come until there is signal again.
assert.match(data, /Promise\.race\(\[\s*work,/, 'writes resolve once applied locally');
// Racing every write against a timer made a slow genuine failure read as
// success, and held every button for the full timer even on a good connection.
assert.match(data, /if \(navigator\.onLine !== false\) return work;/,
  'an online write is awaited properly so real errors still surface');
assert.match(read('phone-check.js'), /result\?\.syncing/,
  'the sync self-test must not call a queued local write "sync works"');
assert.match(read('push-client.js'), /fromServer: true/,
  'endpoint ownership is decided on server data, never a stale cache');
assert.ok(!/addDoc/.test(data), 'ids are minted locally so an offline create still knows its own id');
assert.match(data, /const entry = doc\(named\(name\)\);/, 'addTo generates its id up front');
console.log(' ok  a write releases the button when it lands locally, id and all');

// 4. One bad moment must not poison the page for good.
assert.match(hub, /layerPromise = null;/, 'a failed start is retried rather than remembered');
console.log(' ok  a failed start can be retried without reloading');

console.log('\nOFFLINE PATH CLEAN');
