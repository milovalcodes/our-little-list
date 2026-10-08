import { firebaseConfig } from './firebase-config.js';
import { OUTBOX } from './push-config.js';
import { HOUSEHOLD_ID, configured as householdConfigured } from './household.js';
import { GAME_ID, nextGame, gameMessage } from './couple-game.js';

const configured = firebaseConfig?.apiKey && !firebaseConfig.apiKey.startsWith('REPLACE_');

// Every method takes the collection name explicitly. The layer used to carry an
// implicit "primary" collection, which meant each page opened its own layer just
// to bind a different default — her.html ended up with three live connections to
// the same database.
export async function createDataLayer({ onAuth = () => {}, onReady = () => {} } = {}) {
  if (!configured) return createLocalLayer(onAuth, onReady);

  let modules;
  try {
    modules = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
    ]);
  } catch (problem) {
    announceError(problem, 'start');
    throw problem;
  }

  const [
    { initializeApp, getApps, getApp },
    { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence },
    { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, onSnapshot, setDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, getDocsFromServer, writeBatch, runTransaction, query, where, orderBy, limit: limitQuery }
  ] = modules;

  // Better a plain sentence than a permission-denied nobody can read.
  if (!householdConfigured()) {
    document.dispatchEvent(new CustomEvent('littlelist:dataerror', { detail: {
      message: 'this copy of the site is not finished being set up.',
      solution: 'the household id in household.js is still a placeholder.'
    } }));
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Keep the whole household on the phone. Without this the app needs a live
  // connection to show you your own shopping list: every read went to the
  // network, so a basement, a lift or a bad bar of signal meant an empty app.
  // With it, everything you have already seen is served from the phone and new
  // writes queue up until there is signal again.
  let db;
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch (_) {
    // This only fires if Firestore was already started on this app. An
    // IndexedDB that is blocked or unavailable does NOT land here —
    // initializeFirestore is synchronous and never opens it; the SDK notices
    // later and carries on in memory, which is how this behaved before.
    db = getFirestore(app);
  }
  try { await setPersistence(auth, browserLocalPersistence); } catch (_) { /* private mode */ }

  const named = name => collection(db, 'households', HOUSEHOLD_ID, name);
  const signedIn = () => Boolean(auth.currentUser);
  const liveCollections = new Map();

  const layer = {
    mode: 'firebase',
    signedIn,
    listenTo(name, callback) {
      if (!signedIn()) return () => {};
      let live = liveCollections.get(name);
      if (!live) {
        live = { callbacks: new Set(), latest: null, unsubscribe: null };
        live.unsubscribe = onSnapshot(
          named(name),
          snapshot => {
            live.latest = snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
            live.callbacks.forEach(handler => safelyCall(handler, [...live.latest]));
          },
          problem => announceError(problem, 'listen')
        );
        liveCollections.set(name, live);
      }
      live.callbacks.add(callback);
      if (live.latest) queueMicrotask(() => safelyCall(callback, [...live.latest]));
      return () => {
        live.callbacks.delete(callback);
        if (live.callbacks.size === 0) {
          live.unsubscribe?.();
          liveCollections.delete(name);
        }
      };
    },
    listenToQuery(name, options, callback) {
      const spec = querySpec(options);
      if (!signedIn()) return () => {};
      const key = `${name}:${JSON.stringify(spec)}`;
      let live = liveCollections.get(key);
      if (!live) {
        const constraints = [
          ...spec.where.map(({ field, op, value }) => where(field, op, value)),
          ...(spec.orderBy ? [orderBy(spec.orderBy.field, spec.orderBy.direction)] : []),
          ...(spec.limit ? [limitQuery(spec.limit)] : [])
        ];
        live = { callbacks: new Set(), latest: null, unsubscribe: null };
        live.unsubscribe = onSnapshot(query(named(name), ...constraints), snapshot => {
          live.latest = snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
          live.callbacks.forEach(handler => safelyCall(handler, [...live.latest]));
        }, problem => announceError(problem, 'listen'));
        liveCollections.set(key, live);
      }
      live.callbacks.add(callback);
      if (live.latest) queueMicrotask(() => safelyCall(callback, [...live.latest]));
      return () => {
        live.callbacks.delete(callback);
        if (!live.callbacks.size) { live.unsubscribe?.(); liveCollections.delete(key); }
      };
    },
    // A single read, for the places that need to look at a collection once and
    // then act — push registration checking who else is filed against this
    // phone, for instance. A live listener there would sit open for the life of
    // the page to answer one question.
    // fromServer refuses to answer from the local cache. Push registration uses
    // it: deciding which phone owns a browser endpoint from a stale snapshot
    // can revoke the other person's notifications, so it is better to skip the
    // check entirely than to make that call on old information.
    async readOnce(name, { fromServer = false } = {}) {
      if (!signedIn()) return [];
      const snapshot = fromServer ? await getDocsFromServer(named(name)) : await getDocs(named(name));
      return snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
    },
    async readDoc(name, id) {
      if (!signedIn()) return null;
      const snapshot = await getDoc(doc(named(name), id));
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    },
    async addTo(name, item) {
      // The id is minted locally rather than handed back by the server, so a
      // reminder created with no signal still knows its own id — which is what
      // its scheduled notification is filed against.
      const entry = doc(named(name));
      await applied(setDoc(entry, item), name);
      return { id: entry.id };
    },
    setTo: (name, id, item) => applied(setDoc(doc(named(name), id), item, { merge: true }), name),
    async playGame(options, displayName) {
      if (!signedIn()) throw new Error('Sign in to play.');
      // Moves must be confirmed online. A queued move against an old board
      // could otherwise overwrite a partner's move after reconnecting.
      return runTransaction(db, async transaction => {
        const ref = doc(named('games'), GAME_ID);
        const snapshot = await transaction.get(ref);
        const next = nextGame(snapshot.exists() ? snapshot.data() : null, options);
        const message = gameMessage(next, displayName);
        transaction.set(ref, next);
        transaction.set(doc(named(OUTBOX), `game-${next.round}-${next.ply}-${next.closed?'closed':'open'}`), message);
        return next;
      });
    },
    answerQuestion(day, person, text, at) {
      const batch = writeBatch(db);
      batch.set(doc(named('questionAnswers'), `${day}-${person}`), { day, person, text, at });
      batch.set(doc(named('questions'), day), { answers:{ [person]:{ at } } }, { merge:true });
      return applied(batch.commit(), 'questions');
    },
    updateIn: (name, id, changes) => applied(updateDoc(doc(named(name), id), changes), name),
    removeFrom: (name, id) => applied(deleteDoc(doc(named(name), id)), name),

    // Files a notification in the outbox. The scheduled delivery workflow picks
    // it up and sends the real web push. Nothing here claims to have delivered
    // anything: the old version fired an opaque no-cors request at Expo and
    // always reported success, which is why the site kept saying "sent" when
    // nothing had been.
    async notify(person, message) {
      if (!signedIn()) return { queued: false, reason: 'signed-out' };
      const sendAt = Number(message?.sendAt) || Date.now();
      try {
        await this.addTo(OUTBOX, {
          to: person === 'him' ? 'him' : 'her',
          title: String(message?.title || 'Our Little List').slice(0, 120),
          body: String(message?.body || '').slice(0, 400),
          url: notificationUrl(message?.url),
          kind: String(message?.kind || 'note'),
          urgent: message?.urgent === true,
          ref: message?.ref ? String(message.ref) : '',
          sendAt,
          createdAt: Date.now()
        });
        return { queued: true, scheduled: sendAt > Date.now() + 30000 };
      } catch (_) {
        return { queued: false };
      }
    },

    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    friendlyError(error) {
      const code = error?.code || '';
      if (code.includes('invalid-credential')) return 'That email or password does not match.';
      if (code.includes('email-already-in-use')) return 'Account already exists. Sign in instead.';
      if (code.includes('weak-password')) return 'Password needs 6 characters.';
      if (code.includes('network')) return 'This phone cannot connect right now.';
      if (code.includes('too-many-requests')) return 'Too many tries. Wait a minute and try again.';
      return 'That did not work. Try again.';
    }
  };

  onAuthStateChanged(auth, user => {
    announceReady();
    onReady(user);
    onAuth(user);
  }, problem => {
    announceError(problem, 'auth');
    onAuth(null);
  });

  return layer;
}

