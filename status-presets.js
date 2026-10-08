// Quick statuses belong to your profile. Home opens the profile too, so there
// is no second editor with subtly different choices or saving behavior.
import { escapeHtml } from './ui-helpers.js';
import { personName } from './profile-store.js';

export const QUICK_STATUSES = [
  { id: 'busy', label: '🫠 busy', status: { text: 'busy', state: 'dnd', emoji: '🫠' } },
  { id: 'home-soon', label: '🏠 home soon', status: { text: 'home soon', state: 'online', emoji: '🏠' } },
  { id: 'out', label: '👟 out', status: { text: 'out', state: 'away', emoji: '👟' } },
  { id: 'leaving now', label: '🚗 leaving now', arrival: 'leaving now' },
  { id: 'almost there', label: '📍 almost there', arrival: 'almost there' },
  { id: 'focus', label: '⏱ focus 30m', focus: 30 }
];

export function quickStatusButtons() {
  return QUICK_STATUSES.map(item => `<button type="button" data-quick-status="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>`).join('');
}

// `exists` says whether this person already has a status document: the rules
// need text, category and emoji on a first write, so a new one supplies blanks.
export async function saveQuickStatus({ data, viewer, other, exists }, id, custom = '') {
  const preset = id === 'custom'
    ? { id, status: { text: custom, state: 'online', emoji: '✦' } }
    : QUICK_STATUSES.find(item => item.id === id);
  if (!preset) return;
  const now = Date.now();
  const blank = exists ? {} : { text: '', category: '', emoji: '', state: 'online', expiresAt: 0 };
  if (preset.focus) {
    await data.setTo('statuses', viewer, { person: viewer, ...blank, focusLabel: 'doing the thing', focusMinutes: preset.focus, focusStartedAt: now, focusUntil: now + preset.focus * 60000, focusEndedAt: 0, updateKind: 'focus', updatedAt: now });
    void data.notify(other, { title: `${personName(viewer)} changed status`, body: `focus mode for ${preset.focus} minutes`, url: `status.html#profile-${viewer}`, kind: 'status' });
  } else if (preset.arrival) {
    await data.setTo('statuses', viewer, { person: viewer, ...blank, arrival: preset.arrival, arrivalAt: now, updateKind: 'arrival', updatedAt: now });
    void data.notify(other, { title: `${personName(viewer)}: ${preset.arrival}`, body: '', url: `status.html#profile-${viewer}-map`, kind: 'arrival' });
  } else {
    // A plain status replaces an old "leaving now", the same as the full editor.
    await data.setTo('statuses', viewer, { person: viewer, ...blank, ...preset.status, category: '', arrival: '', arrivalAt: 0, updateKind: 'custom', updatedAt: now });
    void data.notify(other, { title: `${personName(viewer)} changed status`, body: preset.status.text, url: `status.html#profile-${viewer}`, kind: 'status' });
  }
}
