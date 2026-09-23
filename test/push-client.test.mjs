// One phone can only hold one push subscription. If two accounts are ever used
// on it — which is exactly how this household started, with her phone signed in
// as him — both sides can end up filed against the same endpoint, and one
// person's reminders arrive on the other's phone. Nothing in the app surfaces
// that; it just quietly delivers to the wrong place. Hence these.

import assert from 'node:assert/strict';

const ENDPOINT = 'https://push.example/this-phone';

function browser({ permission = 'granted', existing = { endpoint: ENDPOINT } } = {}) {
  let subscription = existing && {
    endpoint: existing.endpoint,
    toJSON: () => ({ endpoint: existing.endpoint, keys: { p256dh: 'P', auth: 'A' } }),
    unsubscribe: async () => { subscription = null; return true; }
  };
  globalThis.matchMedia = () => ({ matches: true });
  globalThis.Notification = { permission };
  // Node 22 defines navigator as a getter-only global, so it has to be replaced
  // rather than assigned.
  Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: {
    userAgent: 'test-phone',
    serviceWorker: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: async () => subscription,
          subscribe: async () => {
            subscription = {
              endpoint: ENDPOINT,
              toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'P', auth: 'A' } }),
              unsubscribe: async () => { subscription = null; return true; }
            };
            return subscription;
          }
        }
      })
    }
  } });
  globalThis.window = globalThis;
  globalThis.PushManager = function () {};
  return { current: () => subscription };
}

// A stand-in for the Firestore layer, holding just the pushSubs collection.
function store(initial = {}) {
  const rows = { ...initial };
  return {
    rows,
    mode: 'firebase',
    async readOnce() { return Object.entries(rows).map(([id, value]) => ({ id, ...value })); },
    async setTo(_name, id, value) { rows[id] = value; },
    async removeFrom(_name, id) { delete rows[id]; }
  };
}

const { ensurePushSubscription, forgetPushSubscription } = await import('../push-client.js');

// 1. The phone that already answers for him must stop doing so when she signs in.
{
  browser();
  const data = store({ him: { person: 'him', subscription: { endpoint: ENDPOINT, keys: {} } } });
  const result = await ensurePushSubscription(data, 'her');
  assert.equal(result.state, 'ready');
  assert.ok(data.rows.her, 'her registration is written');
  assert.equal(data.rows.him, undefined, 'his registration on this same phone is released');
  console.log(' ok  registering claims this phone and releases the other side');
}

// 2. The other person's own phone, a different endpoint, is left alone.
{
  browser();
  const hisPhone = { person: 'him', subscription: { endpoint: 'https://push.example/his-phone', keys: {} } };
  const data = store({ him: hisPhone });
  await ensurePushSubscription(data, 'her');
  assert.deepEqual(data.rows.him, hisPhone, 'a different phone keeps its registration');
  console.log(' ok  the other phone is untouched');
}

// 3. Signing out stops this phone answering for the person who left.
{
  const phone = browser();
  const data = store({ her: { person: 'her', subscription: { endpoint: ENDPOINT, keys: {} } } });
  await forgetPushSubscription(data, 'her');
  assert.equal(data.rows.her, undefined, 'the registration is removed');
  assert.equal(phone.current(), null, 'the browser subscription is given up too');
  console.log(' ok  signing out hands back the subscription');
}

// 4. Nothing is written before notifications have been allowed.
{
  browser({ permission: 'default', existing: null });
  const data = store();
  const result = await ensurePushSubscription(data, 'her');
  assert.equal(result.state, 'needs-permission');
  assert.deepEqual(data.rows, {}, 'no half-registration is left behind');
  console.log(' ok  an un-permitted phone registers nothing');
}

console.log('\nPUSH REGISTRATION CLEAN');
