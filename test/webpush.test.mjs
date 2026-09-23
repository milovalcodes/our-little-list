import { encryptPayload, vapidHeader, b64urlToBytes, bytesToB64url } from '../worker/src/webpush.js';
import ece from 'http_ece';
import webpush from 'web-push';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const b64url = buf => buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

// --- 1. encrypt with our Worker code, decrypt with http_ece (what web-push itself uses) ---
{
  const receiver = crypto.createECDH('prime256v1');
  receiver.generateKeys();
  const p256dh = b64url(receiver.getPublicKey());
  const authSecret = crypto.randomBytes(16);

  const message = JSON.stringify({ title: '⏰ bring the water bottle', body: 'from the sun', url: 'reminders.html' });
  const body = await encryptPayload(message, p256dh, b64url(authSecret));

  const plain = ece.decrypt(Buffer.from(body), {
    version: 'aes128gcm',
    privateKey: receiver,
    authSecret: b64url(authSecret)
  });
  assert.equal(plain.toString('utf8'), message);
  console.log(' ok  payload round-trips through an independent aes128gcm decoder');
  console.log(`     (${message.length} bytes in, ${body.length} bytes on the wire)`);
}

// --- 2. header layout matches the RFC: salt|rs|idlen|key|ciphertext ---
{
  const receiver = crypto.createECDH('prime256v1');
  receiver.generateKeys();
  const body = await encryptPayload('hi', b64url(receiver.getPublicKey()), b64url(crypto.randomBytes(16)));
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  assert.equal(view.getUint32(16), 4096, 'record size');
  assert.equal(body[20], 65, 'key id length');
  assert.equal(body[21], 4, 'uncompressed point marker');
  console.log(' ok  content-encoding header is laid out as RFC 8188 requires');
}

// --- 3. non-ascii survives (their copy is full of emoji) ---
{
  const receiver = crypto.createECDH('prime256v1');
  receiver.generateKeys();
  const authSecret = crypto.randomBytes(16);
  const message = '🌙 ¿nos vemos? — café ☀️';
  const body = await encryptPayload(message, b64url(receiver.getPublicKey()), b64url(authSecret));
  const plain = ece.decrypt(Buffer.from(body), { version:'aes128gcm', privateKey: receiver, authSecret: b64url(authSecret) });
  assert.equal(plain.toString('utf8'), message);
  console.log(' ok  emoji and accents survive the trip');
}

// --- 4. VAPID token verifies, and matches what web-push would send ---
{
  const keys = webpush.generateVAPIDKeys();
  const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';
  const header = await vapidHeader({
    endpoint, subject: 'mailto:test@example.com',
    publicKey: keys.publicKey, privateKey: keys.privateKey
  });

  const [, token, publicKey] = header.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(publicKey, keys.publicKey, 'k= carries the public key');

  const [h, c, s] = token.split('.');
  const claims = JSON.parse(Buffer.from(c, 'base64url').toString());
  assert.equal(claims.aud, 'https://fcm.googleapis.com', 'audience is the endpoint origin, not the full path');
  assert.equal(claims.sub, 'mailto:test@example.com');
  assert.ok(claims.exp > Math.floor(Date.now()/1000), 'not already expired');
  assert.ok(claims.exp <= Math.floor(Date.now()/1000) + 24*60*60, 'within the 24h limit push services enforce');

  // Verify the signature against the public half, the way a push service will.
  const raw = b64urlToBytes(keys.publicKey);
  const verifyKey = await crypto.webcrypto.subtle.importKey('jwk', {
    kty:'EC', crv:'P-256',
    x: bytesToB64url(raw.slice(1,33)),
    y: bytesToB64url(raw.slice(33,65))
  }, { name:'ECDSA', namedCurve:'P-256' }, false, ['verify']);
  const valid = await crypto.webcrypto.subtle.verify(
    { name:'ECDSA', hash:'SHA-256' }, verifyKey,
    b64urlToBytes(s), new TextEncoder().encode(`${h}.${c}`)
  );
  assert.ok(valid, 'signature verifies');
  console.log(' ok  VAPID token verifies against its own public key');

  // web-push agrees on the shape
  const theirs = webpush.getVapidHeaders('https://fcm.googleapis.com', 'mailto:test@example.com',
    keys.publicKey, keys.privateKey, 'aes128gcm');
  assert.ok(theirs.Authorization.startsWith('vapid t='), 'same scheme web-push uses');
  console.log(' ok  header shape matches what web-push produces');
}

console.log('\nWEB PUSH IMPLEMENTATION CLEAN');
