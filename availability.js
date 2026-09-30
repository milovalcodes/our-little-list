// One answer to "is this person around?". It used to be three separate ones —
// a presence dot, an around / afk-ish / busy / lurking choice, and the map's
// "live now" — that could disagree with each other: "lurking" (the choice to
// look invisible) still showed a green "here now".

import { timeAgo } from './time-format.js';
import { togetherPlace, friendlyDistance, placeDistance } from './place-presets.js';

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

export function arrivalActive(status, now = Date.now()) {
  const at = Number(status?.arrivalAt) || 0;
  return Boolean(status?.arrival && at > 0 && now >= at && now - at < 45 * 60000);
}

// What someone's status is saying right now, in the order it wins: a running
// focus session, then their own words (until they expire), then where they are.
export function statusShows(status, now = Date.now()) {
  if (!status) return { kind: 'none', emoji: '', category: '', text: '' };
  if (focusActive(status, now)) return { kind: 'focus', emoji: '⏱', category: 'locking in', text: String(status.focusLabel || 'doing the thing') };
  if (arrivalActive(status, now)) return { kind: 'arrival', emoji: '↗', category: 'on the way', text: String(status.arrival) };
  const expired = Number(status.expiresAt) > 0 && Number(status.expiresAt) < now;
  const own = !expired ? String(status.text || '').trim() : '';
  if (own) return { kind: 'custom', emoji: status.emoji || '✦', category: status.category || 'currently', text: own };
  const place = String(status.locationText || '').trim();
  if (place) return { kind: 'location', emoji: status.locationEmoji || '📍', category: 'location', text: place };
  // Older status documents stored a separate energy field. Keep those readable
  // even though new edits put the same words in the ordinary status field.
  const legacyEnergy = String(status.energy || '').trim();
  if (legacyEnergy && legacyEnergy !== 'functioning') return { kind: 'custom', emoji: '✦', category: 'feeling', text: legacyEnergy };
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

// One wording for how far apart you are. Home and Right now each had their
// own ladder, and they disagreed past 2 km ("same sky" vs "same planet,
// technically"). Old positions say how old they are.
export function orbitLine(her, him, now = Date.now()) {
  const meters = placeDistance(her, him);
  const friendly = friendlyDistance(meters);
  const orbit = meters <= 75 ? 'together' : meters <= 500 ? 'close' : meters <= 2000 ? 'near' : 'far';
  const bothLive = Number(her.shareUntil) > now && Number(him.shareUntil) > now;
  if (!bothLive) {
    const oldest = Math.min(Number(her.updatedAt) || 0, Number(him.updatedAt) || 0);
    return { orbit, meters, live: false, title: 'last known orbit', detail: `${friendly} apart · ${oldest ? `as of ${timeAgo(oldest)}` : 'at the last update'}`, kicker: 'old news' };
  }
  const place = meters <= 500 ? togetherPlace(her, him) : '';
  const line = (title, detail, kicker) => ({ orbit, meters, live: true, title, detail, kicker });
  if (place) return line(place, `${friendly} apart`, 'same saved spot');
  if (meters <= 75) return line('together at last :)', `${friendly} apart`, 'made it');
  if (meters <= 500) return line('almost together', `${friendly} to go`, 'so close');
  if (meters <= 2000) return line('getting closer', `${friendly} between you`, 'on the way');
  if (meters <= 10000) return line('on the way', `${friendly} between you`, 'getting there');
  return line('same sky', `${friendly} apart for now`, 'for now');
}
