import { GAME_CATALOG, gameResult } from './couple-game.js';

// One small stream per page. Firestore supplies immediate moves; a visible-only
// server check also recovers phones whose stream stalled after being suspended.
export function watchGames(data, receive, status = () => {}, env = {}) {
  const win = env.window || window, doc = env.document || document;
  const online = () => (env.navigator || navigator).onLine !== false;
  const visible = () => doc.visibilityState !== 'hidden';
  const later = env.setTimeout || setTimeout, cancel = env.clearTimeout || clearTimeout;
  let stopped = false, unsubscribe, retry, watchdog, reading = false, revision = 0;
  let generation = 0, serverSeen = false, latest = [], signature, attempts = 0, idleChecks = 0, state;
  const setState = next => { if (!stopped && state !== next) { state = next; status(next); } };
  const publish = items => {
    latest = items.filter(item => Object.hasOwn(GAME_CATALOG, item.id)).sort((a,b) => a.id.localeCompare(b.id));
    const next = JSON.stringify(latest);
    if (signature !== next) { signature = next; receive(latest); }
  };
  const canSync = () => !stopped && visible() && online();
  function scheduleRetry() {
    if (!canSync() || retry) return;
    retry = later(() => { retry = undefined; connect(); void refresh(); }, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)));
  }
  function connect() {
    if (stopped) return;
    unsubscribe?.();
    const current = ++generation;
    unsubscribe = data.listenTo('games', (items, metadata) => {
      if (stopped || current !== generation) return;
      // On reattachment the SDK can first replay an older local cache.
      if (metadata?.fromCache && serverSeen) return;
      revision++;
      if (metadata?.fromCache !== true) {
        serverSeen = true; attempts = 0; cancel(retry); retry = undefined;
        setState(online() ? 'connected' : 'offline');
      } else setState(online() ? 'connecting' : 'offline');
      publish(items);
    }, { onError: () => {
      if (stopped || current !== generation) return;
      setState(online() ? 'reconnecting' : 'offline');
      scheduleRetry();
    } });
  }
  async function refresh() {
    if (!canSync() || reading || data.mode === 'local') return;
    reading = true;
    const before = revision;
    let timeout;
    try {
      const items = await Promise.race([
        data.readOnce('games', { fromServer: true }),
        new Promise((_, reject) => { timeout = later(() => reject(new Error('game sync timeout')), 12000); })
      ]);
      if (stopped) return;
      // A slow recovery read must never rewind a live move delivered meanwhile.
      if (revision === before) {
        const previous = signature, hadServer = serverSeen;
        revision++; serverSeen = true; publish(items);
        // A changed server board without a matching stream event means the
        // stream may be silently stuck. Reattach so later turns are live again.
        if (hadServer && signature !== previous) connect();
      }
      setState(online() ? 'connected' : 'offline');
    } catch (_) {
      if (!stopped && revision === before) {
        setState(online() ? 'reconnecting' : 'offline');
        scheduleRetry();
      }
    } finally { cancel(timeout); reading = false; }
  }
  function resume() {
    if (!canSync()) { if (!online()) setState('offline'); return; }
    cancel(retry); retry = undefined; attempts = 0;
    setState('connecting'); connect(); void refresh();
  }
  function tick() {
    if (stopped) return;
    if (canSync() && (!serverSeen || state !== 'connected' || latest.some(game => !game.closed && !gameResult(game).over) || ++idleChecks >= 3)) {
      idleChecks = 0; void refresh();
    }
    watchdog = later(tick, 20000);
  }
  const offline = () => { cancel(retry); retry = undefined; setState('offline'); };
  win.addEventListener('online', resume);
  win.addEventListener('focus', resume);
  win.addEventListener('offline', offline);
  doc.addEventListener('visibilitychange', resume);
  win.addEventListener('pageshow', resume);
  setState(online() ? 'connecting' : 'offline');
  connect();
  watchdog = later(tick, 20000);
  return () => {
    stopped = true; generation++; unsubscribe?.(); cancel(retry); cancel(watchdog);
    win.removeEventListener('online', resume);
    win.removeEventListener('focus', resume);
    win.removeEventListener('offline', offline);
    doc.removeEventListener('visibilitychange', resume);
    win.removeEventListener('pageshow', resume);
  };
}
