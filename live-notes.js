// The little popups that appear while a page is open, plus the twinkle.
// Background delivery (phone closed) is handled by the push pipeline instead.

import { sharedLayer, whenReady } from './data-hub.js';
import { personName } from './profile-store.js';
import { startPresence } from './presence.js';

const params = new URLSearchParams(location.search);
const viewer = document.body.dataset.viewer || params.get('as') || params.get('from');

if (viewer === 'her' || viewer === 'him') boot(viewer);

async function boot(viewer) {
  const other = viewer === 'her' ? 'him' : 'her';
  const seen = { notes: null, items: null, reminders: null, dates: null, help: null };
  let knownStatusAt = null;

  const data = await sharedLayer();

  whenReady(data, () => {
    data.listenTo('notes', notes => {
      const incoming = firstFresh('notes', notes, note => note.recipient === viewer && !note.read);
      if (!incoming) return;
      announce({
        icon: { heart: '💛', sun: '☀️', moon: '🌙', star: '✦' }[incoming.mood] || '💌',
        label: 'a note for you',
        body: incoming.body,
        url: `notes.html?from=${viewer}`
      });
      window.setTimeout(() => void data.updateIn('notes', incoming.id, { read: true, readAt: Date.now() }).catch(() => {}), 1200);
    });

    data.listenTo('items', items => {
      const fresh = firstFresh('items', items, item => item.addedBy === other);
      if (fresh) announce({ icon: '✓', label: 'new on our list', body: fresh.title, url: `tasks.html?as=${viewer}` });
    });

    data.listenTo('reminders', items => {
      const fresh = firstFresh('reminders', items, item => item.recipient === viewer);
      if (fresh) announce({ icon: '⏰', label: 'a reminder for you', body: fresh.title, url: `reminders.html?from=${viewer}` });
    });

    data.listenTo('dates', items => {
      const fresh = firstFresh('dates', items, item => item.addedBy === other && !item.imported);
      if (fresh) announce({ icon: '✦', label: 'new date idea', body: fresh.title, url: `dates.html?as=${viewer}` });
    });

    data.listenTo('help', items => {
      const fresh = firstFresh('help', items, item => item.to === viewer && item.state === 'open');
      if (fresh) announce({ icon: fresh.emoji || '🙋', label: `${personName(other)} needs a hand`, body: fresh.title, url: `help.html?as=${viewer}` });
    });

    data.listenTo('statuses', items => watchStatus(items));

    // Pages other than the two dashboards still need to say they were here.
    if (!document.body.dataset.viewer) startPresence(data, viewer, document.body.dataset.app || 'somewhere');
  });

  // Returns the newest matching record that appeared after the first snapshot.
  // The first snapshot only seeds the baseline, so opening a page never
  // announces things that were already there.
  function firstFresh(name, items, matches) {
    const ids = new Set(items.map(item => item.id));
    if (seen[name] === null) {
      seen[name] = ids;
      return null;
    }
    const fresh = items
      .filter(item => !seen[name].has(item.id) && matches(item))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    seen[name] = ids;
    return fresh || null;
  }

  function watchStatus(items) {
    const item = items.find(entry => entry.id === other || entry.person === other);
    const updatedAt = Number(item?.updatedAt) || 0;
    if (knownStatusAt === null) {
      knownStatusAt = updatedAt;
      return;
    }
    if (updatedAt > knownStatusAt) {
      announce({
        icon: item.emoji || '●',
        label: `${personName(other)} updated their status`,
        body: item.text ? `${item.category || 'currently'} ${item.text}` : (item.state || 'updated'),
        url: `status.html?as=${viewer}`
      });
    }
    knownStatusAt = Math.max(knownStatusAt, updatedAt);
  }
}

function announce(message) {
  window.playLittleTwinkle?.();

  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready
      .then(registration => registration.showNotification(message.label, {
        body: message.body,
        icon: './sun-moon-personalized.png',
        badge: './sun-moon-personalized.png',
        tag: `live-${message.url}`,
        data: { url: message.url }
      }))
      .catch(() => {});
  }

  document.querySelector('.incoming-note')?.remove();
  const popup = document.createElement('aside');
  popup.className = 'incoming-note';
  popup.setAttribute('role', 'status');
  popup.innerHTML = '<button aria-label="Close">×</button><span></span><div><small></small><p></p></div>';
  popup.querySelector('span').textContent = message.icon;
  popup.querySelector('small').textContent = message.label;
  popup.querySelector('p').textContent = message.body || '';
  popup.querySelector('button').addEventListener('click', event => {
    event.stopPropagation();
    popup.remove();
  });
  popup.addEventListener('click', () => { location.href = message.url; });
  document.body.append(popup);
  window.setTimeout(() => popup.remove(), 10000);
}
