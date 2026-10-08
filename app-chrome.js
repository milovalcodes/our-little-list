import { sharedLayer } from './data-hub.js';
import { awaitViewer, partnerOf } from './viewer.js';
import { personName } from './profile-store.js';
import { escapeHtml, setButtonBusy, settleQuickly, showFailure, toast } from './ui-helpers.js';
import { addTask, sendNote, sendAsk, addDateIdea } from './records.js';
import { chooseAskUrgency } from './focus-ask.js';
import { fridgeNote, clearFridge } from './fridge.js';
import { momentPickerHtml, setupMomentPicker } from './moment-picker.js';
import { friendlyWhen } from './time-format.js';
import { openEmojiPicker } from './emoji-picker.js';

const SEARCH_COLLECTIONS = ['items', 'notes', 'help', 'dates', 'memories'];
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
  movePageComposers();
  addSyncTray();
  if (page === 'home') setupFridgeNote(data, viewer, other);

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open-sheet]');
    if (!opener) return;
    event.preventDefault();
    // One relevant add button: feature pages open their full composer,
    // while Home keeps the all-purpose quick chooser.
    const contextual = opener.matches('.context-add') ? document.querySelector('.page-add[data-open-sheet]:not([hidden])')?.dataset.openSheet : '';
    openSheet(contextual || opener.dataset.openSheet);
  });
  document.addEventListener('click', event => {
    const closer = event.target.closest('[data-close-sheet]');
    if (closer) closeSheets();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSheets(); });

  const openQuick = setupQuickAdd(data, viewer, other);
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open-quick]');
    if (opener) { event.preventDefault(); openQuick(opener.dataset.openQuick); }
  });
  setupSearch(data, viewer, openQuick);
  setupDeepLinkHighlight();
  window.addEventListener('hashchange', setupDeepLinkHighlight);
  navigator.serviceWorker?.addEventListener('message', event => {
    if(event.data?.type!=='OPEN_NOTIFICATION')return;
    try {
      const target=new URL(event.data.url,location.href);
      if(target.origin!==location.origin||target.pathname!==location.pathname||target.search!==location.search)return;
      closeSheets(false);
      if(location.hash!==target.hash)location.hash=target.hash;
      else window.dispatchEvent(new HashChangeEvent('hashchange'));
      event.ports?.[0]?.postMessage({handled:true});
    } catch (_) { /* ignore malformed messages */ }
  });
  const openSection = () => {
    if(page==='today'&&location.hash==='#focus')openSheet('focus');
  };
  window.addEventListener('hashchange',openSection);
  openSection();
  setupRowMenus();
  const searchHost = document.querySelector('.feature-shell > .feature-hero') || document.querySelector('.app-topbar');
  if (searchHost && !searchHost.querySelector('[data-open-sheet="search"]')) {
    searchHost.insertAdjacentHTML('beforeend', '<button class="topbar-search" type="button" data-open-sheet="search" aria-label="Search">⌕</button>');
  }
  addContextAction(searchHost);
  setupUpdateCheck();
}

function movePageComposers() {
  const move = (selector, id, title) => {
    const node = document.querySelector(selector);
    if (!node) return;
    if (!node.id) node.id = id;
    node.dataset.sheetName = id.slice(6);
    node.hidden = true;
    node.classList.add('app-sheet', 'page-compose-sheet');
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', title);
    node.insertAdjacentHTML('afterbegin', `<header class="sheet-head"><div><h2>${title}</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>`);
    document.body.append(node);
  };
  if (page === 'tasks') {
    move('#task-composer', 'sheet-task-form', 'Add to the list');
    move('.help-maker', 'sheet-ask-form', 'Ask for a hand');
  }
  if (page === 'dates') move('.date-composer', 'sheet-date-form', 'Add a date idea');
  if (page === 'today') move('.focus-card', 'sheet-focus', 'Focus together');
  if (page === 'memories') move('.memory-composer', 'sheet-memory-form', 'Add a memory');
}