// Used when Firebase is not configured, and as the offline/dev path. Unlike the
// old version this one actually notifies its own listeners, so the site behaves
// the same way with or without sync.
function createLocalLayer(onAuth, onReady) {
  const key = name => `our-little-list-${name}-v1`;
  const listeners = new Map();
  const queryListeners = new Map();

  const read = name => {
    try { return JSON.parse(localStorage.getItem(key(name)))?.items || []; } catch (_) { return []; }
  };
  const write = (name, items) => {
    const id = QUIET_COLLECTIONS.has(name) ? 0 : announceSync('start');
    try { localStorage.setItem(key(name), JSON.stringify({ items })); } catch (_) { /* full or blocked */ }
    (listeners.get(name) || new Set()).forEach(callback => callback([...items]));
    if (id) queueMicrotask(() => announceSync('done', id));
  };
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  queueMicrotask(() => { announceReady(); onReady(null); onAuth(null); });

  window.addEventListener('storage', event => {
    for (const name of listeners.keys()) {
      if (event.key === key(name)) (listeners.get(name) || new Set()).forEach(callback => callback(read(name)));
    }
  });

  return {
    mode: 'local',
    signedIn: () => false,
    listenTo(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
      queueMicrotask(() => callback(read(name)));
      return () => listeners.get(name)?.delete(callback);
    },
    listenToQuery(name, options, callback) {
      const spec = querySpec(options);
      const key = `${name}:${JSON.stringify(spec)}`;
      let live = queryListeners.get(key);
      if (!live) {
        live = { callbacks: new Set(), unsubscribe: null, latest: null };
        live.unsubscribe = this.listenTo(name, items => {
          live.latest = applyQuery(items, spec);
          live.callbacks.forEach(handler => safelyCall(handler, [...live.latest]));
        });
        queryListeners.set(key, live);
      }
      live.callbacks.add(callback);
      if (live.latest) queueMicrotask(() => safelyCall(callback, [...live.latest]));
      return () => {
        live.callbacks.delete(callback);
        if (!live.callbacks.size) { live.unsubscribe?.(); queryListeners.delete(key); }
      };
    },
    async readOnce(name) {
      return read(name);
    },
    async readDoc(name, id) {
      return read(name).find(item => item.id === id) || null;
    },
    async addTo(name, item) {
      const items = read(name);
      const id = newId();
      items.push({ id, ...item });
      write(name, items);
      return { id };
    },
    async setTo(name, id, item) {
      const items = read(name);
      const current = items.find(entry => entry.id === id);
      // Firestore's setDoc({merge:true}) merges nested answer maps. Mirror that
      // here so the second answer in local preview never wipes the first.
      if (current && name === 'questions') Object.assign(current, item, { answers: { ...(current.answers || {}), ...(item.answers || {}) } });
      else if (current) Object.assign(current, item);
      else items.push({ id, ...item });
      write(name, items);
    },
    async answerQuestion(day, person, text, at) {
      const key = `${day}-${person}`;
      const answers = read('questionAnswers');
      const current = answers.find(entry => entry.id === key);
      if (current) Object.assign(current, { day, person, text, at });
      else answers.push({ id:key, day, person, text, at });
      write('questionAnswers', answers);
      const questions = read('questions');
      const question = questions.find(entry => entry.id === day);
      if (question) { question.answers = { ...(question.answers || {}), [person]:{ at } }; write('questions', questions); }
    },
    async playGame(options) {
      const play = () => {
        const games = read('games');
        const current = games.find(item => item.id === GAME_ID);
        const next = nextGame(current ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'id')) : null, options);
        write('games', [...games.filter(item => item.id !== GAME_ID), {id:GAME_ID,...next}]);
        return next;
      };
      return navigator.locks ? navigator.locks.request('little-list-game', play) : play();
    },
    async updateIn(name, id, changes) {
      const items = read(name);
      const current = items.find(entry => entry.id === id);
      if (current) Object.assign(current, changes);
      write(name, items);
    },
    async removeFrom(name, id) {
      write(name, read(name).filter(item => item.id !== id));
    },
    async notify() { return { queued: false, reason: 'local' }; },
    async signIn() {}, async signOut() {},
    friendlyError() { return 'sync is offline.'; }
  };
}

