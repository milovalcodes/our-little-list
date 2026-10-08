import { deliver as realDeliver, ensureQuestionOfDay } from '../worker/src/index.js';
import { focusDelivery } from '../delivery-policy.js';
import { quietHoursEndUtc } from '../notification-policy.js';
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
const deliver = env => realDeliver(env, { scheduleQuestions: false });

// A Firestore-shaped in-memory client proves the morning/open/waiting/reveal
// transitions are idempotent, including across Worker retries.
{
  const docs = new Map();
  const db = {
    async create(path, fields) { if (docs.has(path)) return false; docs.set(path, structuredClone(fields)); return true; },
    async get(path) { return docs.get(path) || null; },
    async createMany(records) {
      if (records.some(record => docs.has(record.path))) return false;
      records.forEach(record => docs.set(record.path, structuredClone(record.fields)));
      return true;
    }
  };
  const base = 'households/HOUSE';
  const before = Date.parse('2026-10-02T11:59:00Z');
  assert.equal((await ensureQuestionOfDay(db, base, before)).open, false);
  assert.equal(docs.size, 0, 'nothing opens before 8 Eastern');
  const morning = Date.parse('2026-10-02T12:00:00Z');
  assert.equal((await ensureQuestionOfDay(db, base, morning)).open, true);
  assert.equal([...docs.keys()].filter(key => key.includes('/outbox/')).length, 2);
  await ensureQuestionOfDay(db, base, morning + 60000);
  assert.equal([...docs.keys()].filter(key => key.includes('/outbox/')).length, 2, 'retry cannot duplicate the opening pings');
  const question = docs.get(`${base}/questions/2026-10-02`);
  question.answers.her = { at:morning };
  await ensureQuestionOfDay(db, base, morning + 120000);
  assert.ok(docs.has(`${base}/outbox/question-2026-10-02-answered-him`));
  question.answers.him = { at:morning + 180000 };
  await ensureQuestionOfDay(db, base, morning + 180000);
  assert.ok(docs.has(`${base}/outbox/question-2026-10-02-reveal-her`), 'the first to answer hears about the reveal');
  assert.ok(!docs.has(`${base}/outbox/question-2026-10-02-reveal-him`), 'the one who just answered is already in the app');
  const count = docs.size;
  await ensureQuestionOfDay(db, base, morning + 240000);
  assert.equal(docs.size, count, 'reveal is sent once');
}

// Batch commits must name documents by resource path. A full https URL is
// refused by Firestore, which silently stopped every question ping.
{
  const { createClient } = await import('../worker/src/firestore.js');
  const realFetch = globalThis.fetch;
  let sent = null;
  globalThis.fetch = async (url, options) => { sent = { url, body: JSON.parse(options.body) }; return new Response('{}', { status: 200 }); };
  try {
    await createClient({ projectId: 'proj', idToken: 't' }).createMany([{ path: 'households/H/outbox/x', fields: { a: 1 } }]);
  } finally { globalThis.fetch = realFetch; }
  assert.ok(sent.url.endsWith('/projects/proj/databases/(default)/documents:commit'));
  assert.equal(sent.body.writes[0].update.name, 'projects/proj/databases/(default)/documents/households/H/outbox/x');
  console.log(' ok  question pings are written with names Firestore accepts');
}