function addDock(viewer) {
  const active = name => page === name ? ' is-active' : '';
  document.body.insertAdjacentHTML('beforeend', `<nav class="app-dock" aria-label="Main navigation">
    <a class="dock-item${active('home')}" href="${viewer}.html"><i>⌂</i><span>home</span></a>
    <a class="dock-item${active('tasks')}" href="tasks.html"><i>✓</i><span>list</span></a>
    <a class="dock-item${active('games')}" href="games.html"><i>⚄</i><span>games</span></a>
    <a class="dock-item${active('today')}" href="today.html"><i>◎</i><span>today</span></a>
    <button class="dock-item" type="button" data-open-sheet="more"><i>•••</i><span>more</span></button>
  </nav>`);
  document.body.classList.add('has-app-dock');
  document.querySelector('.app-dock .is-active')?.setAttribute('aria-current','page');
}

function addContextAction(host) {
  if (!host || !['home','tasks','dates','memories'].includes(page)) return;
  const button=document.createElement('button');
  button.type='button';button.className='context-add';button.dataset.openSheet='quick';
  button.innerHTML='<i aria-hidden="true">＋</i><span>add</span>';
  button.setAttribute('aria-label',page==='home'?'Quick add':'Add here');
  host.classList.add('has-context-action');host.append(button);
  const source=document.querySelector('.page-add');
  if(source){
    const sync=()=>{button.hidden=source.hidden;button.querySelector('span').textContent=source.textContent.replace('＋','').trim();};
    sync();new MutationObserver(sync).observe(source,{attributes:true,childList:true,characterData:true,subtree:true});
  }
}

function addSheets() {
  document.body.insertAdjacentHTML('beforeend', `<div class="sheet-scrim" data-close-sheet hidden></div>
    <section class="app-sheet" id="sheet-quick" role="dialog" aria-modal="true" aria-labelledby="quick-title" hidden>
      <header class="sheet-head"><div><h2 id="quick-title">Quick add</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>
      <button class="thinking-ping" id="quick-thinking" type="button"><span>♡</span> send “thinking of you”</button>
      <div class="quick-kind" role="tablist">
        <button class="active" type="button" data-quick-kind="task">to-do</button><button type="button" data-quick-kind="grocery">grocery</button><button type="button" data-quick-kind="note">note</button><button type="button" data-quick-kind="ask">ask</button><button type="button" data-quick-kind="date">date idea</button>
      </div>
      <form class="quick-add-form" id="quick-add-form">
        <label><span id="quick-label">what needs doing?</span><input id="quick-text" maxlength="180" required autocomplete="off" placeholder="the thing"></label>
        <label id="quick-grocery-options" hidden><span>aisle-ish</span><select id="quick-grocery-aisle"><option value="produce">produce</option><option value="fridge">fridge</option><option value="pantry">pantry</option><option value="frozen">frozen</option><option value="home">home stuff</option><option value="other" selected>other</option></select></label>
        <div class="quick-ask-options" id="quick-ask-options" hidden>
          <div class="choice-cloud" id="quick-urgency"><button class="choice" type="button" data-quick-urgency="whenever">whenever</button><button class="choice active" type="button" data-quick-urgency="soon">soon-ish</button><button class="choice" type="button" data-quick-urgency="now">kind of now</button><button class="choice" type="button" data-quick-urgency="timed">⏰ remind at a time…</button></div>
          <label><span>extra detail, if any</span><textarea id="quick-ask-note" maxlength="500" placeholder="only if it helps"></textarea></label>
          <div class="ask-when" id="quick-when-wrap" hidden>${momentPickerHtml('quick')}</div>
        </div>
        <button class="primary-action" id="quick-submit" type="submit">add it</button>
      </form>
    </section>
    <section class="app-sheet search-sheet" id="sheet-search" role="dialog" aria-modal="true" aria-labelledby="search-title" hidden>
      <header class="sheet-head"><div><h2 id="search-title">Search</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>
      <label class="search-box"><span>⌕</span><input id="global-search" type="search" autocomplete="off" placeholder="milk, reminder, that one note…"></label>
      <div class="search-results" id="search-results"><div class="search-start"><span>✦</span><p>type literally anything</p></div></div>
    </section>
    <section class="app-sheet more-sheet" id="sheet-more" role="dialog" aria-modal="true" aria-labelledby="more-title" hidden>
      <header class="sheet-head"><div><h2 id="more-title">More</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>
      <nav class="more-grid">
        <a href="notes.html"><i>✉</i><span>notes</span></a><a href="status.html"><i>☀︎☾</i><span>profiles</span></a>
        <a href="dates.html"><i>✦</i><span>date ideas</span></a><a href="memories.html"><i>◒</i><span>memories</span></a>
        <a href="phone-check.html"><i>⚙︎</i><span>settings</span></a><a href="guide.html#tutorial"><i>✎</i><span>guide</span></a>
      </nav>
      <button class="update-row" id="check-update" type="button"><span><b id="app-version">app version</b><small id="update-copy">tap to check for a fresh one</small></span><i>↻</i></button>
    </section>`);
}

