import { nextWordAttempt, wordSummary } from './word-game.js';
import { wordForDay } from './daily-words.js';
import {timedPuzzle} from './daily-puzzles.js';
import {newTimedGame,advanceTimedGame,timedSummary} from './timed-game.js';
import { firebaseConfig } from './firebase-config.js';
import { OUTBOX } from './push-config.js';
import { HOUSEHOLD_ID, configured as householdConfigured } from './household.js';
import { GAME_ID, nextGame, gameMessage, selectedGameId, gameNeedsPing } from './couple-game.js';

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
    { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, onSnapshot, setDoc, updateDoc, deleteDoc, doc, getDoc, getDocFromCache, getDocFromServer, getDocs, getDocsFromServer, writeBatch, runTransaction, serverTimestamp, query, where, orderBy, limit: limitQuery }
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
    listenTo(name, callback, { onError } = {}) {
      if (!signedIn()) return () => {};
      let live = liveCollections.get(name);
      if (!live) {
        live = { callbacks: new Set(), failures: new Map(), latest: null, metadata: null, unsubscribe: null };
        live.unsubscribe = onSnapshot(
          named(name),
          { includeMetadataChanges: name === 'games' },
          snapshot => {
            live.latest = snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
            live.metadata = { fromCache: snapshot.metadata.fromCache };
            live.callbacks.forEach(handler => safelyCall(handler, [...live.latest], live.metadata));
          },
          problem => {
            // A failed Firestore listener is terminal. Do not leave it cached
            // where reconnecting consumers would reuse a dead subscription.
            if (liveCollections.get(name) === live) liveCollections.delete(name);
            if (live.failures.size) live.failures.forEach(handler => safelyCall(handler, problem));
            else announceError(problem, 'listen');
          }
        );
        liveCollections.set(name, live);
      }
      live.callbacks.add(callback);
      if (onError) live.failures.set(callback, onError);
      if (live.latest) queueMicrotask(() => {
        if (live.callbacks.has(callback)) safelyCall(callback, [...live.latest], live.metadata);
      });
      return () => {
        live.callbacks.delete(callback);
        live.failures.delete(callback);
        if (live.callbacks.size === 0) {
          live.unsubscribe?.();
          if (liveCollections.get(name) === live) liveCollections.delete(name);
        }
      };
    },
    listenToQuery(name, options, callback, { onError } = {}) {
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
        live = { callbacks: new Set(), failures:new Map(), latest: null, unsubscribe: null };
        const confirmedPuzzle=['timedGames','timedResults'].includes(name);
        live.unsubscribe = onSnapshot(query(named(name), ...constraints), {includeMetadataChanges:confirmedPuzzle}, snapshot => {
          // Never turn an optimistic cache write into timed-game credit. The
          // metadata-only acknowledgement must still deliver the saved row.
          if(confirmedPuzzle&&snapshot.metadata.hasPendingWrites)return;
          live.latest = snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() }));
          live.callbacks.forEach(handler => safelyCall(handler, [...live.latest]));
        }, problem => {
          if(liveCollections.get(key)===live)liveCollections.delete(key);
          if(live.failures.size)live.failures.forEach(handler=>safelyCall(handler,problem));else announceError(problem,'listen');
        });
        liveCollections.set(key, live);
      }
      live.callbacks.add(callback);
      if(onError)live.failures.set(callback,onError);
      if (live.latest) queueMicrotask(() => {if(live.callbacks.has(callback))safelyCall(callback, [...live.latest]);});
      return () => {
        live.callbacks.delete(callback);
        live.failures.delete(callback);
        if (!live.callbacks.size) { live.unsubscribe?.(); if(liveCollections.get(key)===live)liveCollections.delete(key); }
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
    async setDateDone(id, done, viewer) {
      if (!signedIn() || navigator.onLine === false) throw new Error('Connect to finish this date.');
      // The date and its memory are one action. Transactions also prevent two
      // phones finishing the same date from creating two memories.
      return runTransaction(db, async transaction => {
        const ref = doc(named('dates'), id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error('This date was removed.');
        const idea = snapshot.data();
        if (Boolean(idea.done) === done) return;
        const now = Date.now();
        if (done) {
          const memoryId = `date-${id}`;
          transaction.set(doc(named('memories'), memoryId), { text:`✦ we did: ${idea.title}`, thumb:'', hasPhoto:false, addedBy:viewer, dateId:id, createdAt:now });
          transaction.update(ref, { done:true, doneAt:now, memoryId });
        } else {
          transaction.update(ref, { done:false, doneAt:0, memoryId:'' });
          if (idea.memoryId) transaction.delete(doc(named('memories'), idea.memoryId));
        }
      });
    },
    async playGame(options, displayName) {
      if (!signedIn()) throw new Error('Sign in to play.');
      // Moves must be confirmed online. A queued move against an old board
      // could otherwise overwrite a partner's move after reconnecting.
      return runTransaction(db, async transaction => {
        const id = selectedGameId(options.gameId || GAME_ID);
        const ref = doc(named('games'), id);
        const snapshot = await transaction.get(ref);
        const next = nextGame(snapshot.exists() ? snapshot.data() : null, options);
        const message = gameMessage(next, displayName);
        transaction.set(ref, next);
        // Capturing a box grants another turn. Don't ping "your turn" until it
        // really changes sides; the shared board still updates immediately.
        if(gameNeedsPing(next))transaction.set(doc(named(OUTBOX), `game-${id}-${next.round}-${next.ply}-${next.closed?'closed':'open'}`), message);
        return next;
      });
    },
    async submitWordGuess(options) {
      if (!signedIn() || navigator.onLine === false) throw new Error('Reconnect to save a guess. Your letters are still here.');
      const ref = doc(named('wordGames'), `${options.day}-${options.person}`);
      try { return await runTransaction(db, async transaction => {
        const puzzle = await transaction.get(doc(named('wordPuzzles'), options.day));
        const current = await transaction.get(ref);
        const next = nextWordAttempt(current.exists() ? current.data() : null, puzzle.exists() ? puzzle.data() : null, options);
        transaction.set(ref, next);
        transaction.set(doc(named('wordResults'), `${options.day}-${options.person}`), wordSummary(next));
        return next;
      }); } catch(problem) {
        // Rules can reject a stale concurrent write before the transaction
        // runner retries it. Distinguish that from a connection failure.
        if(problem?.code==='permission-denied'){
          let fresh;try{fresh=await getDocFromCache(ref);}catch(_){}
          if(!fresh?.exists()||fresh.data().guesses.length===options.expectedCount){
            let timer;try{fresh=await Promise.race([getDocFromServer(ref),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('read timeout')),4000);})]);}catch(_){}finally{clearTimeout(timer);}
          }
          if(fresh?.exists()&&fresh.data().guesses.length!==options.expectedCount)throw new Error('Your other screen made a guess. The board is catching up.');
          // A concurrent commit can be rejected before this client's read or
          // listener catches up. Do not leak the rules diagnostic into the UI,
          // or claim that a guess saved when we could not confirm it.
          throw new Error('Could not confirm this guess. If you played on another screen, wait for the board to catch up, then try again.');
        }
        throw problem;
      }
    },
    async playTimedPuzzle(options) {
      if(!signedIn()||navigator.onLine===false)throw Error('Reconnect to save this round.');
      const id=`${options.day}-${options.type}-${options.person}`,ref=doc(named('timedGames'),id);
      await runTransaction(db,async transaction=>{
        const p=await transaction.get(doc(named('timedPuzzles'),`${options.day}-${options.type}`));
        const current=await transaction.get(ref);
        if(options.day.includes('-tie-')){
          const end=await transaction.get(doc(named('wordDuelEnds'),options.day));
          if(end.exists())throw Error('This sudden-death set has finished.');
        }
        const puzzle=p.exists()?p.data():null;
        let game=current.exists()?current.data():null;
        if(options.start){if(game)return;game={...newTimedGame(puzzle,options.person),startedAt:serverTimestamp()};}
        else {
          if(!game||game.person!==options.person)throw Error('Start your round first.');
          if(game.done)return;
          if(Number.isInteger(options.index)&&options.answer!==puzzle?.entries[options.index]?.word)throw Error('That answer does not fit.');
          game=advanceTimedGame(game,puzzle,options);
          if(game.done)game.finishedAt=serverTimestamp();
        }
        transaction.set(ref,game);
        transaction.set(doc(named('timedResults'),id),timedSummary(game));
      });
      const saved=await getDocFromServer(ref);
      return saved.exists()?{id:saved.id,...saved.data()}:null;
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
          title: String(message?.title || 'Our Little App').slice(0, 120),
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
    async submitWordGuess(options) {
      const play = () => {
        const id = `${options.day}-${options.person}`;
        const games = read('wordGames');
        const next = nextWordAttempt(games.find(item => item.id === id), read('wordPuzzles').find(p=>p.day===options.day)||wordForDay(options.day), options);
        write('wordGames', [...games.filter(item => item.id !== id), {id,...next}]);
        write('wordResults', [...read('wordResults').filter(item => item.id !== id), {id,...wordSummary(next)}]);
        return next;
      };
      return navigator.locks ? navigator.locks.request('little-list-daily-word', play) : play();
    },
    async playTimedPuzzle(options) {
      const play=()=>{
        const id=`${options.day}-${options.type}-${options.person}`,games=read('timedGames');
        const puzzle=read('timedPuzzles').find(p=>p.day===options.day&&p.type===options.type)||timedPuzzle(options.day,options.type);
        if(options.day.includes('-tie-')&&read('wordDuelEnds').some(e=>e.id===options.day))throw Error('This sudden-death set has finished.');
        const before=games.find(g=>g.id===id);
        if(options.start&&before)return before;
        if(!options.start&&Number.isInteger(options.index)&&options.answer!==puzzle.entries[options.index]?.word)throw Error('That answer does not fit.');
        const next=options.start?newTimedGame(puzzle,options.person):advanceTimedGame(before,puzzle,options);
        write('timedGames',[...games.filter(g=>g.id!==id),{id,...next}]);
        write('timedResults',[...read('timedResults').filter(g=>g.id!==id),{id,...timedSummary(next)}]);
        return next;
      };
      return navigator.locks?navigator.locks.request('little-list-timed-'+options.day+'-'+options.type,play):play();
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
        const id = selectedGameId(options.gameId || GAME_ID);
        const games = read('games');
        const current = games.find(item => item.id === id);
        const next = nextGame(current ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'id')) : null, options);
        write('games', [...games.filter(item => item.id !== id), {id,...next}]);
        return next;
      };
      return navigator.locks ? navigator.locks.request('little-list-game', play) : play();
    },
    async setDateDone(id, done, viewer) {
      const change = () => {
        const dates = read('dates'), idea = dates.find(item => item.id === id);
        if (!idea) throw new Error('This date was removed.');
        if (Boolean(idea.done) === done) return;
        const now = Date.now(), memoryId = `date-${id}`;
        if (done) {
          write('memories', [...read('memories').filter(item => item.id !== memoryId), { id:memoryId, text:`✦ we did: ${idea.title}`, thumb:'', hasPhoto:false, addedBy:viewer, dateId:id, createdAt:now }]);
          Object.assign(idea,{done:true,doneAt:now,memoryId});
        } else {
          if (idea.memoryId) write('memories',read('memories').filter(item => item.id !== idea.memoryId));
          Object.assign(idea,{done:false,doneAt:0,memoryId:''});
        }
        write('dates',dates);
      };
      return navigator.locks ? navigator.locks.request('little-list-date', change) : change();
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

function safelyCall(callback, ...values) {
  try { callback(...values); } catch (problem) { console.error('collection listener failed', problem); }
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
