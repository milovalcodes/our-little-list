// Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) on Web Crypto only.
//
// The npm `web-push` package is Node-only — it reaches for node:crypto and
// node:https, neither of which exists in a Worker. This is the same protocol
// written against the platform crypto that is available.

const encoder = new TextEncoder();

export function b64urlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function bytesToB64url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

// HKDF with a single-block expand, which is all this protocol ever needs.
async function hkdf(salt, ikm, info, length) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, Uint8Array.of(1)));
  return okm.slice(0, length);
}

// A raw P-256 public key is 0x04 || X(32) || Y(32).
function rawPublicKeyToJwk(raw) {
  return {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(raw.slice(1, 33)),
    y: bytesToB64url(raw.slice(33, 65)),
    ext: true
  };
}

export async function encryptPayload(payload, userPublicKey, userAuth, options = {}) {
  const uaPublic = b64urlToBytes(userPublicKey);
  const authSecret = b64urlToBytes(userAuth);
  const salt = options.salt || crypto.getRandomValues(new Uint8Array(16));

  const ephemeral = options.ephemeralKeyPair || await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey));

  const uaKey = await crypto.subtle.importKey(
    'jwk', rawPublicKeyToJwk(uaPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256)
  );

  // RFC 8291 §3.4: the auth secret salts the first extract, and the info string
  // binds both public keys into the derived material.
  const keyInfo = concat(encoder.encode('WebPush: info'), Uint8Array.of(0), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  const cek = await hkdf(salt, ikm, concat(encoder.encode('Content-Encoding: aes128gcm'), Uint8Array.of(0)), 16);
  const nonce = await hkdf(salt, ikm, concat(encoder.encode('Content-Encoding: nonce'), Uint8Array.of(0)), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  // 0x02 marks the final record; there is only ever one here.
  const plaintext = concat(encoder.encode(payload), Uint8Array.of(2));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext)
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, Uint8Array.of(asPublic.length), asPublic, ciphertext);
}

export async function vapidHeader({ endpoint, subject, publicKey, privateKey, expiresIn = 12 * 60 * 60 }) {
  const audience = new URL(endpoint).origin;
  const header = bytesToB64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToB64url(encoder.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    sub: subject
  })));
  const signingInput = `${header}.${claims}`;

  const publicRaw = b64urlToBytes(publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    { ...rawPublicKeyToJwk(publicRaw), d: privateKey, key_ops: ['sign'] },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  // Web Crypto returns the raw r||s that JWS wants, not the DER node emits.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(signingInput))
  );
  return `vapid t=${signingInput}.${bytesToB64url(signature)}, k=${publicKey}`;
}

export async function sendNotification(subscription, payload, vapid, options = {}) {
  const body = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);
  const authorization = await vapidHeader({ ...vapid, endpoint: subscription.endpoint });

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(options.ttl ?? 86400),
      // Without this, Android batches the wake-up and a reminder can sit in
      // doze for a long while after it was delivered to the push service.
      Urgency: options.urgency || 'high'
    },
    body
  });

  return { ok: response.ok, status: response.status, text: response.ok ? '' : await response.text() };
}
