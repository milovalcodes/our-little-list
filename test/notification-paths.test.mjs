// Exactly one thing is allowed to raise an operating-system notification: the
// push worker. Anything else and the same event arrives twice. The reverse also
// matters — a push handler that resolves without showing anything breaks the
// userVisibleOnly promise and the browser posts its own "site updated in the
// background" notice instead.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const live = readFileSync(new URL('../live-notes.js', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../worker/src/index.js', import.meta.url), 'utf8');
const pushClient = readFileSync(new URL('../push-client.js', import.meta.url), 'utf8');

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
assert.match(push, /notification-icon\.png/, 'expanded Android notification uses the small notification artwork');
assert.match(push, /notification-badge\.png/, 'Android status bar uses a transparent monochrome badge');
assert.match(push, /vibrate:/, 'the chosen vibration reaches showNotification');
assert.match(push, /silent,/, 'quiet mode reaches showNotification');
console.log(' ok  every push shows something, and a repeat replaces it quietly');

// Run the real push handler against a registration that enforces Chrome's
// rule: a silent notification may not name a vibration pattern at all, not even
// an empty one. Quiet mode used to pass `vibrate: []`, so every push threw, showed
// nothing, and Chrome posted its own "updated in the background" line instead.
async function firePush(payload, { failFirst = false } = {}) {
  const handlers = {};
  const shown = [];
  let calls = 0;
  const self = {
    addEventListener: (type, handler) => { handlers[type] = handler; },
    location: { href: 'https://x.test/app/service-worker.js', origin: 'https://x.test' },
    registration: {
      scope: 'https://x.test/app/',
      showNotification(title, options = {}) {
        calls += 1;
        if (failFirst && calls === 1) return Promise.reject(new TypeError('boom'));
        if (options.silent && 'vibrate' in options) {
          return Promise.reject(new TypeError('Silent notifications must not specify vibration patterns.'));
        }
        shown.push({ title, options });
        return Promise.resolve();
      }
    },
    clients: {},
    skipWaiting() {}
  };
  vm.runInNewContext(serviceWorker, { self, URL, Request: class {}, Response: {}, caches: {}, fetch() {}, setTimeout, console });
  let settled;
  handlers.push({ data: { json: () => payload, text: () => '' }, waitUntil(promise) { settled = promise; } });
  await settled;
  return shown;
}
{
  const quiet = await firePush({ title: 'hi', body: 'x', url: 'notes.html', silent: true, vibrate: [90, 70, 90] });
  assert.equal(quiet.length, 1, 'quiet mode still shows the notification');
  assert.equal(quiet[0].options.silent, true, 'and it is actually quiet');
  assert.ok(!('vibrate' in quiet[0].options), 'a silent notification names no vibration pattern at all');

  const loud = await firePush({ title: 'hi', body: 'x', url: 'notes.html', vibrate: [180, 90, 180] });
  assert.deepEqual(loud[0].options.vibrate, [180, 90, 180], 'the chosen buzz reaches the phone');

  const rescued = await firePush({ title: 'hi', body: 'x', url: 'notes.html' }, { failFirst: true });
  assert.equal(rescued.length, 1, 'a push whose options are refused still shows something');
  assert.equal(rescued[0].options.body, 'x', 'with its words');
}
console.log(' ok  quiet mode is quiet instead of broken, and a push always shows something');

assert.match(worker, /notificationKindEnabled\(message\.kind, preferences\)/,
  'muted categories must be filtered before Web Push, not hidden after arrival');
assert.match(pushClient, /preferences: readNotificationPreferences\(\)/,
  'the phone files its notification preferences beside its subscription');
// The hand-fired backstop is the same pass for when the worker is down. It had
// been left behind: muted categories still rang, and quiet mode was ignored.
const backstop = readFileSync(new URL('../tools/deliver.mjs', import.meta.url), 'utf8');
assert.match(backstop, /notificationKindEnabled\(message\.kind, preferences\)/, 'the backstop honours muted categories too');
assert.match(backstop, /silent: preferences\.backgroundSound === 'silent'/, 'and quiet mode');
assert.match(backstop, /vibrate: vibrationPattern\(preferences\.vibration\)/, 'and the chosen buzz');
console.log(' ok  notification choices travel with the phone and filter before delivery');

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