function openSheet(name) {
  closeSheets(false);
  const sheet = document.getElementById(`sheet-${name}`) || document.querySelector(`[data-sheet-name="${name}"]`);
  if (!sheet) return;
  sheet.hidden = false;
  document.querySelector('.sheet-scrim').hidden = false;
  document.body.classList.add('sheet-open');
  window.littleHaptic?.('tap');
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  document.dispatchEvent(new CustomEvent('littlelist:sheet-open', { detail: { name } }));
  const firstField = { search:'global-search', quick:'quick-text', 'task-form':'shared-task-title', 'ask-form':'help-title', 'date-form':'date-title', 'memory-form':'memory-text' }[name];
  if (firstField) window.setTimeout(() => document.getElementById(firstField)?.focus(), 220);
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
  let urgency = 'soon';
  const moment = setupMomentPicker(document.getElementById('quick-when-wrap'), friendlyWhen);
  const labels = {
    task: ['what needs doing?', 'the thing', 'add it'],
    grocery: ['what should we grab?', 'oat milk, tiny treats…', 'add it'],
    note: [`note for ${personName(other)}`, 'say it here', 'send it'],
    ask: [`ask ${personName(other)} for…`, 'the thing', 'ask'],
    date: ['the date idea', 'what are we doing?', 'save it']
  };
  const pick = next => {
    kind = labels[next] ? next : next === 'reminder' ? 'ask' : 'task';
    document.querySelectorAll('[data-quick-kind]').forEach(button => button.classList.toggle('active', button.dataset.quickKind === kind));
    const words = labels[kind];
    document.getElementById('quick-label').textContent = words[0];
    document.getElementById('quick-text').placeholder = words[1];
    document.getElementById('quick-submit').textContent = words[2];
    document.getElementById('quick-ask-options').hidden = kind !== 'ask';
    document.getElementById('quick-grocery-options').hidden = kind !== 'grocery';
    document.getElementById('quick-when-wrap').hidden = kind !== 'ask' || urgency !== 'timed';
    document.getElementById('quick-text').focus();
  };
  // One tap, no typing: the Locket-style "I thought of you" that a couple app
  // gets most of its daily use from.
  document.getElementById('quick-thinking').addEventListener('click', async event => {
    const button = event.currentTarget;
    setButtonBusy(button, true, 'sending…');
    try {
      await settleQuickly(sendNote(data, { viewer, other, body: 'thinking of you ♡', mood: 'heart' }), 'the “thinking of you” did not send.');
      closeSheets();
      toast(`sent to ${personName(other)} ♡`);
      window.littleHaptic?.('success');
    } catch (_) {
      showFailure('that did not send.', 'check the internet and try again.');
    } finally { setButtonBusy(button, false); }
  });
  document.querySelector('.quick-kind').addEventListener('click', event => {
    const button = event.target.closest('[data-quick-kind]');
    if (button) pick(button.dataset.quickKind);
  });
  document.getElementById('quick-urgency').addEventListener('click', event => {
    const button = event.target.closest('[data-quick-urgency]');
    if (!button) return;
    urgency = button.dataset.quickUrgency;
    document.querySelectorAll('[data-quick-urgency]').forEach(item => item.classList.toggle('active', item === button));
    document.getElementById('quick-when-wrap').hidden = urgency !== 'timed';
    moment.setActive(urgency === 'timed');
  });
  document.getElementById('quick-add-form').addEventListener('submit', async event => {
    event.preventDefault();
    // Held now: event.currentTarget is null by the time a real network write
    // comes back, and calling reset() on it threw — after the thing had been
    // added — so every quick add ended in "that did not get added", with the
    // sheet still open and an easy second tap to add it twice.
    const form = event.currentTarget;
    const text = document.getElementById('quick-text').value.trim();
    if (!text) return;
    const dueAt = kind === 'ask' && urgency === 'timed' ? moment.chosen()?.getTime() || 0 : 0;
    if (kind === 'ask' && urgency === 'timed' && (!dueAt || dueAt <= Date.now())) {
      showFailure('that time does not work.', 'pick a future day and time.');
      return;
    }
    const button = document.getElementById('quick-submit');
    setButtonBusy(button, true, '…');
    try {
      // The same builders the pages use, so a quick add is the same record the
      // full form would have made with its defaults.
      const lost = `“${text.slice(0, 40)}” did not save.`;
      if (kind === 'task') await settleQuickly(addTask(data, { viewer, other, title: text }), lost);
      else if (kind === 'grocery') await settleQuickly(addTask(data, { viewer, other, title: text, type: 'grocery', aisle: document.getElementById('quick-grocery-aisle').value }), lost);
      else if (kind === 'note') await settleQuickly(sendNote(data, { viewer, other, body: text }), lost);
      else if (kind === 'date') await settleQuickly(addDateIdea(data, { viewer, other, title: text }), lost);
      else { const urgent=await chooseAskUrgency(data,viewer,other);await settleQuickly(sendAsk(data, { viewer, other, title: text, note: document.getElementById('quick-ask-note').value.trim(), urgency, dueAt, urgent }), lost); }
      form.reset();
      urgency = 'soon';
      document.querySelectorAll('[data-quick-urgency]').forEach(item => item.classList.toggle('active', item.dataset.quickUrgency === 'soon'));
      moment.setActive(false);
      moment.reset();
      document.getElementById('quick-when-wrap').hidden = true;
      closeSheets();
      toast(kind === 'note' ? 'sent 💌' : kind === 'ask' ? (dueAt ? 'reminder secured' : 'asked 🫡') : 'added');
      window.littleHaptic?.('success');
    } catch (_) {
      showFailure('that did not get added.', 'check the internet and try again. Your text is still here.');
    } finally { setButtonBusy(button, false); }
  });
  return (next = kind, text = '') => {
    openSheet('quick');
    pick(next);
    if (text) document.getElementById('quick-text').value = text;
  };
}

