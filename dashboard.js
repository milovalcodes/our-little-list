import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI } from './ui-helpers.js';
import { startPresence } from './presence.js';
import { ensurePushSubscription, forgetPushSubscription } from './push-client.js';
import { locationSnapshot } from './auto-location.js';

const badge = document.getElementById('activity-badge');
const helpBadge = document.getElementById('help-badge');
const buckets = { items: [], notes: [], reminders: [], dates: [], statuses: [], help: [] };

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
  data.listenTo(name, items => { buckets[name] = items; renderBadge(); })
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
  await forgetPushSubscription(data, viewer);
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
      ...buckets.help.filter(request => request.to === viewer && fresh(request.createdAt))
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
