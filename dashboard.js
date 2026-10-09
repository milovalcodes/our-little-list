import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI } from './ui-helpers.js';
import { startPresence } from './presence.js';
import { ensurePushSubscription } from './push-client.js';
import { personName } from './profile-store.js';
import { hereLine, statusShows, orbitLine } from './availability.js';
import { inlineActionMarkup, handleInlineAction } from './inline-actions.js';
import { dueRows, fairShare } from './needs-you.js';
import {watchRoutineChecks} from './routine-checks.js';
import { profileUrl } from './profile-route.js';

const buckets = { items: [], statuses: [], help: [], reactions: [], locations: [], presence: [], wordDuels: [], wordDuelEnds: [], wordWeeks: [] };
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

const recent = { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 50 };
const doneSince = Date.now() - 7 * 86400000;
let openItems = [], recentDone = [];
const updateItems = () => { buckets.items = [...openItems, ...recentDone]; scheduleDashboardRender(); };
data.listenToQuery('items', { where: { field: 'done', value: false } }, items => { openItems = items; updateItems(); });
data.listenToQuery('items', { where: { field: 'doneAt', op: '>=', value: doneSince }, orderBy: { field: 'doneAt', direction: 'desc' }, limit: 50 }, items => { recentDone = items; updateItems(); });
watchRoutineChecks(data,checks=>{buckets.routineChecks=checks;scheduleDashboardRender();});
for (const name of Object.keys(buckets).filter(name => !['items','routineChecks'].includes(name))) {
  const receive = items => { buckets[name] = items; scheduleDashboardRender(); };
  if (name === 'reactions') data.listenToQuery(name, recent, receive);
  else data.listenTo(name, receive);
}
startPresence(data, viewer, 'home');
// Keeps this phone's push subscription current. Does nothing until
// notifications have actually been allowed.
void ensurePushSubscription(data, viewer);

window.addEventListener('littlelist:profile', renderSky);
window.setInterval(() => {renderSky();renderNextUp();}, 30000);
['her', 'him'].forEach(person => {
  const avatar = document.querySelector(`#sky-person-${person} .sky-person-label`);
  if (avatar) { avatar.href = profileUrl(person); avatar.setAttribute('aria-label', `${personName(person)}’s profile`); }
});
document.getElementById('home-next-up')?.addEventListener('click', event => { void handleInlineAction(event,{data,viewer,other,items:buckets.items,help:buckets.help}); });

function renderDashboard() {
  renderSky();
  renderNextUp();
}

// Home and Today are one place. Destination badges own notes and daily activities.
function renderNextUp() {
  const target = document.getElementById('home-next-up');
  if (!target) return;
  const due = dueRows(buckets, viewer);
  const tie=buckets.wordDuels.some(d=>!buckets.wordDuelEnds.some(e=>e.id===d.puzzleId)&&!buckets.wordWeeks.some(w=>w.week===d.week));
  const rows = [
    ...fairShare(due, 12),
    due.length > 12 && { icon:'✓', title:`${due.length - 12} more on the list`, href:'tasks.html' },
    tie && {icon:'♛',title:'the crown is still up for grabs',href:'activities.html#tiebreaker'},
  ].filter(Boolean);
  target.innerHTML = rows.length ? rows.map(row=>inlineActionMarkup(row,'home-next-row')).join('') : '<p>nothing needs you right now ✦</p>';
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