function harness({ outbox = [], subs = { her: SUB }, reminders = {}, asks = {}, statuses = {}, questions = {}, game = null, pushStatus = 201, lockHeld = false, moveStatus = 200 }) {
  const deleted = [];
  const pushes = [];
  const moved = [];
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
    if (url.includes('/pushSubs?')) return Response.json({ documents: Object.entries(subs).map(([id, raw]) => {
      const s = raw.subscription || raw;
      const preferences = raw.preferences;
      const fields = { subscription: { mapValue: { fields: {
        endpoint: { stringValue: s.endpoint },
        keys: { mapValue: { fields: { p256dh: { stringValue: s.keys.p256dh }, auth: { stringValue: s.keys.auth } } } }
      } } } };
      if (Number.isFinite(raw.utcOffsetMinutes)) fields.utcOffsetMinutes = { integerValue: String(raw.utcOffsetMinutes) };
      if (preferences) fields.preferences = { mapValue: { fields: {
        backgroundSound: { stringValue: preferences.backgroundSound || 'default' },
        vibration: { stringValue: preferences.vibration || 'gentle' },
        inAppSound: { stringValue: preferences.inAppSound || 'twinkle' },
        categories: { mapValue: { fields: Object.fromEntries(Object.entries(preferences.categories || {}).map(([key, value]) => [key, { booleanValue: value }])) } },
        ...(preferences.quietHours ? { quietHours: { mapValue: { fields: {
          enabled: { booleanValue: preferences.quietHours.enabled === true },
          from: { stringValue: preferences.quietHours.from },
          to: { stringValue: preferences.quietHours.to }
        } } } } : {})
      } } };
      return { name: `p/documents/households/HOUSE/pushSubs/${id}`, fields };
    }) });
    if (url.includes(':runQuery')) return Response.json(outbox.map(m => ({ document: {
      name: `p/documents/households/HOUSE/outbox/${m.id}`,
      fields: Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'id').map(([k, v]) =>
        [k, typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: String(v) }])) } })));
    if (url.includes('/statuses/') && options.method !== 'DELETE') {
      const status = statuses[url.split('/statuses/')[1]];
      return status ? Response.json({ name:url, fields:{ focusUntil:{ integerValue:String(status.focusUntil || 0) } } }) : new Response('', { status:404 });
    }
    if (url.includes('/help/') && options.method !== 'DELETE') {
      const ask = asks[url.split('/help/')[1]];
      return ask ? Response.json({ name: url, fields: { state: { stringValue: ask.state } } }) : new Response('', { status: 404 });
    }
    if (url.includes('/games/sun-moon') && options.method !== 'DELETE') {
      return game ? Response.json({name:url,fields:{round:{stringValue:game.round},ply:{integerValue:String(game.ply)},closed:{booleanValue:game.closed}}}) : new Response('',{status:404});
    }
    if (url.includes('/questions/') && options.method !== 'DELETE') {
      const record = questions[url.split('/questions/')[1]];
      if (!record) return new Response('', { status:404 });
      const answerFields = Object.fromEntries(Object.entries(record.answers || {}).map(([person, answer]) => [
        person, { mapValue:{ fields:{ at:{ integerValue:String(answer.at) } } } }
      ]));
      return Response.json({ name:url, fields:{ answers:{ mapValue:{ fields:answerFields } } } });
    }
    if (url.includes('/reminders/')) {
      const id = url.split('/reminders/')[1];
      return reminders[id] ? Response.json({ name: url, fields: {} }) : new Response('', { status: 404 });
    }
    if (options.method === 'PATCH' && url.includes('/outbox/')) { moved.push({url,sendAt:Number(JSON.parse(options.body).fields.sendAt.integerValue)});return moveStatus === 200 ? Response.json({}) : new Response('denied', { status: moveStatus }); }
    if (options.method === 'DELETE') { deleted.push(url.split('/documents/')[1]); return Response.json({}); }
    if (url.startsWith('https://fcm.googleapis.com')) {
      pushes.push({ headers: options.headers, bytes: options.body.length });
      return new Response('', { status: pushStatus });
    }
    return Response.json({});
  };
  return { deleted, pushes, moved };
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

// 10. A muted category is dropped before Web Push. Receiving a push and then
// hiding it in the service worker violates userVisibleOnly and makes Chrome
// invent its own generic notification, so this filtering belongs here.
{
  const h = harness({
    outbox: [{ id:'MUTED', to:'her', title:'list thing', body:'x', kind:'item', sendAt:now-1000, createdAt:now-2000 }],
    subs: { her: { subscription: SUB, preferences: { categories: { lists:false } } } }
  });
  const r = await deliver(ENV);
  assert.equal(h.pushes.length, 0, 'muted category never becomes a push');
  assert.equal(r.muted, 1);
  assert.ok(h.deleted.some(path => path.endsWith('outbox/MUTED')), 'muted outbox row is cleared');
  console.log(' ok  a muted category is filtered before Web Push');
}

// 11. Reminders are asks with a time now. The nudge at that time still goes
// out while the ask is open, and is dropped once it has been sorted, turned
// down or deleted — nobody needs "⏰ bring water" after saying they cannot.
{
  const due = { to:'her', title:'⏰ bring water', body:'from him', kind:'reminder', sendAt: now-1000, createdAt: now-60000 };
  const h = harness({
    outbox: [{ id:'OPEN', ...due, ref:'help/Q1' }, { id:'SORTED', ...due, ref:'help/Q2' }, { id:'CANT', ...due, ref:'help/Q3' }, { id:'GONE', ...due, ref:'help/Q4' }, { id:'ODD', ...due, ref:'../pushSubs/her' }],
    asks: { Q1: { state:'on-it' }, Q2: { state:'done' }, Q3: { state:'cant' } }
  });
  const r = await deliver(ENV);
  assert.equal(h.pushes.length, 1, 'only the open ask is nudged');
  assert.equal(r.sent, 1);
  for (const id of ['SORTED', 'CANT', 'GONE', 'ODD']) assert.ok(h.deleted.some(path => path.endsWith(`outbox/${id}`)), `${id} is dropped`);
  assert.ok(!h.deleted.some(path => path.endsWith('pushSubs/her')), 'a malformed reference cannot reach anything else');
  console.log(' ok  a timed ask nudges while open and not after it is sorted');
}

