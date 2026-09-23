import { deliver } from '../worker/src/index.js';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const b64url = buf => buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const receiver = crypto.createECDH('prime256v1'); receiver.generateKeys();
const SUB = { endpoint: 'https://fcm.googleapis.com/fcm/send/HER-DEVICE',
  keys: { p256dh: b64url(receiver.getPublicKey()), auth: b64url(crypto.randomBytes(16)) } };

const vapidKeys = (await import('web-push')).default.generateVAPIDKeys();
const ENV = {
  FIREBASE_API_KEY: 'key', FIREBASE_PROJECT_ID: 'proj', HOUSEHOLD_ID: 'HOUSE',
  LITTLE_EMAIL: 'a@b.c', LITTLE_PASSWORD: 'pw',
  VAPID_PUBLIC_KEY: vapidKeys.publicKey, VAPID_PRIVATE_KEY: vapidKeys.privateKey
};

function harness({ outbox = [], subs = { her: SUB }, reminders = {}, pushStatus = 201, lockHeld = false }) {
  const deleted = [];
  const pushes = [];
  globalThis.fetch = async (url, options = {}) => {
    url = String(url);
    if (url.includes('signInWithPassword')) return Response.json({ idToken: 'tok', localId: 'HOUSE' });
    if (url.includes('/deliveryLocks?documentId=active')) {
      return lockHeld ? new Response('', { status: 409 }) : Response.json({});
    }
    if (url.endsWith('/deliveryLocks/active') && options.method !== 'DELETE') {
      return Response.json({ name: 'p/documents/households/HOUSE/deliveryLocks/active', fields: {
        acquiredAt: { integerValue: String(Date.now()) }
      } });
    }
    if (url.includes('/pushSubs?')) return Response.json({ documents: Object.entries(subs).map(([id, s]) => ({
      name: `p/documents/households/HOUSE/pushSubs/${id}`,
      fields: { subscription: { mapValue: { fields: {
        endpoint: { stringValue: s.endpoint },
        keys: { mapValue: { fields: { p256dh: { stringValue: s.keys.p256dh }, auth: { stringValue: s.keys.auth } } } }
      } } } } })) });
    if (url.includes(':runQuery')) return Response.json(outbox.map(m => ({ document: {
      name: `p/documents/households/HOUSE/outbox/${m.id}`,
      fields: Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'id').map(([k, v]) =>
        [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) }])) } })));
    if (url.includes('/reminders/')) {
      const id = url.split('/reminders/')[1];
      return reminders[id] ? Response.json({ name: url, fields: {} }) : new Response('', { status: 404 });
    }
    if (options.method === 'DELETE') { deleted.push(url.split('/documents/')[1]); return Response.json({}); }
    if (url.startsWith('https://fcm.googleapis.com')) {
      pushes.push({ headers: options.headers, bytes: options.body.length });
      return new Response('', { status: pushStatus });
    }
    return Response.json({});
  };
  return { deleted, pushes };
}

const now = Date.now();

// 1. a due message goes out and is cleaned up
{
  const h = harness({ outbox: [{ id:'A1', to:'her', title:'⏰ water', body:'drink it', url:'reminders.html', kind:'note', sendAt: now-1000, createdAt: now-2000 }] });
  const r = await deliver(ENV);
  assert.equal(r.sent, 1);
  assert.equal(h.pushes.length, 1);
  assert.ok(h.deleted.some(p => p.endsWith('outbox/A1')), 'delivered message is removed');
  console.log(' ok  a due message is sent, then cleared from the outbox');
}

// 2. reminders are marked urgent so Android does not batch them in doze
{
  const h = harness({ outbox: [
    { id:'R1', to:'her', title:'⏰', body:'x', kind:'reminder', ref:'keep', sendAt: now-1000, createdAt: now-2000 },
    { id:'N1', to:'her', title:'note', body:'y', kind:'note', sendAt: now-1000, createdAt: now-2000 }
  ], reminders: { keep: true } });
  await deliver(ENV);
  assert.equal(h.pushes[0].headers.Urgency, 'high', 'reminder urgency');
  assert.equal(h.pushes[1].headers.Urgency, 'normal', 'note urgency');
  console.log(' ok  reminders go out as urgent, chatter does not');
}