function setupSearch(data, viewer, openQuick) {
  const input = document.getElementById('global-search');
  const results = document.getElementById('search-results');
  const cache = new Map();
  let started = false;
  const render = () => {
    const query = normalize(input.value);
    if (!query) { results.innerHTML = '<div class="search-start"><span>✦</span><p>type literally anything</p></div>'; return; }
    if (!cache.size) { results.innerHTML = '<div class="search-skeleton"><i></i><i></i><i></i></div>'; return; }
    const matches = [...cache].flatMap(([collection, items]) => items.map(item => searchable(collection, item, viewer)))
      .filter(item => item.haystack.includes(query)).slice(0, 30);
    results.innerHTML = matches.length ? matches.map(item => `<a class="search-hit" href="${item.url}"><span>${item.icon}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta)}</small></div><i>›</i></a>`).join('') : `<div class="search-start"><span>🕵️</span><p>nothing. suspicious.</p><button type="button" data-open-quick-from-search>add it instead</button></div>`;
  };
  const start = () => {
    // Opened before sign-in finished: try again next time instead of marking
    // search as started with no listeners behind it.
    if (started || (data.mode !== 'local' && !data.signedIn())) return;
    started = true;
    const recent = { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 100 };
    for (const collection of SEARCH_COLLECTIONS) {
      const receive = items => { cache.set(collection, items); render(); };
      if (collection === 'items') {
        // Every open task, however old, plus the newest finished ones.
        const parts = { open: [], recent: [] };
        const merge = () => receive([...new Map([...parts.recent, ...parts.open].map(item => [item.id, item])).values()]);
        data.listenToQuery('items', { where: { field: 'done', value: false } }, items => { parts.open = items; merge(); });
        data.listenToQuery('items', recent, items => { parts.recent = items; merge(); });
      } else if (collection === 'dates' || collection === 'help') {
        // Small, and the imported date ideas carry old timestamps: keep them all.
        data.listenTo(collection, receive);
      } else {
        // Notes and memories grow forever; search watches the newest slice.
        data.listenToQuery(collection, recent, receive);
      }
    }
  };
  document.addEventListener('littlelist:sheet-open', event => {
    if (event.detail?.name !== 'search') return;
    start();
    render();
  });
  input.addEventListener('input', render);
  results.addEventListener('click', event => {
    if (!event.target.closest('[data-open-quick-from-search]')) return;
    const typed = input.value.trim();
    closeSheets(false); openQuick(undefined, typed);
  });
}