// 12. A focus session postpones only low-priority chatter. The outbox row
// stays intact and is moved forward, so it cannot clog the due query.
{
  const until=now+15*60000;
  const h=harness({outbox:[
    {id:'HOLD',to:'her',title:'task',body:'x',kind:'item',sendAt:now-1000,createdAt:now-2000},
    {id:'NOTE',to:'her',title:'note',body:'x',kind:'note',sendAt:now-1000,createdAt:now-2000},
    {id:'ASK',to:'her',title:'ask',body:'x',kind:'help',sendAt:now-1000,createdAt:now-2000}
  ],statuses:{her:{focusUntil:until}}});
  const r=await deliver(ENV);
  assert.equal(r.held,1);
  assert.equal(r.sent,2,'notes and asks are not held');
  // Held five minutes at a time, so ending focus early releases it soon.
  assert.ok(Math.abs(h.moved[0].sendAt-(now+5*60000))<5000,`held in five-minute steps, got ${h.moved[0].sendAt-now}ms`);
  assert.ok(h.moved[0].url.includes('updateMask.fieldPaths=sendAt'));
  assert.ok(h.moved[0].url.includes('currentDocument.exists=true'),'a vanished message is not re-created by the hold');
  assert.ok(!h.deleted.some(path=>path.endsWith('outbox/HOLD')));
  assert.equal(focusDelivery({kind:'help'},{focusUntil:until},now).quiet,true,'ordinary asks go through quietly during focus');
  for(const kind of ['status','item','date','memory','reaction','keepsake'])assert.equal(focusDelivery({kind},{focusUntil:until},now).holdUntil,now+5*60000,`${kind} waits`);
  assert.equal(focusDelivery({kind:'item'},{focusUntil:now+60000},now).holdUntil,now+61000,'a session ending sooner holds only until it ends');
  assert.equal(focusDelivery({kind:'note'},{focusUntil:until},now).holdUntil,0,'notes stay open');
  console.log(' ok  focus holds chatter, but notes and asks still go through');
}

// 13. “Notify anyway” marks the ask urgent. It stays audible and gets
// high-priority delivery even while the recipient is focusing.
{
  const h=harness({outbox:[{id:'URGENT',to:'her',title:'ask',body:'x',kind:'help',urgent:true,sendAt:now-1000,createdAt:now-2000}],statuses:{her:{focusUntil:now+60000}}});
  const r=await deliver(ENV);
  assert.equal(r.sent,1);
  assert.equal(h.pushes[0].headers.Urgency,'high');
  assert.equal(focusDelivery({kind:'help',urgent:true},{focusUntil:now+60000},now).quiet,false);
console.log(' ok  an urgent ask is not quieted by focus');
}

// 14. Added and finished pings are independent choices, including phones that
// used to have a single "lists" switch.
{
  const h=harness({outbox:[
    {id:'ADDED',to:'her',title:'new',body:'x',kind:'item',sendAt:now-1000,createdAt:now-2000},
    {id:'FINISHED',to:'her',title:'done',body:'x',kind:'item-finished',sendAt:now-1000,createdAt:now-2000}
  ],subs:{her:{subscription:SUB,preferences:{categories:{listsAdded:false,listsFinished:true}}}}});
  const r=await deliver(ENV);
  assert.equal(r.muted,1);
  assert.equal(r.sent,1);
  assert.ok(h.deleted.some(path=>path.endsWith('outbox/ADDED')));
  console.log(' ok  list additions and completions can be muted separately');
}

// 15. Quiet hours postpone ordinary messages until the recipient phone's local
// morning. "Notify anyway" still goes through immediately.
{
  const clock=value=>new Date(value).toISOString().slice(11,16);
  const quietHours={enabled:true,from:clock(now-5*60000),to:clock(now+20*60000)};
  const h=harness({outbox:[
    {id:'SLEEP',to:'her',title:'note',body:'x',kind:'note',sendAt:now-1000,createdAt:now-2000},
    {id:'NOW',to:'her',title:'urgent ask',body:'x',kind:'help',urgent:true,sendAt:now-1000,createdAt:now-2000}
  ],subs:{her:{subscription:SUB,preferences:{quietHours},utcOffsetMinutes:0}}});
  const r=await deliver(ENV);
  assert.equal(r.held,1);
  assert.equal(r.sent,1);
  assert.equal(h.moved[0].sendAt,quietHoursEndUtc(now,quietHours,0));
  assert.ok(!h.deleted.some(path=>path.endsWith('outbox/SLEEP')));
  console.log(' ok  quiet hours hold ordinary pings but not notify-anyway asks');
}