// 3. a reminder whose record was deleted does not fire
{
  const h = harness({ outbox: [{ id:'R2', to:'her', title:'⏰ gone', body:'', kind:'reminder', ref:'missing', sendAt: now-1000, createdAt: now-2000 }] });
  const r = await deliver(ENV);
  assert.equal(h.pushes.length, 0, 'nothing sent');
  assert.equal(r.dropped, 1);
  assert.ok(h.deleted.some(p => p.endsWith('outbox/R2')));
  console.log(' ok  a cancelled reminder does not go off');
}

// 4. a dead subscription is cleared so the phone re-registers
{
  const h = harness({ outbox: [{ id:'A2', to:'her', title:'t', body:'b', kind:'note', sendAt: now-1000, createdAt: now-2000 }], pushStatus: 410 });
  const r = await deliver(ENV);
  assert.equal(r.sent, 0);
  assert.ok(h.deleted.some(p => p.endsWith('pushSubs/her')), 'stale subscription removed');
  assert.ok(!h.deleted.some(p => p.endsWith('outbox/A2')), 'message kept for the next attempt');
  console.log(' ok  a dead subscription is cleared and the message is kept');
}

// 5. nothing registered yet: hold the message, do not lose it
{
  const h = harness({ outbox: [{ id:'A3', to:'him', title:'t', body:'b', kind:'note', sendAt: now-1000, createdAt: now-2000 }], subs: { her: SUB } });
  const r = await deliver(ENV);
  assert.equal(r.sent, 0);
  assert.equal(r.left, 1);
  assert.ok(!h.deleted.some(path => path.endsWith('outbox/A3')), 'stays queued until that phone registers');
  console.log(' ok  a message for an unregistered phone waits rather than vanishing');
}

// 6. a week-old straggler is dropped instead of surprising someone
{
  const old = now - 8 * 24 * 60 * 60 * 1000;
  const h = harness({ outbox: [{ id:'A4', to:'her', title:'t', body:'b', kind:'note', sendAt: old, createdAt: old }] });
  const r = await deliver(ENV);
  assert.equal(r.dropped, 1);
  assert.equal(h.pushes.length, 0);
  console.log(' ok  a week-old message is dropped, not delivered out of nowhere');
}

// 7. a reminder created weeks early is still fresh when its due time arrives
{
  const old = now - 20 * 24 * 60 * 60 * 1000;
  const h = harness({ outbox: [{ id:'R3', to:'her', title:'future thing', body:'now', kind:'reminder', ref:'keep', sendAt:now-1000, createdAt:old }], reminders:{ keep:true } });
  const r = await deliver(ENV);
  assert.equal(r.sent, 1);
  assert.equal(r.dropped, 0);
  assert.equal(h.pushes.length, 1);
  console.log(' ok  a long-range reminder survives until its actual due time');
}

// 8. an overlapping pass backs off instead of sending the same outbox twice
{
  const h = harness({ outbox: [{ id:'DUP', to:'her', title:'once', body:'only', kind:'note', sendAt:now-1000, createdAt:now-2000 }], lockHeld:true });
  const r = await deliver(ENV);
  assert.equal(r.skipped, 'already-running');
  assert.equal(h.pushes.length, 0);
  console.log(' ok  an overlapping delivery pass does not send');
}

// 9. quiet pass costs one query and sends nothing
{
  const h = harness({ outbox: [] });
  const r = await deliver(ENV);
  assert.equal(r.sent, 0);
  assert.equal(h.pushes.length, 0);
  assert.equal(r.subscribed, 1);
  console.log(' ok  an idle minute sends nothing and reports who is subscribed');
}

console.log('\nDELIVERY WORKER CLEAN');