function querySpec(options = {}) {
  const filters = Array.isArray(options.where) ? options.where : options.where ? [options.where] : [];
  return {
    where: filters.map(({ field, op = '==', value }) => ({ field, op, value })),
    orderBy: options.orderBy ? {
      field: options.orderBy.field,
      direction: options.orderBy.direction === 'asc' ? 'asc' : 'desc'
    } : null,
    limit: Number.isInteger(options.limit) && options.limit > 0 ? options.limit : null
  };
}

function applyQuery(items, spec) {
  let result = items.filter(item => spec.where.every(({ field, op, value }) => {
    const actual = item[field];
    if (op === '==') return actual === value;
    if (op === '>=') return actual >= value;
    if (op === '<=') return actual <= value;
    if (op === '>') return actual > value;
    if (op === '<') return actual < value;
    throw new Error(`unsupported local query: ${op}`);
  }));
  if (spec.orderBy) {
    const { field, direction } = spec.orderBy;
    result = result.filter(item => item[field] !== undefined).sort((a, b) => {
      const compared = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
      return direction === 'asc' ? compared : -compared;
    });
  }
  return spec.limit ? result.slice(0, spec.limit) : result;
}

function announceReady() {
  document.dispatchEvent(new CustomEvent('littlelist:dataready'));
}

