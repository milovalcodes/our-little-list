import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI } from './ui-helpers.js';
import { startPresence } from './presence.js';
import { ensurePushSubscription } from './push-client.js';
import { personName } from './profile-store.js';
import { hereLine, statusShows, orbitLine } from './availability.js';
import { newActivityCount } from './activity-summary.js';
import { questionClock } from './question-prompts.js';
import { escapeHtml, showFailure, toast } from './ui-helpers.js';
import { inlineActionMarkup, handleInlineAction } from './inline-actions.js';
import { dueRows, fairShare } from './needs-you.js';
import { quickStatusButtons, saveQuickStatus } from './status-presets.js';

const badge = document.getElementById('activity-badge');
const buckets = { items: [], notes: [], dates: [], statuses: [], help: [], memories: [], reactions: [], locations: [], presence: [], questions: [] };
let dashboardFrame = 0;

const data = await sharedLayer();
onAuthChange(user => setupAuthUI(data, user));
if (data.mode === 'local') setupAuthUI(data, { local: true });

const viewer = await awaitViewer();
if (!viewer) { showNotAMember(); await new Promise(() => {}); }

// her.html and him.html are still separate pages, so send you to your own
// rather than rendering someone else's dashboard around your data.
if (document.body.dataset.viewer !== viewer) {
  location.replace(`${viewer}.html`);
  await new Promise(() => {});
}

const other = partnerOf(viewer);
const seenKey = `our-little-list-seen-${viewer}`;

const recent = { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 50 };
const doneSince = Date.now() - 7 * 86400000;
let openItems = [], recentDone = [];
const updateItems = () => { buckets.items = [...openItems, ...recentDone]; scheduleDashboardRender(); };
data.listenToQuery('items', { where: { field: 'done', value: false } }, items => { openItems = items; updateItems(); });
data.listenToQuery('items', { where: { field: 'doneAt', op: '>=', value: doneSince }, orderBy: { field: 'doneAt', direction: 'desc' }, limit: 50 }, items => { recentDone = items; updateItems(); });
for (const name of Object.keys(buckets).filter(name => name !== 'items')) {
  const receive = items => { buckets[name] = items; scheduleDashboardRender(); };
  if (name === 'questions') { data.listenToQuery('questions', { where:{field:'day', value:questionClock().day} }, receive); continue; }
  if (['notes', 'memories', 'reactions'].includes(name)) data.listenToQuery(name, recent, receive);
  else data.listenTo(name, receive);
}
startPresence(data, viewer, 'home');
// Keeps this phone's push subscription current. Does nothing until
// notifications have actually been allowed.
void ensurePushSubscription(data, viewer);

window.addEventListener('littlelist:profile', renderSky);
const homeDay = questionClock().day;
window.setInterval(() => { if (questionClock().day !== homeDay) location.reload(); else renderSky(); }, 30000);
setupQuickStatus();
document.getElementById('home-next-up')?.addEventListener('click', event => { void handleInlineAction(event,{data,viewer,other,items:buckets.items,help:buckets.help}); });

function renderBadge() {
  const since = Number(localStorage.getItem(seenKey) || 0);
  const fresh = value => Number(value) > since;

  const newCount = newActivityCount(buckets, viewer, other, since);
  if (badge) {
    badge.hidden = newCount === 0;
    badge.textContent = newCount > 9 ? '9+' : String(newCount);
    badge.setAttribute('aria-label', `${newCount} new`);
  }

  setIconBadge(newCount + buckets.help.filter(request => request.to === viewer && request.from !== viewer && request.state === 'open' && !fresh(request.createdAt)).length);
}

// The number on the app icon (iPhone home-screen apps since iOS 16.4). The
// service worker bumps it when a ping lands; opening home sets the real count.
function setIconBadge(count) {
  try {
    if (count > 0) void navigator.setAppBadge?.(count)?.catch?.(() => {});
    else void navigator.clearAppBadge?.()?.catch?.(() => {});
  } catch (_) { /* not supported */ }
}

