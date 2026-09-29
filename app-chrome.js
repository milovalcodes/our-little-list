import { sharedLayer } from './data-hub.js';
import { awaitViewer, partnerOf } from './viewer.js';
import { personName } from './profile-store.js';
import { escapeHtml, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { APP_VERSION } from './app-meta.js';

const SEARCH_COLLECTIONS = ['items', 'notes', 'reminders', 'dates', 'memories'];
const page = document.body.dataset.app || (document.body.dataset.viewer ? 'home' : '');

if (page && !document.querySelector('.app-dock')) void boot();

async function boot() {
  const data = await sharedLayer();
  const viewer = await awaitViewer();
  if (!viewer) return;
  const other = partnerOf(viewer);

  markReturningVisit();
  addDock(viewer);
  addSheets();
  addSyncTray();
  improveEmptyStates();
  if (page === 'home') setupFridgeNote(data, viewer);

  const dock = document.querySelector('.app-dock');
  dock?.addEventListener('click', event => {
    const opener = event.target.closest('[data-open-sheet]');
    if (!opener) return;
    event.preventDefault();
    openSheet(opener.dataset.openSheet);
  });
  document.addEventListener('click', event => {
    const closer = event.target.closest('[data-close-sheet]');
    if (closer) closeSheets();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSheets(); });

  setupQuickAdd(data, viewer, other);
  setupSearch(data, viewer);
  setupUpdateCheck();
}

function addDock(viewer) {
  const active = name => page === name ? ' is-active' : '';
  document.body.insertAdjacentHTML('beforeend', `<nav class="app-dock" aria-label="Main navigation">
    <a class="dock-item${active('home')}" href="${viewer}.html"><i>⌂</i><span>home</span></a>
    <a class="dock-item${active('today')}" href="today.html"><i>◎</i><span>today</span></a>
    <button class="dock-add" type="button" data-open-sheet="quick" aria-label="Add something"><i>＋</i><span>add</span></button>
    <button class="dock-item" type="button" data-open-sheet="search"><i>⌕</i><span>find</span></button>
    <button class="dock-item" type="button" data-open-sheet="more"><i>•••</i><span>more</span></button>
  </nav>`);
  document.body.classList.add('has-app-dock');
}

function addSheets() {
  document.body.insertAdjacentHTML('beforeend', `<div class="sheet-scrim" data-close-sheet hidden></div>
    <section class="app-sheet" id="sheet-quick" role="dialog" aria-modal="true" aria-labelledby="quick-title" hidden>
      <header class="sheet-head"><div><small>put it in the app</small><h2 id="quick-title">Quick add</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>
      <div class="quick-kind" role="tablist">
        <button class="active" type="button" data-quick-kind="task">to-do</button><button type="button" data-quick-kind="note">note</button><button type="button" data-quick-kind="reminder">reminder</button><button type="button" data-quick-kind="date">date idea</button>
      </div>
      <form class="quick-add-form" id="quick-add-form">
        <label><span id="quick-label">what needs doing?</span><input id="quick-text" maxlength="180" required autocomplete="off" placeholder="the thing"></label>
        <label class="quick-when" id="quick-when-wrap" hidden><span>when?</span><input id="quick-when" type="datetime-local"></label>
        <button class="primary-action" id="quick-submit" type="submit">add it</button>
      </form>
    </section>
    <section class="app-sheet search-sheet" id="sheet-search" role="dialog" aria-modal="true" aria-labelledby="search-title" hidden>
      <header class="sheet-head"><div><small>across our stuff</small><h2 id="search-title">Find anything</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>
      <label class="search-box"><span>⌕</span><input id="global-search" type="search" autocomplete="off" placeholder="milk, reminder, that one note…"></label>
      <div class="search-results" id="search-results"><div class="search-start"><span>✦</span><p>type literally anything</p></div></div>
    </section>
    <section class="app-sheet more-sheet" id="sheet-more" role="dialog" aria-modal="true" aria-labelledby="more-title" hidden>
      <header class="sheet-head"><div><small>the rest of it</small><h2 id="more-title">More</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>
      <nav class="more-grid">
        <a href="notes.html"><i>💌</i><span>notes</span></a><a href="reminders.html"><i>⏰</i><span>reminders</span></a>
        <a href="dates.html"><i>✦</i><span>date pile</span></a><a href="memories.html"><i>◒</i><span>memories</span></a>
        <a href="activity.html"><i>↻</i><span>what's new</span></a><a href="status.html"><i>☀︎☾</i><span>right now</span></a>
        <a href="notifications.html"><i>♪</i><span>little pings</span></a><a href="profiles.html"><i>☺</i><span>our names</span></a>
        <a href="phone-check.html"><i>✓</i><span>phone check</span></a>
      </nav>
      <button class="update-row" id="check-update" type="button"><span><b>app version ${escapeHtml(APP_VERSION)}</b><small id="update-copy">tap to check for a fresh one</small></span><i>↻</i></button>
    </section>`);
}

function openSheet(name) {
  closeSheets(false);
  const sheet = document.getElementById(`sheet-${name}`);
  if (!sheet) return;
  sheet.hidden = false;
  document.querySelector('.sheet-scrim').hidden = false;
  document.body.classList.add('sheet-open');
  window.littleHaptic?.('tap');
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  if (name === 'search') window.setTimeout(() => document.getElementById('global-search')?.focus(), 220);
  if (name === 'quick') window.setTimeout(() => document.getElementById('quick-text')?.focus(), 220);
}

function closeSheets(animate = true) {
  const open = [...document.querySelectorAll('.app-sheet:not([hidden])')];
  open.forEach(sheet => sheet.classList.remove('is-open'));
  document.body.classList.remove('sheet-open');
  const finish = () => {
    open.forEach(sheet => { sheet.hidden = true; });
    const scrim = document.querySelector('.sheet-scrim');
    if (scrim) scrim.hidden = true;
  };
  animate && open.length ? window.setTimeout(finish, 190) : finish();
}

function setupQuickAdd(data, viewer, other) {
  let kind = 'task';
  const labels = {
    task: ['what needs doing?', 'the thing', 'add it'],
    note: [`note for ${personName(other)}`, 'say it here', 'send it'],
    reminder: [`remind ${personName(other)} to…`, 'the thing', 'set it'],
    date: ['the date idea', 'what are we doing?', 'save it']
  };
  const pick = next => {
    kind = next;
    document.querySelectorAll('[data-quick-kind]').forEach(button => button.classList.toggle('active', button.dataset.quickKind === kind));
    const words = labels[kind];
    document.getElementById('quick-label').textContent = words[0];
    document.getElementById('quick-text').placeholder = words[1];
    document.getElementById('quick-submit').textContent = words[2];
    document.getElementById('quick-when-wrap').hidden = kind !== 'reminder';
    document.getElementById('quick-text').focus();
  };
  document.querySelector('.quick-kind').addEventListener('click', event => {
    const button = event.target.closest('[data-quick-kind]');
    if (button) pick(button.dataset.quickKind);
  });
  document.getElementById('quick-add-form').addEventListener('submit', async event => {
    event.preventDefault();
    const text = document.getElementById('quick-text').value.trim();
    if (!text) return;
    const button = document.getElementById('quick-submit');
    setButtonBusy(button, true, '…');
    try {
      if (kind === 'task') {
        await data.addTo('items', { title: text, type: 'task', due: '', recurrence: 'once', aisle: '', addedBy: viewer, done: false, createdAt: Date.now() });
        void data.notify(other, { title: 'new thing on the list ✓', body: text, url: 'tasks.html', kind: 'item' });
      } else if (kind === 'note') {
        await data.addTo('notes', { sender: viewer, recipient: other, from: viewer, to: other, body: text, message: text, mood: 'star', read: false, createdAt: Date.now() });
        void data.notify(other, { title: viewer === 'her' ? 'the sun says ☀️' : 'the moon says 🌙', body: text, url: 'notes.html', kind: 'note' });
      } else if (kind === 'date') {
        await data.addTo('dates', { title: text, note: '', vibe: 'idea', addedBy: viewer, favorite: false, done: false, createdAt: Date.now() });
        void data.notify(other, { title: 'new date idea ✦', body: text, url: 'dates.html', kind: 'date' });
      } else {
        const dueAt = new Date(document.getElementById('quick-when').value).getTime();
        if (!Number.isFinite(dueAt) || dueAt <= Date.now()) {
          document.getElementById('quick-when').focus();
          throw Object.assign(new Error('pick a future time'), { friendly: true });
        }
        const record = await data.addTo('reminders', { sender: viewer, recipient: other, from: viewer, to: other, title: text, note: '', scheduledAt: new Date(dueAt).toISOString(), dueAt, delivered: false, createdAt: Date.now() });
        void data.notify(other, { title: 'new reminder ⏰', body: text, url: 'activity.html', kind: 'reminder-created' });
        void data.notify(other, { title: `⏰ ${text}`, body: `from ${personName(viewer)}`, url: 'activity.html', kind: 'reminder', ref: record?.id || '', sendAt: dueAt });
      }
      event.currentTarget.reset();
      closeSheets();
      toast(kind === 'note' ? 'sent 💌' : kind === 'reminder' ? 'reminder secured' : 'added');
      window.littleHaptic?.('success');
    } catch (problem) {
      if (problem?.friendly) showFailure('that time does not work.', 'pick a time in the future.');
      else showFailure('that did not get added.', 'check the internet and try again. Your text is still here.');
    } finally { setButtonBusy(button, false); }
  });
}

function setupSearch(data, viewer) {
  const input = document.getElementById('global-search');
  const results = document.getElementById('search-results');
  let entries = null;
  let loading = null;
  const load = async () => {
    if (entries) return entries;
    if (loading) return loading;
    results.innerHTML = '<div class="search-skeleton"><i></i><i></i><i></i></div>';
    loading = Promise.all(SEARCH_COLLECTIONS.map(async collection => ({ collection, items: await data.readOnce(collection) })))
      .then(groups => {
        entries = groups.flatMap(group => group.items.map(item => searchable(group.collection, item, viewer)));
        return entries;
      }).catch(() => { entries = []; return entries; });
    return loading;
  };
  input.addEventListener('focus', load, { once: true });
  input.addEventListener('input', async () => {
    const query = normalize(input.value);
    if (!query) { results.innerHTML = '<div class="search-start"><span>✦</span><p>type literally anything</p></div>'; return; }
    const all = await load();
    const matches = all.filter(item => item.haystack.includes(query)).slice(0, 30);
    results.innerHTML = matches.length ? matches.map(item => `<a class="search-hit" href="${item.url}"><span>${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta)}</small></div><i>›</i></a>`).join('') : `<div class="search-start"><span>🕵️</span><p>nothing. suspicious.</p><button type="button" data-open-quick-from-search>add it instead</button></div>`;
  });
  results.addEventListener('click', event => {
    if (!event.target.closest('[data-open-quick-from-search]')) return;
    closeSheets(false); openSheet('quick');
  });
}

function searchable(collection, item, viewer) {
  const map = {
    items: { icon: item.type === 'grocery' ? '🛒' : '✓', title: item.title, meta: item.done ? 'finished list thing' : 'on the list', url: 'tasks.html' },
    notes: { icon: '💌', title: item.body || item.message, meta: item.sender === viewer ? 'note you sent' : `note from ${personName(item.sender || item.from)}`, url: 'notes.html' },
    reminders: { icon: '⏰', title: item.title, meta: 'reminder', url: 'activity.html' },
    dates: { icon: '✦', title: item.title, meta: item.done ? 'date we did' : 'date pile', url: 'dates.html' },
    memories: { icon: '◒', title: item.text, meta: 'memory', url: 'memories.html' }
  };
  const value = map[collection];
  return { ...value, title: String(value.title || 'untitled'), haystack: normalize(`${value.title} ${value.meta} ${item.note || ''}`) };
}

function setupFridgeNote(data, viewer) {
  const launchpad = document.querySelector('.sky-launchpad');
  if (!launchpad) return;
  launchpad.insertAdjacentHTML('beforebegin', `<section class="fridge-note" id="fridge-note"><button class="fridge-paper" id="fridge-open" type="button"><span id="fridge-emoji">📌</span><div><small>on the fridge</small><strong id="fridge-copy">tap to pin something</strong></div><i>✎</i></button></section>`);
  document.body.insertAdjacentHTML('beforeend', `<section class="app-sheet fridge-sheet" id="sheet-fridge" role="dialog" aria-modal="true" aria-labelledby="fridge-title" hidden><header class="sheet-head"><div><small>one shared sticky note</small><h2 id="fridge-title">On the fridge</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header><form id="fridge-form"><label><span>tiny icon</span><input id="fridge-emoji-input" maxlength="8" value="📌"></label><label><span>the note</span><textarea id="fridge-text" maxlength="240" placeholder="important-ish household lore"></textarea></label><div class="fridge-actions"><button class="primary-action" type="submit">pin it</button><button class="soft-delete" id="fridge-clear" type="button">clear</button></div></form></section>`);
  let pin = null;
  data.listenTo('pins', items => {
    pin = items.find(item => item.id === 'fridge') || null;
    document.getElementById('fridge-copy').textContent = pin?.text || 'tap to pin something';
    document.getElementById('fridge-emoji').textContent = pin?.emoji || '📌';
    document.getElementById('fridge-note').classList.toggle('is-empty', !pin?.text);
  });
  document.getElementById('fridge-open').addEventListener('click', () => {
    document.getElementById('fridge-text').value = pin?.text || '';
    document.getElementById('fridge-emoji-input').value = pin?.emoji || '📌';
    openSheet('fridge');
  });
  document.getElementById('fridge-form').addEventListener('submit', async event => {
    event.preventDefault();
    const text = document.getElementById('fridge-text').value.trim();
    const emoji = document.getElementById('fridge-emoji-input').value.trim() || '📌';
    const button = event.currentTarget.querySelector('[type="submit"]');
    setButtonBusy(button, true, 'pinning…');
    try {
      await data.setTo('pins', 'fridge', { text, emoji, updatedBy: viewer, updatedAt: Date.now() });
      closeSheets(); toast('pinned to the fridge');
    } catch (_) { showFailure('that note fell off the fridge.', 'check the internet and try again.'); }
    finally { setButtonBusy(button, false); }
  });
  document.getElementById('fridge-clear').addEventListener('click', async () => {
    try { await data.removeFrom('pins', 'fridge'); closeSheets(); toast('fridge cleared'); }
    catch (_) { showFailure('that note is stubborn.', 'check the internet and try again.'); }
  });
}

function addSyncTray() {
  document.body.insertAdjacentHTML('beforeend', `<button class="sync-chip" id="sync-chip" type="button" hidden><i></i><span>saved</span></button><aside class="sync-tray" id="sync-tray" hidden><div><strong id="sync-title">all caught up</strong><p id="sync-copy">nothing waiting</p></div><button id="sync-retry" type="button">try now</button></aside>`);
  const chip = document.getElementById('sync-chip');
  const tray = document.getElementById('sync-tray');
  let hideTimer;
  const paint = detail => {
    window.clearTimeout(hideTimer);
    const state = detail?.state || (navigator.onLine ? 'synced' : 'offline');
    const words = {
      saving: ['saving…', 'putting that in the shared cloud'],
      pending: ['waiting to sync', 'saved on this phone; it will catch up'],
      offline: ['offline', 'saved stuff will go over when the internet returns'],
      failed: ['sync hiccup', 'one change may need another try'],
      synced: ['saved', 'both phones can see the latest']
    }[state];
    chip.hidden = false; chip.dataset.state = state; chip.querySelector('span').textContent = words[0];
    document.getElementById('sync-title').textContent = words[0]; document.getElementById('sync-copy').textContent = words[1];
    if (state === 'synced') hideTimer = window.setTimeout(() => { chip.hidden = true; tray.hidden = true; }, 1600);
  };
  chip.addEventListener('click', () => { tray.hidden = !tray.hidden; });
  document.getElementById('sync-retry').addEventListener('click', () => {
    if (!navigator.onLine) { toast('still offline'); return; }
    window.dispatchEvent(new Event('online')); paint({ state: 'saving' });
    window.setTimeout(() => paint({ state: 'synced' }), 1200);
  });
  window.addEventListener('online', () => paint({ state: 'saving' }));
  window.addEventListener('offline', () => paint({ state: 'offline' }));
  document.addEventListener('littlelist:sync', event => paint(event.detail));
  if (!navigator.onLine) paint({ state: 'offline' });
}

function setupUpdateCheck() {
  document.getElementById('check-update')?.addEventListener('click', async event => {
    const copy = document.getElementById('update-copy');
    event.currentTarget.classList.add('is-checking'); copy.textContent = 'checking…';
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      if (registration?.waiting) {
        copy.textContent = 'fresh version found · opening it…';
        registration.waiting.postMessage('skip-waiting');
      } else copy.textContent = 'already fresh';
    } catch (_) { copy.textContent = 'could not check right now'; }
    window.setTimeout(() => event.currentTarget.classList.remove('is-checking'), 500);
  });
}

function improveEmptyStates() {
  document.querySelectorAll('.empty-state').forEach(empty => {
    if (empty.querySelector('button,a')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'empty-action'; button.textContent = 'add one';
    button.addEventListener('click', () => openSheet('quick'));
    empty.append(button);
  });
}

function markReturningVisit() {
  const key = 'our-little-list-seen-app-shell';
  try {
    if (localStorage.getItem(key)) document.body.classList.add('return-visit');
    localStorage.setItem(key, 'yes');
  } catch (_) { /* no storage */ }
}

function normalize(value) {
  return String(value || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
