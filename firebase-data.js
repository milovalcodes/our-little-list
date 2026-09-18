import { firebaseConfig } from './firebase-config.js';
import { OUTBOX } from './push-config.js';

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
    { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence },
    { getFirestore, collection, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, doc }
  ] = modules;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  try { await setPersistence(auth, browserLocalPersistence); } catch (_) { /* private mode */ }

  const named = name => collection(db, 'households', auth.currentUser.uid, name);
  const signedIn = () => Boolean(auth.currentUser);

  const layer = {
    mode: 'firebase',
    signedIn,
    listenTo(name, callback) {
      if (!signedIn()) return () => {};
      return onSnapshot(
        named(name),
        snapshot => callback(snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }))),
        problem => announceError(problem, 'listen')
      );
    },
    addTo: (name, item) => addDoc(named(name), item),
    setTo: (name, id, item) => setDoc(doc(named(name), id), item, { merge: true }),
    updateIn: (name, id, changes) => updateDoc(doc(named(name), id), changes),
    removeFrom: (name, id) => deleteDoc(doc(named(name), id)),

    // Files a notification in the outbox. The scheduled delivery workflow picks
    // it up and sends the real web push. Nothing here claims to have delivered
    // anything: the old version fired an opaque no-cors request at Expo and
    // always reported success, which is why the site kept saying "sent" when
    // nothing had been.
    async notify(person, message) {
      if (!signedIn()) return { queued: false, reason: 'signed-out' };
      const sendAt = Number(message?.sendAt) || Date.now();
      try {
        await addDoc(named(OUTBOX), {
          to: person === 'him' ? 'him' : 'her',
          title: String(message?.title || 'Our Little List').slice(0, 120),
          body: String(message?.body || '').slice(0, 400),
          url: String(message?.url || 'index.html').slice(0, 200),
          kind: String(message?.kind || 'note'),
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
    createAccount: (email, password) => createUserWithEmailAndPassword(auth, email, password),
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

  const read = name => {
    try { return JSON.parse(localStorage.getItem(key(name)))?.items || []; } catch (_) { return []; }
  };
  const write = (name, items) => {
    try { localStorage.setItem(key(name), JSON.stringify({ items })); } catch (_) { /* full or blocked */ }
    (listeners.get(name) || new Set()).forEach(callback => callback([...items]));
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
      if (current) Object.assign(current, item); else items.push({ id, ...item });
      write(name, items);
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
    async signIn() {}, async createAccount() {}, async signOut() {},
    friendlyError() { return 'sync is offline.'; }
  };
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
