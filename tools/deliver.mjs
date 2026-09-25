// The manual backstop. Delivery is scheduled by the Cloudflare Worker in
// worker/ — this is the same pass, written for Node, that you can fire by hand
// from the Actions tab if the worker is ever down or misconfigured.
//
// It must stay behaviourally identical to worker/src/index.js: same grace
// window, same payload, same urgency. Two implementations of one job drift
// silently, and the symptom is a reminder that quietly stops arriving.
//
// Everything secret comes from the environment; nothing secret is in this repo.

import webpush from 'web-push';
import { signIn, createClient } from './firestore.mjs';
import { readFileSync } from 'node:fs';
import { normalizeNotificationPreferences, notificationKindEnabled, vibrationPattern } from '../notification-policy.js';

const GRACE_MS = 0;               // never ring before the chosen time
const STALE_MS = 3 * 60 * 60_000; // older than 3h: send it but do not shout about it
const ABANDONED_MS = 7 * 24 * 60 * 60_000;
const LOCK_STALE_MS = 2 * 60_000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}. Add it to the repository's Actions secrets.`);
  return value;
}

// Read the config straight out of the website's own files so the two can never
// drift apart — including the household id, which is now a fixed path rather
// than whichever account happened to sign in.
function websiteConfig() {
  const config = readFileSync(new URL('../firebase-config.js', import.meta.url), 'utf8');
  const pick = key => config.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1];
  const apiKey = pick('apiKey');
  const projectId = pick('projectId');
  if (!apiKey || !projectId) throw new Error('could not read apiKey/projectId from firebase-config.js');

  const household = readFileSync(new URL('../household.js', import.meta.url), 'utf8');
  const householdId = household.match(/HOUSEHOLD_ID\s*=\s*'([^']+)'/)?.[1];
  if (!householdId) throw new Error('could not read HOUSEHOLD_ID from household.js');
  if (householdId.startsWith('REPLACE_WITH')) throw new Error('HOUSEHOLD_ID in household.js is still a placeholder');
  return { apiKey, projectId, householdId };
}

async function main() {
  const { apiKey, projectId, householdId } = websiteConfig();
  const email = requireEnv('LITTLE_EMAIL');
  const password = requireEnv('LITTLE_PASSWORD');
  const vapidPublic = requireEnv('VAPID_PUBLIC_KEY');
  const vapidPrivate = requireEnv('VAPID_PRIVATE_KEY');
  const vapidSubject = process.env.VAPID_SUBJECT || `mailto:${email}`;

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const { idToken } = await signIn({ apiKey, email, password });
  const db = createClient({ projectId, idToken });
  // Either member's account can drive delivery; both read the same household.
  const household = `households/${householdId}`;
  const lockPath = `${household}/deliveryLocks/active`;
  const lockAt = Date.now();
  if (!await acquireDeliveryLock(db, lockPath, lockAt)) {
    console.log('another delivery pass is already running');
    return;
  }

  try {

    const subscriptions = {};
    for (const record of await db.list(`${household}/pushSubs`)) {
      if (record?.subscription?.endpoint) subscriptions[record.id] = record;
    }

    const now = Date.now();
    const due = await db.dueFrom(`${household}/outbox`, 'sendAt', now + GRACE_MS, 50);
    if (due.length === 0) {
      console.log(`nothing due (${Object.keys(subscriptions).length} phone(s) subscribed)`);
      return;
    }

    let sent = 0;
    let skipped = 0;
    let dropped = 0;
    let muted = 0;

    for (const message of due) {
      const dueAge = Math.max(0, now - Number(message.sendAt || message.createdAt || now));
      if (dueAge > ABANDONED_MS) {
      await db.remove(message.path);
      dropped += 1;
      continue;
    }

    // A reminder whose underlying record was deleted should not still go off.
    if (message.kind === 'reminder' && message.ref) {
      const reminder = await db.get(`${household}/reminders/${message.ref}`);
      if (!reminder) {
        await db.remove(message.path);
        skipped += 1;
        continue;
      }
    }

    const target = subscriptions[message.to];
    if (!target) {
      // Nobody on that side has turned notifications on yet. Leave it queued so
      // it lands once they do; the ABANDONED_MS check above eventually drops it.
      skipped += 1;
      continue;
    }

    // Same rule as the worker: a category this side switched off is dropped
    // here, before Web Push. A service worker may not receive a push and then
    // show nothing, so it cannot be filtered on arrival.
    const preferences = normalizeNotificationPreferences(target.preferences);
    if (!notificationKindEnabled(message.kind, preferences)) {
      await db.remove(message.path);
      muted += 1;
      continue;
    }

    const payload = JSON.stringify({
      title: message.title || 'Our Little List',
      body: message.body || '',
      url: message.url || 'index.html',
      tag: `${message.kind || 'note'}-${message.id}`,
      // The service worker keys requireInteraction off this, so a reminder
      // stays on screen instead of sliding past while the phone is in a pocket.
      kind: message.kind || 'note',
      late: dueAge > STALE_MS,
      silent: preferences.backgroundSound === 'silent',
      vibrate: vibrationPattern(preferences.vibration)
    });

    try {
      await webpush.sendNotification(target.subscription, payload, {
        TTL: 60 * 60 * 24,
        // Without this Android can hold the wake-up in doze for a long while.
        urgency: message.kind === 'reminder' || message.kind === 'help' ? 'high' : 'normal'
      });
      await db.remove(message.path);
      sent += 1;
    } catch (problem) {
      const status = problem?.statusCode;
      if (status === 404 || status === 410) {
        // The browser threw the subscription away. Clear it so the phone
        // re-subscribes next time it opens the site.
        console.log(`subscription for ${message.to} is gone; clearing it`);
        await db.remove(`${household}/pushSubs/${message.to}`);
        delete subscriptions[message.to];
        skipped += 1;
      } else {
        console.error(`could not send ${message.id}: ${status || ''} ${problem?.message || problem}`);
        skipped += 1;
      }
    }
    }

    console.log(`sent ${sent}, left ${skipped}, dropped ${dropped}, muted ${muted}`);
  } finally {
    await db.remove(lockPath).catch(problem => console.error(`could not release delivery lock: ${problem.message || problem}`));
  }
}

async function acquireDeliveryLock(db, path, now) {
  if (await db.create(path, { acquiredAt: now })) return true;
  const existing = await db.get(path);
  if (existing && now - Number(existing.acquiredAt || 0) < LOCK_STALE_MS) return false;
  await db.remove(path);
  return db.create(path, { acquiredAt: now });
}

main().catch(problem => {
  console.error(problem.message || problem);
  process.exit(1);
});