function renderDashboard() {
  renderBadge();
  renderSky();
  renderNextUp();
}

// Home shows the top of the same list Today shows in full, plus the things only
// Home points to (unread notes, today's question, what's new), so the two never
// disagree about what needs you.
function renderNextUp() {
  const target = document.getElementById('home-next-up');
  if (!target) return;
  const due = dueRows(buckets, viewer);
  const unread = buckets.notes.filter(note => (note.recipient === viewer || note.to === viewer) && !note.read).length;
  const clock = questionClock();
  const question = buckets.questions.find(item => item.day === clock.day);
  const answerNeeded = clock.open && question && !question.answers?.[viewer]?.at;
  const fresh = newActivityCount(buckets, viewer, other, Number(localStorage.getItem(seenKey) || 0));
  const rows = [
    ...fairShare(due, 3),
    due.length > 3 && { icon:'◎', title:`${due.length - 3} more due or waiting`, href:'today.html' },
    unread && { icon:'✉', title:`${unread} unread note${unread===1?'':'s'}`, href:'notes.html' },
    answerNeeded && { icon:'◎', title:'today’s question', href:'today.html#question' },
    fresh && { icon:'✦', title:`${fresh} new thing${fresh===1?'':'s'} since you looked`, href:'today.html#new' }
  ].filter(Boolean);
  target.innerHTML = rows.length ? rows.map(row=>inlineActionMarkup(row,'home-next-row')).join('') : '<p>nothing needs you right now ✦</p>';
}

function setupQuickStatus() {
  const avatar = document.getElementById(`sky-person-${viewer}`);
  if (!avatar) return;
  avatar.dataset.openSheet = 'quick-status';
  avatar.setAttribute('aria-label', 'Quick status');
  document.body.insertAdjacentHTML('beforeend', `<section class="app-sheet quick-status-sheet" id="sheet-quick-status" role="dialog" aria-modal="true" aria-labelledby="quick-status-title" hidden>
    <header class="sheet-head"><div><small>your side</small><h2 id="quick-status-title">Quick status</h2></div><button type="button" data-close-sheet aria-label="Close">×</button></header>
    <div class="quick-status-options">${quickStatusButtons()}</div>
    <form id="quick-status-form"><label><span>or your own words</span><input id="quick-status-text" maxlength="90" placeholder="currently doing the thing"></label><button class="primary-action" type="submit">set status</button></form>
    <a class="quick-status-more" href="status.html">more on Right now →</a>
  </section>`);
  const save = async (choice, custom = '') => {
    try {
      const exists = Boolean(await data.readDoc('statuses', viewer));
      await saveQuickStatus({ data, viewer, other, exists }, choice, custom);
      document.querySelector('#sheet-quick-status [data-close-sheet]')?.click();
      toast('status set');
    } catch (_) { showFailure('status did not save.', 'check the internet and try again.'); }
  };
  document.getElementById('sheet-quick-status').addEventListener('click', event => {
    const button = event.target.closest('[data-quick-status]');
    if (button) void save(button.dataset.quickStatus);
  });
  document.getElementById('quick-status-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = document.getElementById('quick-status-text').value.trim();
    if (text) void save('custom', text);
  });
}

function scheduleDashboardRender() {
  if (dashboardFrame) return;
  dashboardFrame = window.requestAnimationFrame(() => {
    dashboardFrame = 0;
    renderDashboard();
  });
}

function renderSky() {
  const stage = document.getElementById('sky-stage');
  if (!stage) return;
  const now = Date.now();
  const hour = new Date(now).getHours();
  stage.dataset.phase = hour < 5 || hour >= 21 ? 'night' : hour < 8 ? 'dawn' : hour < 17 ? 'day' : 'sunset';
  document.getElementById('sky-time').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(now);

  ['her', 'him'].forEach(person => {
    document.getElementById(`sky-name-${person}`).textContent = personName(person);
    renderSkyPresence(person, now);
    renderSkyStatus(person, now);
    renderSkyReaction(person, now);
  });
  renderSkyOrbit(stage, now);
  renderSkyNote(now);
  renderSkyWins(now);
}