function searchable(collection, item, viewer) {
  const map = {
    items: { icon: item.type === 'grocery' ? '🛒' : '✓', title: item.title, meta: item.done ? 'finished list thing' : 'on the list', url: `tasks.html#${item.done ? 'done' : 'item'}-${item.id}` },
    notes: { icon: '💌', title: item.body || item.message, meta: item.sender === viewer ? 'note you sent' : `note from ${personName(item.sender || item.from)}`, url: `notes.html#note-${item.id}` },
    help: { icon: item.emoji || (item.dueAt ? '⏰' : '🙋'), title: item.title, meta: item.dueAt ? 'ask with a time' : item.from === viewer ? 'you asked' : `${personName(item.from)} asked`, url: `tasks.html#ask-${item.id}` },
    dates: { icon: '✦', title: item.title, meta: item.done ? 'date we did' : 'date idea', url: `dates.html#date-${item.id}` },
    memories: { icon: '◒', title: item.text, meta: 'memory', url: `memories.html#memory-${item.id}` }
  };
  const value = map[collection];
  return { ...value, title: String(value.title || 'untitled'), haystack: normalize(`${value.title} ${value.meta} ${item.note || ''}`) };
}

let cancelDeepLink=()=>{};
function setupDeepLinkHighlight() {
  cancelDeepLink();
  let fragment;
  try { fragment=decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
  const match = /^(item|done|ask|note|date|memory)-([A-Za-z0-9_-]+)$/.exec(fragment);
  if (!match) {
    const id=/^game(?:-[A-Za-z0-9_-]+)?$/.test(fragment)?'game':fragment;
    if(['game','question','new','fridge-note'].includes(id))requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'center'}));
    return;
  }
  const [, kind, id] = match;
  const selectors = {
    item: '.task-row', done: '.task-row', ask: '.help-card',
    note: '.note-thread-row', date: '.date-idea-card', memory: '.memory-card'
  };
  const find = () => [...document.querySelectorAll(selectors[kind])].find(node =>
    node.dataset.id === id || node.dataset.noteId === id ||
    (kind === 'note' && [...node.querySelectorAll('[data-note-picker],[data-edit-note],[data-delete-note]')]
      .some(button => (button.dataset.notePicker || button.dataset.editNote || button.dataset.deleteNote) === id)));
  let highlighted = null;
  let clearTimer;
  const observer = new MutationObserver(() => { show(); });
  const show = () => {
    const node = find();
    if (!node) return false;
    if (node === highlighted && node.classList.contains('is-deep-linked')) return true;
    highlighted = node;
    node.classList.add('is-deep-linked');
    node.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth', block:'center' });
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => { node.classList.remove('is-deep-linked'); observer.disconnect(); }, 4000);
    return true;
  };
  observer.observe(document.body, { childList:true, subtree:true });
  show();
  const deadline=window.setTimeout(() => {
    observer.disconnect();
    if(!highlighted&&navigator.onLine)toast('That item is no longer here, or hasn’t synced yet.');
  },15000);
  cancelDeepLink=()=>{observer.disconnect();clearTimeout(clearTimer);clearTimeout(deadline);highlighted?.classList.remove('is-deep-linked');};
}

