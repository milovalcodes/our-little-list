// The little popups that appear while a page is open, plus the twinkle.
// Background delivery (phone closed) is handled by the push pipeline instead.

import { sharedLayer } from './data-hub.js';
import { awaitViewer, partnerOf } from './viewer.js';
import { personName } from './profile-store.js';
import { friendlyWhen } from './time-format.js';
import { startPresence } from './presence.js';
import { readNotificationPreferences, shouldShowNotification } from './notification-preferences.js';
import { focusDelivery } from './delivery-policy.js';
import { NOTE_MOODS } from './records.js';

let ownFocusUntil=0;

const signedInSide = await awaitViewer();
if (signedInSide) boot(signedInSide);

async function boot(viewer) {
  const other = partnerOf(viewer);
  const seen = { notes: null, items: null, dates: null, help: null };
  let knownStatusAt = null;

  const data = await sharedLayer();
  const recent = { orderBy: { field: 'createdAt', direction: 'desc' }, limit: 50 };

  {
    data.listenToQuery('notes', recent, notes => {
      const incoming = firstFresh('notes', notes, note => note.recipient === viewer && !note.read);
      if (!incoming) return;
      const shown = announce({
        icon: NOTE_MOODS[incoming.mood] || '💌',
        label: 'a note for you',
        body: incoming.body,
        url: `notes.html#note-${incoming.id}`,
        kind: 'note'
      });
      // Only a note you were actually shown counts as read. A backgrounded page
      // still receives snapshots, and marking those read burned the note: no
      // popup now, and nothing unread waiting when the page came back.
      if (shown) window.setTimeout(() => void data.updateIn('notes', incoming.id, { read: true, readAt: Date.now() }).catch(() => {}), 1200);
    });

    data.listenToQuery('items', recent, items => {
      const fresh = firstFresh('items', items, item => item.addedBy === other);
      if (fresh) announce({ icon: '✓', label: 'new on our list', body: fresh.title, url: `tasks.html#item-${fresh.id}`, kind: 'item' });
    });

    data.listenToQuery('dates', recent, items => {
      const fresh = firstFresh('dates', items, item => item.addedBy === other && !item.imported);
      if (fresh) announce({ icon: '✦', label: 'new date idea', body: fresh.title, url: `dates.html#date-${fresh.id}`, kind: 'date' });
    });

    data.listenToQuery('help', recent, items => {
      const fresh = firstFresh('help', items, item => item.to === viewer && item.from !== viewer && item.state === 'open');
      const timed = Number(fresh?.dueAt) > 0;
      if (fresh) announce({ icon: fresh.emoji || (timed ? '⏰' : '🙋'), label: timed ? `${personName(other)} set you a reminder` : `${personName(other)} needs a hand`, body: timed ? `${fresh.title} · ${friendlyWhen(Number(fresh.dueAt))}` : fresh.title, url: `tasks.html#ask-${fresh.id}`, kind: 'help', urgent:fresh.urgent===true });
    });

    data.listenTo('statuses', items => {
      ownFocusUntil=Number(items.find(entry=>entry.id===viewer||entry.person===viewer)?.focusUntil)||0;
      watchStatus(items);
    });

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
    if (updatedAt > knownStatusAt && item.updateKind === 'focus') {
      // Focus sessions are statuses with a timer now.
      announce({ icon: '⏱', label: `${personName(other)} is locking in`, body: `${item.focusLabel || 'doing the thing'}${Number(item.focusMinutes) ? ` · ${item.focusMinutes} min` : ''}`, url: `status.html#profile-${other}-focus`, kind: 'focus' });
    } else if (updatedAt > knownStatusAt && item.updateKind === 'focus-end') {
      // Quiet: finishing is not news worth a popup.
    } else if (updatedAt > knownStatusAt && item.updateKind === 'location') {
      // Saved spots move this on their own. Say where they are, the way the
      // activity feed does, and stay quiet about someone merely leaving one —
      // "updated their status · online" said nothing true about either.
      if (item.locationText) announce({
        icon: item.locationEmoji || '📍',
        label: `${personName(other)} changed locations`,
        body: item.locationText,
        url: `status.html#profile-${other}-map`,
        kind: 'status'
      });
    } else if (updatedAt > knownStatusAt && item.updateKind === 'arrival') {
      // The arrival button already sends a ringing OS push, even while this
      // page is open. Do not show a second in-page copy or fall through to the
      // generic “updated status” popup.
    } else if (updatedAt > knownStatusAt) {
      announce({
        icon: item.emoji || '●',
        label: `${personName(other)} updated their status`,
        body: item.text ? `${item.category || 'currently'} ${item.text}` : (item.state || 'updated'),
        url: `status.html#profile-${other}`,
        kind: 'status'
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
  if (!shouldShowNotification(message.kind)) return false;

  const focus=focusDelivery(message,{focusUntil:ownFocusUntil});
  if(focus.holdUntil)return false;

  if(!focus.quiet)window.playLittleSound?.(readNotificationPreferences().inAppSound);

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