function renderSkyPresence(person, now) {
  const presence = buckets.presence.find(item => item.id === person || item.person === person);
  const status = buckets.statuses.find(item => item.id === person || item.person === person);
  const line = hereLine({ presence, status, now });
  document.getElementById(`sky-presence-${person}`).classList.toggle('online', line.here);
  document.getElementById(`sky-seen-${person}`).textContent = line.text;
}

function renderSkyStatus(person, now) {
  const status = buckets.statuses.find(item => item.id === person || item.person === person);
  const bubble = document.getElementById(`sky-status-${person}`);
  // Focus first, then their own words, then where they are — one rule, shared
  // with the status page (availability.js).
  const shows = statusShows(status, now);
  bubble.hidden = !shows.text;
  bubble.textContent = shows.text ? `${shows.emoji} ${shows.text}` : '';
  bubble.title = shows.text ? `${shows.category} ${shows.text}` : '';
  const personNode = document.getElementById(`sky-person-${person}`);
  personNode.dataset.place = status?.locationPreset || '';
}

function renderSkyReaction(person, now) {
  const reaction = buckets.reactions
    .filter(item => item.to === person && item.emoji && now - Number(item.createdAt || 0) < 86400000)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
  const node = document.getElementById(`sky-reaction-${person}`);
  node.hidden = !reaction;
  node.textContent = reaction?.emoji || '';
  node.title = reaction ? `from ${personName(reaction.by)}` : '';
}

function renderSkyOrbit(stage, now) {
  const known = buckets.locations.filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  const her = known.find(point => point.id === 'her' || point.person === 'her');
  const him = known.find(point => point.id === 'him' || point.person === 'him');
  const title = document.getElementById('sky-orbit-title');
  const detail = document.getElementById('sky-orbit-detail');
  if (!her || !him) {
    stage.dataset.orbit = 'waiting';
    const live = known.find(point => Number(point.shareUntil) > now);
    document.querySelector('.sky-footer').hidden = !live;
    title.textContent = live ? `${personName(live.id || live.person)} is on the map` : 'orbit pending';
    const partner=known.find(point=>(point.id||point.person)===other);
    detail.textContent = partner&&Number(partner.shareUntil)<=now?`last known · updates when ${personName(other)} opens the app`:known.length ? 'waiting for the other spot' : 'waiting for both spots';
    return;
  }
  const line = orbitLine(her, him, now);
  document.querySelector('.sky-footer').hidden = ![her,him].some(point=>Number(point.shareUntil)>now);
  stage.dataset.orbit = line.orbit;
  title.textContent = line.title;
  const partner=[her,him].find(point=>(point.id||point.person)===other);
  detail.textContent = partner&&Number(partner.shareUntil)<=now?`${line.detail} · updates when ${personName(other)} opens the app`:line.detail;
}

function renderSkyNote(now) {
  const latest = buckets.notes
    .filter(note => (note.recipient === viewer || note.to === viewer) && (note.sender === other || note.from === other) && now - Number(note.createdAt || 0) < 86400000)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
  const star = document.getElementById('sky-note-star');
  star.hidden = !latest;
  document.getElementById('sky-note-copy').textContent = latest ? shortText(latest.body || latest.message || 'a note appeared') : '';
}

function renderSkyWins(now) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const count = buckets.items.filter(item => {
    const finishedAt = Number(item.doneAt || item.lastDoneAt || 0);
    return finishedAt >= start.getTime() && finishedAt <= now;
  }).length;
  const wins = document.getElementById('sky-wins');
  wins.hidden = count === 0;
  wins.textContent = count ? `✦ ${count} tiny win${count === 1 ? '' : 's'} today` : '';
}

function shortText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > 42 ? `${text.slice(0, 39)}…` : text;
}