function setupRowMenus() {
  const rowSelector = '.task-row,.note-thread-row,.activity-row';
  const menus = {
    task: [ ['finish', '[data-action="toggle"]'], ['edit', '[data-action="edit"]'], ['delete', '[data-action="delete"]'] ],
    note: [ ['pin / unpin', '[data-pin-note]'], ['edit', '[data-edit-note]'], ['delete', '[data-delete-note]'] ],
    activity: [ ['delete for me', '[data-action="hide"]'], ['delete for us', '[data-action="delete"]'] ]
  };
  const kindOf = row => row.matches('.task-row') ? 'task' : row.matches('.note-thread-row') ? 'note' : 'activity';
  const close = () => document.querySelectorAll(`${rowSelector.split(',').join('.menu-open,')}.menu-open`).forEach(row => {
    row.classList.remove('menu-open'); row.querySelector('.row-context-menu')?.remove();
  });
  const show = row => {
    close();
    const actions = menus[kindOf(row)].filter(([,selector]) => row.querySelector(selector));
    if (!actions.length) return;
    row.classList.add('menu-open');
    // The pin button already says "pin" or "unpin"; the menu uses its words.
    const labelOf = ([label, selector]) => label === 'pin / unpin' ? (row.querySelector(selector)?.textContent.replace(/[^a-z ]/gi, '').trim() || 'pin') : label;
    row.insertAdjacentHTML('beforeend', `<div class="row-context-menu" role="menu">${actions.map((action,index) => `<button type="button" role="menuitem" data-menu-index="${index}">${escapeHtml(labelOf(action))}</button>`).join('')}</div>`);
    row._menuActions = actions;
    window.littleHaptic?.('tap');
  };
  const ensure = () => document.querySelectorAll(rowSelector).forEach(row => {
    if (row.querySelector(':scope > .row-more')) return;
    row.insertAdjacentHTML('beforeend', '<button class="row-more" type="button" aria-label="More options" data-toggle-row-menu>⋯</button>');
  });
  ensure();
  const observer = new MutationObserver(ensure);
  observer.observe(document.body, { childList:true, subtree:true });
  let hold = 0, point = null, suppressUntil = 0;
  document.addEventListener('pointerdown', event => {
    const row = event.target.closest(rowSelector);
    if (!row || event.target.closest('input,textarea,select,form')) return;
    point = { x:event.clientX, y:event.clientY };
    hold = window.setTimeout(() => { show(row); suppressUntil=Date.now()+450; hold=0; }, 550);
  });
  document.addEventListener('pointermove', event => {
    if (point && Math.hypot(event.clientX-point.x,event.clientY-point.y)>12) { window.clearTimeout(hold); hold=0; point=null; }
  });
  for (const type of ['pointerup','pointercancel']) document.addEventListener(type, () => { window.clearTimeout(hold); hold=0; point=null; });
  document.addEventListener('contextmenu', event => {
    const row=event.target.closest(rowSelector);
    if (row) { event.preventDefault(); show(row); }
  });
  document.addEventListener('click', event => {
    if (Date.now()<suppressUntil && !event.target.closest('.row-context-menu,.row-more')) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const menuButton = event.target.closest('[data-menu-index]');
    if (menuButton) {
      const row=menuButton.closest(rowSelector);
      const action=row?._menuActions?.[Number(menuButton.dataset.menuIndex)];
      close();
      row?.querySelector(action?.[1])?.click();
      return;
    }
    const more = event.target.closest('[data-toggle-row-menu]');
    if (more) { const row=more.closest(rowSelector); row?.classList.contains('menu-open') ? close() : show(row); return; }
    if (!event.target.closest('.row-context-menu')) close();
  });
}

