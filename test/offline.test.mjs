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
assert.match(data, /catch \(_\) \{[\s\S]{0,200}getFirestore\(app\)/, 'a browser with no IndexedDB still has to work');
console.log(' ok  the household is kept on the phone, with a fallback for private windows');

// 3. A write must not hold the UI hostage waiting for a server acknowledgement
//    that will not come until there is signal again.
assert.match(data, /Promise\.race\(\[\s*work,/, 'writes resolve once applied locally');
assert.ok(!/addDoc/.test(data), 'ids are minted locally so an offline create still knows its own id');
assert.match(data, /const entry = doc\(named\(name\)\);/, 'addTo generates its id up front');
console.log(' ok  a write releases the button when it lands locally, id and all');

// 4. One bad moment must not poison the page for good.
assert.match(hub, /layerPromise = null;/, 'a failed start is retried rather than remembered');
console.log(' ok  a failed start can be retried without reloading');

console.log('\nOFFLINE PATH CLEAN');
