// Runs on a schedule in GitHub Actions. Reads whatever the website has queued in
// the outbox, and sends the ones that are due as real web pushes so they arrive
// with both phones closed.
//
// Everything secret comes from the environment; nothing secret is in this repo.

import webpush from 'web-push';
import { signIn, createClient } from './firestore.mjs';
import { readFileSync } from 'node:fs';

const GRACE_MS = 60_000;          // send anything due within the next minute too
const STALE_MS = 3 * 60 * 60_000; // older than 3h: send it but do not shout about it
const ABANDONED_MS = 7 * 24 * 60 * 60_000;

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

  for (const message of due) {
    const age = now - Number(message.createdAt || message.sendAt || now);
    if (age > ABANDONED_MS) {
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
      // Nobody on that side has turned notifications on yet. Leave it queued
      // for a while so it lands once they do, then give up quietly.
      if (age > ABANDONED_MS) await db.remove(message.path);
      skipped += 1;
      continue;
    }

    const payload = JSON.stringify({
      title: message.title || 'Our Little List',
      body: message.body || '',
      url: message.url || 'index.html',
      tag: `${message.kind || 'note'}-${message.id}`,
      late: age > STALE_MS
    });

    try {
      await webpush.sendNotification(target.subscription, payload, { TTL: 60 * 60 * 24 });
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

  console.log(`sent ${sent}, left ${skipped}, dropped ${dropped}`);
}

main().catch(problem => {
  console.error(problem.message || problem);
  process.exit(1);
});