function setupFridgeNote(data, viewer, other) {
  const launchpad = document.querySelector('.home-next-up');
  if (!launchpad) return;
  launchpad.insertAdjacentHTML('beforebegin', `<section class="fridge-note" id="fridge-note"><button class="fridge-paper" id="fridge-open" type="button"><span id="fridge-emoji">📌</span><div><small id="fridge-kicker">on the fridge</small><strong id="fridge-copy">tap to pin something</strong></div><i>✎</i></button></section>`);
  // Home is built before this section exists, so the browser's own jump to
  // #fridge-note (from a "pinned on the fridge" ping) found nothing.
  if (location.hash === '#fridge-note') requestAnimationFrame(() => document.getElementById('fridge-note')?.scrollIntoView({ block: 'center' }));
  document.body.insertAdjacentHTML('beforeend', `<section class="app-sheet fridge-sheet" id="sheet-fridge" role="dialog" aria-modal="true" aria-labelledby="fridge-title" hidden><header class="sheet-head"><div><small>a note that stays up</small><h2 id="fridge-title">On the fridge</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header><form id="fridge-form"><label><span>tiny icon</span><button class="emoji-select" id="fridge-emoji-pick" type="button">📌 pick an emoji</button></label><label><span>the note</span><textarea id="fridge-text" maxlength="240" placeholder="important-ish household lore"></textarea></label><div class="fridge-actions"><button class="primary-action" type="submit">pin it</button><button class="soft-delete" id="fridge-clear" type="button">take it down</button></div></form></section>`);
  let notes = [];
  let fridgeEmoji = '📌';
  const paint = () => {
    const pinned = fridgeNote(notes);
    const text = pinned?.body || pinned?.message || '';
    const emoji = pinned?.pinEmoji || '📌';
    const author = pinned?.sender || pinned?.from;
    document.getElementById('fridge-copy').textContent = text || 'tap to pin something';
    document.getElementById('fridge-emoji').textContent = emoji;
    document.getElementById('fridge-kicker').textContent = text && author ? `on the fridge · from ${author === viewer ? 'you' : personName(author)}` : 'on the fridge';
    document.getElementById('fridge-note').classList.toggle('is-empty', !text);
  };
  data.listenToQuery('notes', { where: { field: 'pinned', value: true } }, items => { notes = items; paint(); });
  document.getElementById('fridge-open').addEventListener('click', () => {
    const pinned = fridgeNote(notes);
    document.getElementById('fridge-text').value = pinned?.body || '';
    fridgeEmoji = pinned?.pinEmoji || '📌';
    document.getElementById('fridge-emoji-pick').textContent = `${fridgeEmoji} pick an emoji`;
    openSheet('fridge');
  });
  document.getElementById('fridge-emoji-pick').addEventListener('click', () => openEmojiPicker({
    current: fridgeEmoji, label: 'icon',
    onSelect: value => { fridgeEmoji = value; document.getElementById('fridge-emoji-pick').textContent = `${value} pick an emoji`; },
    onRemove: () => { fridgeEmoji = '📌'; document.getElementById('fridge-emoji-pick').textContent = '📌 pick an emoji'; }
  }));
  document.getElementById('fridge-form').addEventListener('submit', async event => {
    event.preventDefault();
    const text = document.getElementById('fridge-text').value.trim();
    if (!text) { document.getElementById('fridge-text').focus(); return; }
    const emoji = fridgeEmoji;
    const current = fridgeNote(notes);
    if (current && text === (current.body || current.message || '') && emoji === (current.pinEmoji || '📌')) { closeSheets(); return; }
    const button = event.currentTarget.querySelector('[type="submit"]');
    setButtonBusy(button, true, 'pinning…');
    try {
      const oldPins = notes.filter(note => note.pinned).map(note => note.id);
      await sendNote(data, { viewer, other, body: text, pinned: true, pinEmoji: emoji });
      await Promise.all(oldPins.map(id => data.updateIn('notes', id, { pinned: false })));
      closeSheets(); toast('pinned to the fridge');
    } catch (_) { showFailure('that note fell off the fridge.', 'check the internet and try again.'); }
    finally { setButtonBusy(button, false); }
  });
  document.getElementById('fridge-clear').addEventListener('click', async () => {
    try {
      await clearFridge(data, notes);
      closeSheets(); toast('fridge cleared');
    } catch (_) { showFailure('that note is stubborn.', 'check the internet and try again.'); }
  });
}

