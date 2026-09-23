import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const live = readFileSync(new URL('../live-notes.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');

assert.ok(!live.includes('showNotification('), 'live listeners must never raise a second system notification');
assert.match(live, /if \(document\.hidden\) return;/, 'hidden pages leave notification delivery to Web Push');
assert.match(serviceWorker, /getNotifications\(\{ tag \}\)/, 'the service worker checks for an existing tag');
assert.match(serviceWorker, /renotify: false/, 'replayed tags do not make another sound');
assert.match(worker, /message\.sendAt \|\| message\.createdAt/, 'reminder age starts at its due time');
assert.doesNotMatch(worker, /message\.createdAt \|\| message\.sendAt/, 'creation time cannot expire a future reminder');

console.log('notification paths are single-owner and future reminders stay valid');
