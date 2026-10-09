// One way to make each kind of thing. Quick add and each page's own form used
// to build these records separately and had already drifted: quick-add date
// ideas got a vibe that matched none of the four vibe buttons, and quick-add
// notes could only ever be ✦. Both now come through here.

import { personName } from './profile-store.js';
import { friendlyWhen } from './time-format.js';

export const DATE_VIBES = ['go out', 'stay in', 'food', 'little trip'];
export const NOTE_MOODS = { heart: '💛', sun: '☀️', moon: '🌙', star: '✦' };

export async function addTask(data, { viewer, other, title, type = 'task', due = '', recurrence = 'once', aisle = '', schedule = {} }) {
  const grocery = type === 'grocery';
  const record = await data.addTo('items', {
    title, type: grocery ? 'grocery' : 'task', due, recurrence,
    ...schedule, aisle: grocery ? aisle : '', addedBy: viewer, done: false, createdAt: Date.now()
  });
  void data.notify(other, { title: grocery ? 'grocery list update 🛒' : 'new thing on the list ✓', body: title, url: `tasks.html#item-${record.id}`, kind: 'item', ref:`items/${record.id}` });
  return record;
}

export async function sendNote(data, { viewer, other, body, mood = 'heart', pinned = false, pinEmoji = '' }) {
  const record = await data.addTo('notes', {
    sender: viewer, recipient: other, from: viewer, to: other, body, message: body,
    mood: NOTE_MOODS[mood] ? mood : 'heart', read: false, createdAt: Date.now(),
    ...(pinned ? { pinned: true, pinnedAt: Date.now(), pinEmoji: pinEmoji || '📌' } : {})
  });
  const delivery = await data.notify(other, {
    title: pinned ? `📌 on the fridge` : viewer === 'her' ? 'the sun says ☀️' : 'the moon says 🌙',
    body, url: pinned ? `${other}.html#fridge-note` : `notes.html#note-${record.id}`, kind: 'note', ref:`notes/${record.id}`
  });
  return { ...record, delivery };
}

// An ask, optionally for a particular moment. With a time it does what a
// reminder used to: the other phone is told now, and nudged again at the time.
export async function sendAsk(data, { viewer, other, title, note = '', emoji = '', urgency = 'soon', dueAt = 0, urgent = false, forMe = false }) {
  const timed = Number(dueAt) > 0;
  if(forMe&&!timed)throw new Error('a reminder for yourself needs a time');
  const recipient=forMe?viewer:other;
  const record = await data.addTo('help', {
    from: viewer, to: recipient, title, note, emoji: emoji || (timed ? '⏰' : '🙋'),
    urgency: timed ? 'timed' : urgency, urgent:urgent===true, state: 'open', createdAt: Date.now(),
    ...(timed ? { dueAt: Number(dueAt), scheduledAt: new Date(Number(dueAt)).toISOString() } : {})
  });
  const who = personName(viewer);
  if(!forMe)void data.notify(recipient, {
    title: timed ? `${who} set you a reminder ⏰` : urgency === 'now' ? `${who} needs a hand, kind of now` : `${who} needs a hand`,
    body: timed ? `${title} · ${friendlyWhen(dueAt)}` : title,
    url: `tasks.html#ask-${record.id}`, kind: 'help', urgent:urgent===true
  });
  let scheduled = { queued: false };
  if (timed) {
    // The id travels with the nudge so the delivery worker can drop it if the
    // ask is deleted, sorted or turned down before the time comes.
    scheduled = await data.notify(recipient, {
      title: `⏰ ${title}`, body: note || (forMe ? 'your reminder' : `from ${who}`), url: `tasks.html#ask-${record.id}`,
      kind: 'reminder', ref: `help/${record?.id || ''}`, sendAt: Number(dueAt), urgent:urgent===true
    });
  }
  return { ...record, scheduled };
}

export async function addDateIdea(data, { viewer, other, title, note = '', vibe = 'go out', details = {} }) {
  const record = await data.addTo('dates', {
    title, note, vibe: DATE_VIBES.includes(vibe) ? vibe : 'go out', ...details,
    addedBy: viewer, favorite: false, done: false, createdAt: Date.now()
  });
  void data.notify(other, { title: 'new date idea ✦', body: title, url: `dates.html#date-${record.id}`, kind: 'date', ref:`dates/${record.id}` });
  return record;
}