// 16. Quiet hours never hold a reminder (someone picked that time) and never
// hold an arrival ("just got home" in the morning is not news): the arrival
// comes through silently instead.
{
  const clock=value=>new Date(value).toISOString().slice(11,16);
  const quietHours={enabled:true,from:clock(now-5*60000),to:clock(now+20*60000)};
  const h=harness({outbox:[
    {id:'REMIND',to:'her',title:'⏰ water',body:'x',kind:'reminder',sendAt:now-1000,createdAt:now-2000},
    {id:'HOME',to:'her',title:'home',body:'x',kind:'arrival',sendAt:now-1000,createdAt:now-2000}
  ],subs:{her:{subscription:SUB,preferences:{quietHours},utcOffsetMinutes:0}}});
  const r=await deliver(ENV);
  assert.equal(r.held,0);
  assert.equal(r.sent,2);
  console.log(' ok  quiet hours let reminders ring and arrivals through quietly');
}

// 17. A hold the database refuses must not stop the pass: the message stays
// at the front of the queue, and everything behind it still goes out.
{
  const h=harness({outbox:[
    {id:'STUCK',to:'her',title:'task',body:'x',kind:'item',sendAt:now-2000,createdAt:now-3000},
    {id:'NOTE2',to:'her',title:'note',body:'x',kind:'note',sendAt:now-1000,createdAt:now-2000}
  ],statuses:{her:{focusUntil:now+60000}},moveStatus:403});
  const r=await deliver(ENV);
  assert.equal(r.sent,1,'the note behind a refused hold still goes out');
  console.log(' ok  a refused hold does not stall delivery');
}

// 18. Asks keep high push priority so a dozing Android phone does not batch them.
{
  const h=harness({outbox:[{id:'ASKHI',to:'her',title:'ask',body:'x',kind:'help',sendAt:now-1000,createdAt:now-2000}]});
  await deliver(ENV);
  assert.equal(h.pushes[0].headers.Urgency,'high');
  console.log(' ok  asks are delivered with high priority');
}

// A held opening ping must not arrive after its recipient already answered;
// likewise the "your turn" ping is obsolete once both answers are in.
{
  const originalNow = Date.now;
  const fixed = Date.parse('2026-10-02T13:00:00Z');
  Date.now = () => fixed;
  try {
    const day = '2026-10-02';
    const h = harness({
      outbox: [
        { id:'OPEN-STALE', to:'her', title:'new question', body:'x', kind:'question-open', ref:`questions/${day}`, sendAt:fixed-1000, createdAt:fixed-2000 },
        { id:'ANSWERED-STALE', to:'him', title:'your turn', body:'x', kind:'question-answered', ref:`questions/${day}`, sendAt:fixed-1000, createdAt:fixed-2000 },
        { id:'REVEAL', to:'her', title:'both answered', body:'x', kind:'question-reveal', ref:`questions/${day}`, sendAt:fixed-1000, createdAt:fixed-2000 }
      ],
      questions:{ [day]:{ answers:{ her:{at:fixed-60000}, him:{at:fixed-30000} } } }
    });
    const result = await deliver(ENV);
    assert.equal(result.dropped, 2);
    assert.equal(result.sent, 1);
    assert.equal(h.pushes.length, 1);
    console.log(' ok  stale question pings are dropped once their moment has passed');
  } finally { Date.now = originalNow; }
}

{
  const messages=[
    {id:'OLDTURN',to:'her',title:'old turn',body:'x',kind:'game',ref:'round-1/2/open',sendAt:now-1000,createdAt:now-1000},
    {id:'TURN',to:'her',title:'your turn',body:'x',kind:'game',ref:'round-1/4/open',sendAt:now-1000,createdAt:now-1000}
  ];
  const game={round:'round-1',ply:4,closed:false};
  const h=harness({outbox:messages,game});
  const result=await deliver(ENV);
  assert.equal(result.dropped,1);assert.equal(result.sent,1);assert.equal(h.pushes.length,1);
  harness({outbox:[messages[1]],game,subs:{her:{subscription:SUB,preferences:{categories:{games:false}}}}});
  assert.equal((await deliver(ENV)).muted,1);
  harness({outbox:[messages[1]],game,statuses:{her:{focusUntil:now+60000}}});
  assert.equal((await deliver(ENV)).held,1);
  console.log(' ok  game turns drop stale pings, respect the game switch and wait during focus');
}
console.log('\nDELIVERY WORKER CLEAN');