function addSyncTray() {
  document.body.insertAdjacentHTML('beforeend', `<button class="sync-chip" id="sync-chip" type="button" hidden><i></i><span>saved</span></button><aside class="sync-tray" id="sync-tray" hidden><div><strong id="sync-title">all caught up</strong><p id="sync-copy">nothing waiting</p></div><button id="sync-retry" type="button">try now</button></aside>`);
  const chip = document.getElementById('sync-chip');
  const tray = document.getElementById('sync-tray');
  const retry = document.getElementById('sync-retry');
  const SLOW_MS = 6000;
  // Every write in flight, by id, with when it started. The chip is worked out
  // from this rather than from whichever event came last: a reconnect used to
  // paint "saving…" with nothing to save and leave it there for good, and the
  // retry button announced "saved" after a fixed 1.2 seconds whether or not
  // anything had actually gone across.
  const pending = new Map();
  let failed = 0;
  let hideTimer;
  let slowTimer;
  const current = () => {
    if (failed) return 'failed';
    if (navigator.onLine === false) return 'offline';
    if (!pending.size) return 'synced';
    return [...pending.values()].some(at => Date.now() - at >= SLOW_MS) ? 'pending' : 'saving';
  };
  const words = {
    saving: ['saving…', 'putting that in the shared cloud', ''],
    pending: ['waiting to sync', 'saved on this phone; it will catch up', 'try now'],
    offline: ['offline', 'saved stuff will go over when the internet returns', 'try now'],
    failed: ['sync hiccup', 'something did not save. make that change again from where you made it.', 'got it'],
    synced: ['saved', 'both phones can see the latest', '']
  };
  const paint = () => {
    window.clearTimeout(hideTimer);
    const state = current();
    // Nothing happened and nothing is wrong: stay out of the way.
    if (state === 'synced' && chip.hidden) { tray.hidden = true; return; }
    const [title, copy, action] = words[state];
    chip.hidden = false; chip.dataset.state = state; chip.querySelector('span').textContent = title;
    document.getElementById('sync-title').textContent = title; document.getElementById('sync-copy').textContent = copy;
    retry.hidden = !action; retry.textContent = action || 'try now';
    if (state === 'synced') hideTimer = window.setTimeout(() => { chip.hidden = true; tray.hidden = true; }, 1600);
  };
  chip.addEventListener('click', () => { tray.hidden = !tray.hidden; });
  retry.addEventListener('click', () => {
    if (failed) { failed = 0; tray.hidden = true; paint(); return; }
    if (navigator.onLine === false) { toast('still offline'); return; }
    // Firestore listens for this and retries its connection straight away
    // instead of waiting out its backoff. Whether that worked is for the
    // writes themselves to report.
    window.dispatchEvent(new Event('online'));
  });
  document.addEventListener('littlelist:sync', event => {
    const { phase, id } = event.detail || {};
    if (phase === 'start') {
      pending.set(id, Date.now());
      window.clearTimeout(slowTimer);
      slowTimer = window.setTimeout(paint, SLOW_MS + 50);
    } else if (phase === 'done') pending.delete(id);
    else if (phase === 'failed') { pending.delete(id); failed += 1; }
    paint();
  });
  window.addEventListener('online', paint);
  window.addEventListener('offline', paint);
  if (navigator.onLine === false) paint();
}

function setupUpdateCheck() {
  const button = document.getElementById('check-update');
  if (!button) return;
  void showVersion();
  button.addEventListener('click', async () => {
    const copy = document.getElementById('update-copy');
    button.classList.add('is-checking'); copy.textContent = 'checking…';
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      if (!registration) copy.textContent = 'could not check right now';
      else {
        await registration.update();
        // The worker skips waiting as soon as it installs, so a new version is
        // usually still installing at this point, not waiting. Looking only at
        // `waiting` reported "already fresh" in the middle of an update.
        const fresh = registration.installing || registration.waiting;
        if (fresh) {
          copy.textContent = 'fresh version found · opening it…';
          fresh.postMessage('skip-waiting');
        } else copy.textContent = 'already fresh';
      }
    } catch (_) { copy.textContent = 'could not check right now'; }
    // `button`, not event.currentTarget: that is null by the time this runs,
    // which threw here and left the row spinning.
    window.setTimeout(() => button.classList.remove('is-checking'), 500);
  });
}

// The shell's cache is named after the deployed version, so this is what the
// phone is really running. A version constant in its own file had to be bumped
// by hand on every deploy and would quietly start telling you the wrong thing.
async function showVersion() {
  try {
    const shells = (await caches.keys())
      .map(key => Number(/^our-little-list-v(\d+)$/.exec(key)?.[1]))
      .filter(Number.isFinite);
    if (shells.length) document.getElementById('app-version').textContent = `app version ${Math.max(...shells)}`;
  } catch (_) { /* no cache access: leave the plain label */ }
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