function announceError(problem, stage) {
  const code = String(problem?.code || '');
  let message = 'we could not load the shared stuff.';
  let solution = 'check the internet, then try again.';
  if (code.includes('permission-denied')) {
    message = 'the shared stuff is locked right now.';
    solution = 'sign out and back in. If it keeps happening, the database rules need attention.';
  } else if (code.includes('unauthenticated')) {
    message = 'the login expired.';
    solution = 'reload and sign in again.';
  } else if (code.includes('unavailable') || code.includes('network') || stage === 'start') {
    message = 'we cannot reach the shared space.';
    solution = 'turn on Wi-Fi or mobile data, then try again.';
  }
  document.dispatchEvent(new CustomEvent('littlelist:dataerror', { detail: { message, solution, code } }));
}

// Firestore resolves a write when the SERVER acknowledges it. With no signal
// that promise simply never settles, which would leave every save button in the
// app spinning forever.
//
// Racing every write against a timer was the wrong answer: it made a genuine
// failure look like a success whenever the failure took longer than the timer,
// and it held every button for the full duration even on a perfectly good
// connection. So the wait is only skipped when the browser says there is no
// network to wait for. Online, a write is awaited exactly as before and a real
// error still reaches the caller's catch.
const LOCAL_WRITE_MS = 300;
// The browser only knows whether it has *a* network, not whether that network
// goes anywhere. Hotel wifi that never forwards, a dead spot, a router that has
// quietly stopped: navigator.onLine stays true, the write never lands and never
// fails, and the button sat at "saving…" with no error and no way forward. This
// is the far end of that wait - long enough that a slow but working connection
// still reports honestly, short enough that nobody is left staring. What was
// typed is already durable in the on-device cache by then and goes across by
// itself, which is what "syncing" says.
const STALLED_WRITE_MS = 7000;

// Writes the app makes on its own, every minute, whether or not anyone touched
// anything: the presence heartbeat, the live location, this phone's push
// registration. Announcing those made the sync chip flash "saving…" all day.
const QUIET_COLLECTIONS = new Set(['presence', 'locations', 'pushSubs']);

function applied(work, name = '') {
  work.catch(() => {});
  // Each write reports its own start and end, so the chip can tell "something
  // is still on its way" apart from "the last thing to finish was fine". One
  // shared saving/synced flag let a presence beat landing declare everything
  // saved while a real change was still waiting.
  const id = QUIET_COLLECTIONS.has(name) ? 0 : announceSync('start');
  if (id) work.then(() => announceSync('done', id), () => announceSync('failed', id));
  const waitFor = navigator.onLine === false ? LOCAL_WRITE_MS : STALLED_WRITE_MS;
  let timer;
  const stalled = new Promise(resolve => { timer = setTimeout(() => resolve({ syncing: true }), waitFor); });
  return Promise.race([work, stalled]).finally(() => clearTimeout(timer));
}

let syncSerial = 0;
function announceSync(phase, id = ++syncSerial) {
  document.dispatchEvent(new CustomEvent('littlelist:sync', { detail: { phase, id, at: Date.now() } }));
  return id;
}

function safelyCall(callback, value) {
  try { callback(value); } catch (problem) { console.error('collection listener failed', problem); }
}

function notificationUrl(value) {
  try {
    const target = new URL(String(value || 'index.html'), location.href);
    const appRoot = new URL('./', import.meta.url);
    if (target.origin !== appRoot.origin || !target.href.startsWith(appRoot.href)) return './index.html';
    return `${target.pathname}${target.search}${target.hash}`.slice(0, 200);
  } catch (_) {
    return './index.html';
  }
}
