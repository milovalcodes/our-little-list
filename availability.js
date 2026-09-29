// One answer to "is this person around?". It used to be three separate ones —
// a presence dot, an around / afk-ish / busy / lurking choice, and the map's
// "live now" — that could disagree with each other: "lurking" (the choice to
// look invisible) still showed a green "here now".

import { timeAgo } from './time-format.js';

export const STATE_LABELS = { online: 'around', away: 'afk-ish', dnd: 'busy', invisible: 'lurking' };
const HERE_MS = 120000;

// A focus session is part of the status: while it runs, it is what the status
// says. It is kept in its own fields (focusLabel, focusUntil) rather than
// written over the status text, so the song or craving you had set is still
// there when the timer ends — and a focus timer's end can never be mistaken for
// your status's own "disappear at" time.
export function focusActive(status, now = Date.now()) {
  return Boolean(status && Number(status.focusUntil) > now);
}

// What someone's status is saying right now, in the order it wins: a running
// focus session, then their own words (until they expire), then where they are.
export function statusShows(status, now = Date.now()) {
  if (!status) return { kind: 'none', emoji: '', category: '', text: '' };
  if (focusActive(status, now)) return { kind: 'focus', emoji: '⏱', category: 'locking in', text: String(status.focusLabel || 'doing the thing') };
  const expired = Number(status.expiresAt) > 0 && Number(status.expiresAt) < now;
  const own = !expired ? String(status.text || '').trim() : '';
  if (own) return { kind: 'custom', emoji: status.emoji || '✦', category: status.category || 'currently', text: own };
  const place = String(status.locationText || '').trim();
  if (place) return { kind: 'location', emoji: status.locationEmoji || '📍', category: 'location', text: place };
  return { kind: 'none', emoji: '', category: '', text: '' };
}

export function hereLine({ presence, status, now = Date.now() } = {}) {
  const state = status?.state || 'online';
  if (state === 'invisible') return { here: false, text: 'lurking', state };
  const at = Number(presence?.lastSeenAt) || 0;
  const here = at > 0 && now - at < HERE_MS;
  const seen = here ? 'here now' : at ? `here ${timeAgo(at)}` : 'not here rn';
  const label = STATE_LABELS[state] || '';
  return { here, text: label && state !== 'online' ? `${seen} · ${label}` : seen, state };
}
