// Sends the notifications the website queues up.
//
// This used to be a GitHub Actions cron. GitHub treats scheduled workflows as
// the lowest-priority queue and was firing a `*/5` schedule roughly every four
// hours, which made "remind me at 3pm" mean "sometime this afternoon". Workers
// cron triggers actually run on the minute.

import { signIn, createClient } from './firestore.js';
import { sendNotification } from './webpush.js';

const GRACE_MS = 0;                  // never ring before the time that was chosen
const STALE_MS = 3 * 60 * 60_000;    // older than 3h: still send, but say it is late
const ABANDONED_MS = 7 * 24 * 60 * 60_000;
const LOCK_STALE_MS = 2 * 60_000;
let tokenCache = null;

function required(env, name) {
  const value = env[name];
  if (!value) throw new Error(`missing ${name}. Set it with: wrangler secret put ${name}`);
  return value;
}

export async function deliver(env) {
  const apiKey = required(env, 'FIREBASE_API_KEY');
  const projectId = required(env, 'FIREBASE_PROJECT_ID');
  const householdId = required(env, 'HOUSEHOLD_ID');
  const email = required(env, 'LITTLE_EMAIL');
  const password = required(env, 'LITTLE_PASSWORD');

  const vapid = {
    publicKey: required(env, 'VAPID_PUBLIC_KEY'),
    privateKey: required(env, 'VAPID_PRIVATE_KEY'),
    subject: env.VAPID_SUBJECT || `mailto:${email}`
  };

  const idToken = await tokenFor({ apiKey, email, password });
  const db = createClient({ projectId, idToken });
  const household = `households/${householdId}`;
  const lockPath = `${household}/deliveryLocks/active`;
  const lockAt = Date.now();

  if (!await acquireDeliveryLock(db, lockPath, lockAt)) {
    return { checked: false, skipped: 'already-running' };
  }

  try {

    const subscriptions = {};
    for (const record of await db.list(`${household}/pushSubs`)) {
      if (record?.subscription?.endpoint) subscriptions[record.id] = record;
    }

    const now = Date.now();
    const due = await db.dueFrom(`${household}/outbox`, 'sendAt', now + GRACE_MS, 50);
    if (due.length === 0) {
      return { checked: true, sent: 0, subscribed: Object.keys(subscriptions).length };
    }

    let sent = 0;
    let left = 0;
    let dropped = 0;

    for (const message of due) {
      // Lateness starts when the message was due, not when it was created. A
      // reminder made a month early is brand-new at its scheduled moment.
      const dueAge = Math.max(0, now - Number(message.sendAt || message.createdAt || now));
      if (dueAge > ABANDONED_MS) {
        await db.remove(message.path);
        dropped += 1;
        continue;
      }

    // A reminder whose record was deleted should not still go off.
      if (message.kind === 'reminder' && message.ref) {
        const reminder = await db.get(`${household}/reminders/${message.ref}`);
        if (!reminder) {
          await db.remove(message.path);
          dropped += 1;
          continue;
        }
      }

      const target = subscriptions[message.to];
      if (!target) {
      // Nobody on that side has turned notifications on yet. Leave it queued so
      // it lands once they do, then give up quietly.
        left += 1;
        continue;
      }

      const payload = JSON.stringify({
        title: message.title || 'Our Little List',
        body: message.body || '',
        url: message.url || 'index.html',
        tag: `${message.kind || 'note'}-${message.id}`,
        kind: message.kind || 'note',
        late: dueAge > STALE_MS
      });

      const result = await sendNotification(target.subscription, payload, vapid, {
        ttl: 86400,
        urgency: message.kind === 'reminder' || message.kind === 'help' ? 'high' : 'normal'
      });

      if (result.ok) {
        await db.remove(message.path);
        sent += 1;
      } else if (result.status === 404 || result.status === 410) {
      // The browser threw the subscription away. Clear it so that phone
      // re-registers next time it opens the site.
      console.log(`subscription for ${message.to} is gone (${result.status}); clearing it`);
        await db.remove(`${household}/pushSubs/${message.to}`);
        delete subscriptions[message.to];
        left += 1;
      } else {
        console.error(`could not send ${message.id}: ${result.status} ${result.text.slice(0, 200)}`);
        left += 1;
      }
    }

    return { checked: true, sent, left, dropped, subscribed: Object.keys(subscriptions).length };
  } finally {
    await db.remove(lockPath).catch(problem => console.error(`could not release delivery lock: ${problem.message || problem}`));
  }
}

async function tokenFor(credentials) {
  const key = `${credentials.apiKey}:${credentials.email}`;
  if (tokenCache?.key === key && tokenCache.expiresAt > Date.now() + 5 * 60_000) return tokenCache.idToken;
  const signed = await signIn(credentials);
  tokenCache = {
    key,
    idToken: signed.idToken,
    expiresAt: Date.now() + signed.expiresIn * 1000
  };
  return signed.idToken;
}

async function acquireDeliveryLock(db, path, now) {
  if (await db.create(path, { acquiredAt: now })) return true;
  const existing = await db.get(path);
  if (existing && now - Number(existing.acquiredAt || 0) < LOCK_STALE_MS) return false;
  await db.remove(path);
  return db.create(path, { acquiredAt: now });
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      deliver(env)
        .then(result => console.log(JSON.stringify(result)))
        .catch(problem => console.error(`delivery failed: ${problem.message || problem}`))
    );
  },

  // Lets you run it by hand while setting up, and gives a health check.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/run') {
      return new Response('our little list delivery. POST /run with the shared secret to trigger a pass.', { status: 200 });
    }
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405, headers: { Allow: 'POST' } });
    }
    if (!env.RUN_SECRET || request.headers.get('Authorization') !== `Bearer ${env.RUN_SECRET}`) {
      return new Response('nope', { status: 403 });
    }
    try {
      return Response.json(await deliver(env));
    } catch (problem) {
      return Response.json({ error: problem.message || String(problem) }, { status: 500 });
    }
  }
};
