// Exactly one thing is allowed to raise an operating-system notification: the
// push worker. Anything else and the same event arrives twice. The reverse also
// matters — a push handler that resolves without showing anything breaks the
// userVisibleOnly promise and the browser posts its own "site updated in the
// background" notice instead.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const live = readFileSync(new URL('../live-notes.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');

assert.ok(!live.includes('showNotification('), 'live listeners must never raise a second system notification');
assert.match(live, /if \(document\.hidden\) return false;/, 'a hidden page shows no in-page popup and says so to its caller');
assert.match(live, /if \(shown\)/, 'a note is only marked read when it was actually shown');
console.log(' ok  in-page popups never double up on a push, and never eat an unseen note');

// Every path through the push handler has to reach showNotification.
const push = serviceWorker.slice(serviceWorker.indexOf("addEventListener('push'"), serviceWorker.indexOf("addEventListener('notificationclick'"));
assert.ok(push.includes('showNotification('), 'the push handler shows a notification');
assert.ok(!/getNotifications\(/.test(push), 'no branch may resolve the push without showing anything');
assert.match(push, /renotify: false/, 'a replaced tag does not make another sound');
assert.match(push, /tag,/, 'the tag is what de-duplicates a re-sent message');
console.log(' ok  every push shows something, and a repeat replaces it quietly');

assert.match(worker, /message\.sendAt \|\| message\.createdAt/, 'reminder age starts at its due time');
assert.doesNotMatch(worker, /message\.createdAt \|\| message\.sendAt/, 'creation time cannot expire a future reminder');
console.log(' ok  a reminder set far in advance is not treated as stale');

// A notification about a reminder you have been sent has to open something that
// shows that reminder. reminders.html is the form for sending one, so tapping
// "⏰ bring the water bottle" landed on an empty box addressed back at the
// sender, with the reminder's own words nowhere on the page.
const reminders = readFileSync(new URL('../reminders.js', import.meta.url), 'utf8');
assert.doesNotMatch(reminders, /url: `reminders\.html`/, 'a reminder notification must not open the compose form');
assert.doesNotMatch(live, /a reminder for you[\s\S]{0,120}url: `reminders\.html`/, 'the in-page reminder popup must not open the compose form either');
assert.match(reminders, /url: `activity\.html`/, 'it opens the feed, where the reminder is readable');
console.log(' ok  a reminder notification opens the reminder, not the form that makes one');

// A failed page response must never become the offline copy of that page.
assert.match(serviceWorker, /response\.ok && response\.type === 'basic'[\s\S]{0,200}cache\.put\(pageKey/, 'only a good page is cached');
console.log(' ok  a 404 caught mid-deploy does not become the offline page');

console.log('\nNOTIFICATION PATHS CLEAN');
