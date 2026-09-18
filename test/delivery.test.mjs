import { createClient, signIn } from '../tools/firestore.mjs';
import assert from 'node:assert/strict';

const calls = [];
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || 'GET', body: options.body });

  if (String(url).includes('signInWithPassword')) {
    return new Response(JSON.stringify({ idToken: 'tok', localId: 'UID123' }), { status: 200 });
  }
  if (String(url).includes(':runQuery')) {
    return new Response(JSON.stringify([
      { document: { name: 'p/documents/households/UID123/outbox/A1', fields: {
        to: { stringValue: 'him' }, title: { stringValue: '⏰ water' }, body: { stringValue: 'drink it' },
        url: { stringValue: 'reminders.html?from=him' }, kind: { stringValue: 'reminder' },
        ref: { stringValue: 'R9' }, sendAt: { integerValue: '1700000000000' }, createdAt: { integerValue: '1699999000000' } } } },
      { readTime: '2026-01-01T00:00:00Z' }
    ]), { status: 200 });
  }
  if (String(url).includes('/pushSubs')) {
    return new Response(JSON.stringify({ documents: [
      { name: 'p/documents/households/UID123/pushSubs/him', fields: {
        person: { stringValue: 'him' },
        subscription: { mapValue: { fields: {
          endpoint: { stringValue: 'https://push.example/abc' },
          keys: { mapValue: { fields: { p256dh: { stringValue: 'KEY' }, auth: { stringValue: 'AUTH' } } } }
        } } },
        updatedAt: { integerValue: '1700000000001' } } }
    ] }), { status: 200 });
  }
  if (String(url).includes('/reminders/R9')) return new Response('{}', { status: 404 });
  if (options.method === 'DELETE') return new Response('{}', { status: 200 });
  return new Response(JSON.stringify({ fields: {} }), { status: 200 });
};

const { idToken, uid } = await signIn({ apiKey: 'k', email: 'a@b.c', password: 'pw' });
assert.equal(uid, 'UID123');
assert.equal(idToken, 'tok');
console.log(' ok  sign-in returns the uid the rules key off');

const db = createClient({ projectId: 'proj', idToken });

const subs = await db.list(`households/${uid}/pushSubs`);
assert.equal(subs.length, 1);
assert.equal(subs[0].id, 'him');
assert.equal(subs[0].subscription.endpoint, 'https://push.example/abc');
assert.equal(subs[0].subscription.keys.p256dh, 'KEY');
console.log(' ok  nested subscription map decodes back into a usable object');

const due = await db.dueFrom(`households/${uid}/outbox`, 'sendAt', Date.now(), 50);
assert.equal(due.length, 1, 'the readTime-only row must be skipped');
assert.equal(due[0].id, 'A1');
assert.equal(due[0].sendAt, 1700000000000);
assert.equal(due[0].path, `households/${uid}/outbox/A1`);
console.log(' ok  due query decodes rows and ignores readTime padding');

const query = JSON.parse(calls.find(c => c.url.includes(':runQuery')).body);
assert.equal(query.structuredQuery.from[0].collectionId, 'outbox');
assert.equal(query.structuredQuery.where.fieldFilter.op, 'LESS_THAN_OR_EQUAL');
assert.equal(query.structuredQuery.orderBy[0].field.fieldPath, 'sendAt');
assert.ok(!query.structuredQuery.where.compositeFilter, 'a composite filter would need a manual index');
console.log(' ok  query uses a single field, so no composite index is needed');

const missing = await db.get(`households/${uid}/reminders/R9`);
assert.equal(missing, null);
console.log(' ok  a deleted reminder reads back as null, so its nudge gets dropped');

await db.remove(`households/${uid}/outbox/A1`);
assert.ok(calls.some(c => c.method === 'DELETE' && c.url.endsWith('/outbox/A1')));
console.log(' ok  delivered messages are deleted, keeping the query cheap');

console.log('\nDELIVERY LAYER CLEAN');
