// The little popups that appear while a page is open, plus the twinkle.
// Background delivery (phone closed) is handled by the push pipeline instead.

import { sharedLayer } from './data-hub.js';
import { awaitViewer, partnerOf } from './viewer.js';
import { personName } from './profile-store.js';
import { startPresence } from './presence.js';

const signedInSide = await awaitViewer();
if (signedInSide) boot(signedInSide);

async function boot(viewer) {
  const other = partnerOf(viewer);
  const seen = { notes: null, items: null, reminders: null, dates: null, help: null };
  let knownStatusAt = null;

  const data = await sharedLayer();

  {
    data.listenTo('notes', notes => {
      const incoming = firstFresh('notes', notes, note => note.recipient === viewer && !note.read);
      if (!incoming) return;
      const shown = announce({
        icon: { heart: '💛', sun: '☀️', moon: '🌙', star: '✦' }[incoming.mood] || '💌',
        label: 'a note for you',
        body: incoming.body,
        url: `notes.html`
      });
      // Only a note you were actually shown counts as read. A backgrounded page
      // still receives snapshots, and marking those read burned the note: no
      // popup now, and nothing unread waiting when the page came back.
      if (shown) window.setTimeout(() => void data.updateIn('notes', incoming.id, { read: true, readAt: Date.now() }).catch(() => {}), 1200);
    });

    data.listenTo('items', items => {
      const fresh = firstFresh('items', items, item => item.addedBy === other);
      if (fresh) announce({ icon: '✓', label: 'new on our list', body: fresh.title, url: `tasks.html` });
    });

    data.listenTo('reminders', items => {
      const fresh = firstFresh('reminders', items, item => item.recipient === viewer);
      // activity.html, not reminders.html: this side is receiving a reminder,
      // and reminders.html is the form for sending one.
      if (fresh) announce({ icon: '⏰', label: 'a reminder for you', body: fresh.title, url: `activity.html` });
    });

    data.listenTo('dates', items => {
      const fresh = firstFresh('dates', items, item => item.addedBy === other && !item.imported);
      if (fresh) announce({ icon: '✦', label: 'new date idea', body: fresh.title, url: `dates.html` });
    });

    data.listenTo('help', items => {
      const fresh = firstFresh('help', items, item => item.to === viewer && item.state === 'open');
      if (fresh) announce({ icon: fresh.emoji || '🙋', label: `${personName(other)} needs a hand`, body: fresh.title, url: 'tasks.html#asks' });
    });

    data.listenTo('statuses', items => watchStatus(items));

    // Pages other than the two dashboards still need to say they were here.
    if (!document.body.dataset.viewer) startPresence(data, viewer, document.body.dataset.app || 'somewhere');
  }

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
        url: `status.html`
      });
    }
    knownStatusAt = Math.max(knownStatusAt, updatedAt);
  }
}

function announce(message) {
  // A hidden page may still receive Firestore snapshots for a few moments.
  // The push worker owns every operating-system notification; raising another
  // one here made the same event arrive twice on backgrounded phones.
  if (document.hidden) return false;

  window.playLittleTwinkle?.();

  document.querySelector('.incoming-note')?.remove();
  const popup = document.createElement('aside');
  popup.className = 'incoming-note';
  popup.innerHTML = '<a class="incoming-note-link"><span></span><div><small></small><p></p></div></a><button class="incoming-note-close" type="button" aria-label="Close">×</button>';
  const link = popup.querySelector('a');
  link.href = message.url;
  link.querySelector('span').textContent = message.icon;
  link.querySelector('small').textContent = message.label;
  link.querySelector('p').textContent = message.body || '';
  popup.querySelector('.incoming-note-close').addEventListener('click', () => {
    popup.remove();
  });
  document.body.append(popup);
  window.setTimeout(() => popup.remove(), 10000);
  return true;
}
