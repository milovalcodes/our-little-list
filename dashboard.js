import { sharedLayer, onAuthChange, whenReady } from './data-hub.js';
import { setupAuthUI } from './ui-helpers.js';
import { startPresence } from './presence.js';
import { ensurePushSubscription } from './push-client.js';

const viewer = document.body.dataset.viewer;
const other = viewer === 'her' ? 'him' : 'her';
const badge = document.getElementById('activity-badge');
const helpBadge = document.getElementById('help-badge');
const seenKey = `our-little-list-seen-${viewer}`;
const buckets = { items: [], notes: [], reminders: [], dates: [], statuses: [], help: [] };

const data = await sharedLayer();
onAuthChange(user => setupAuthUI(data, user));
if (data.mode === 'local') setupAuthUI(data, { local: true });

whenReady(data, () => {
  Object.keys(buckets).forEach(name =>
    data.listenTo(name, items => { buckets[name] = items; renderBadge(); })
  );
  startPresence(data, viewer, 'home');
  // Keeps this phone's push subscription current. Does nothing until
  // notifications have actually been allowed.
  void ensurePushSubscription(data, viewer);
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
