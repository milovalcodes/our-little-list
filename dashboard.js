import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI } from './ui-helpers.js';
import { startPresence } from './presence.js';
import { ensurePushSubscription, forgetPushSubscription } from './push-client.js';
import { locationSnapshot } from './auto-location.js';
import { personName } from './profile-store.js';
import { togetherPlace, friendlyDistance, placeDistance as distanceMeters } from './place-presets.js';
import { hereLine, statusShows } from './availability.js';

const badge = document.getElementById('activity-badge');
const helpBadge = document.getElementById('help-badge');
const buckets = { items: [], notes: [], reminders: [], dates: [], statuses: [], help: [], memories: [], reactions: [], locations: [], presence: [] };
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

Object.keys(buckets).forEach(name =>
  data.listenTo(name, items => { buckets[name] = items; scheduleDashboardRender(); })
);
startPresence(data, viewer, 'home');
// Keeps this phone's push subscription current. Does nothing until
// notifications have actually been allowed.
void ensurePushSubscription(data, viewer);

const homeLocationState = document.getElementById('home-location-state');
function showHomeLocation(next = locationSnapshot()) {
  if (!homeLocationState) return;
  const labels = {
    live: 'location live',
    starting: 'finding this phone…',
    retrying: 'location trying again',
    offline: 'waiting for internet',
    paused: 'location paused',
    blocked: 'location needs permission',
    unavailable: 'location unavailable',
    error: 'location took the day off',
    preview: 'location preview',
    loading: 'location starting…'
  };
  homeLocationState.textContent = labels[next?.phase] || 'location starting…';
}
showHomeLocation();
window.addEventListener('littlelist:location-state', event => showHomeLocation(event.detail));
window.addEventListener('littlelist:profile', renderSky);
window.setInterval(renderSky, 30000);

// Without this there is no way off an account. Her phone was still signed in
// as his from the shared-login days, so the site sent her to his dashboard and
// left her there with nothing to tap.
document.getElementById('sign-out')?.addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'signing out…';
  // Drop this phone's push registration first, while the rules still let us:
  // otherwise it keeps answering for whoever just left, and the next person to
  // sign in here inherits their reminders.
  // Bounded, though. A phone that believes it is online but is not — hotel
  // wifi, a dead spot, a sleeping router — leaves the write pending for as long
  // as it likes and never rejects, and this was awaited before anything else
  // happened: the button said "signing out…" and stayed there, with no way off
  // the account. The cleanup still runs and still finishes if it can; it just
  // no longer holds the door shut. A registration left behind is picked up by
  // the next sign-in, which claims the endpoint from whoever held it.
  await Promise.race([
    forgetPushSubscription(data, viewer),
    new Promise(resolve => window.setTimeout(resolve, 2500))
  ]);
  try {
    await data.signOut();
  } catch (_) { /* already gone */ }
  try { localStorage.removeItem(seenKey); } catch (_) {}
  location.replace('index.html');
});

function renderBadge() {
  const since = Number(localStorage.getItem(seenKey) || 0);
  const fresh = value => Number(value) > since;

  if (badge) {
    const incoming = [
      ...buckets.items.filter(item => item.addedBy === other && fresh(item.createdAt)),
      ...buckets.notes.filter(note => note.recipient === viewer && fresh(note.createdAt)),
      ...buckets.reminders.filter(reminder => reminder.recipient === viewer && fresh(reminder.createdAt)),
      ...buckets.dates.filter(idea => idea.addedBy === other && !idea.imported && fresh(idea.createdAt)),
      ...buckets.statuses.filter(status => (status.person === other || status.id === other) && fresh(status.updatedAt)),
      ...buckets.help.filter(request => request.to === viewer && fresh(request.createdAt)),
      ...buckets.memories.filter(item => item.addedBy === other && fresh(item.createdAt)),
      ...buckets.reactions.filter(item => item.by === other && fresh(item.createdAt))
    ];
    badge.hidden = incoming.length === 0;
    badge.textContent = incoming.length > 9 ? '9+' : String(incoming.length);
    badge.setAttribute('aria-label', `${incoming.length} new`);
  }

  if (helpBadge) {
    const waiting = buckets.help.filter(request => request.to === viewer && request.state === 'open').length;
    helpBadge.hidden = waiting === 0;
    helpBadge.textContent = String(waiting);
    helpBadge.setAttribute('aria-label', `${waiting} waiting`);
  }
}

function renderDashboard() {
  renderBadge();
  renderSky();
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
    title.textContent = live ? `${personName(live.id || live.person)} is on the map` : 'orbit pending';
    detail.textContent = known.length ? 'waiting for the other spot' : 'waiting for both spots';
    return;
  }
  const meters = distanceMeters(her, him);
  const bothLive = Number(her.shareUntil) > now && Number(him.shareUntil) > now;
  const sharedPlace = bothLive && meters <= 500 ? togetherPlace(her, him) : null;
  stage.dataset.orbit = meters <= 75 ? 'together' : meters <= 500 ? 'close' : meters <= 2000 ? 'near' : 'far';
  if (!bothLive) {
    title.textContent = 'last known orbit';
    detail.textContent = `${friendlyDistance(meters)} apart at the last update`;
  } else if (sharedPlace) {
    title.textContent = sharedPlace;
    detail.textContent = `${friendlyDistance(meters)} apart`;
  } else if (meters <= 75) {
    title.textContent = 'together at last :)';
    detail.textContent = `${friendlyDistance(meters)} apart`;
  } else if (meters <= 500) {
    title.textContent = 'almost together';
    detail.textContent = `${friendlyDistance(meters)} to go`;
  } else if (meters <= 2000) {
    title.textContent = 'getting closer';
    detail.textContent = `${friendlyDistance(meters)} between you`;
  } else {
    title.textContent = 'same sky';
    detail.textContent = `${friendlyDistance(meters)} apart for now`;
  }
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

