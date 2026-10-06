// What the other phone is told when you arrive at a saved spot.
const ARRIVAL_LINES = {
  home: (name) => `${name} just got home! 🏠`,
  work: (name) => `${name} just got to work :c`,
  school: (name) => `${name} just got to school 📚`,
  errands: (name) => `${name} is out doing side quests 🛒`
};

export function arrivalMessage(place = {}, name = 'someone', { together = false, late = false } = {}) {
  const display = placeDisplay(place);
  const line = ARRIVAL_LINES[place.preset];
  if (late) {
    // Noticed when the app was next opened, so "just" would not be true.
    return { title: `${name} made it to ${display.label} ${display.emoji}`, body: together ? `you're both here now` : 'a little while ago' };
  }
  return {
    title: line ? line(name) : `${name} just got to ${display.label} ${display.emoji}`,
    body: together ? `you're both here · ${togetherPlace({ placeLabel: display.label, placePreset: place.preset }, { placeLabel: display.label, placePreset: place.preset })}` : display.status
  };
}

// Arrival pings are on unless a spot has been switched off. Spots saved before
// this existed carried an unticked "ping them" box by default, which nobody
// chose on purpose, so only an explicit off counts.
export function announcesArrival(place = {}) {
  return place.announce !== false;
}

// Leaving pings were off unless ticked, and the box started unticked, so
// "left work" never went out. Work and school now ping by default; a choice
// made with the bell (leaveChosen) is always respected.
export function announcesLeave(place = {}) {
  if (place.leaveChosen === true) return place.announceLeave === true;
  return place.announceLeave === true || ['work', 'school'].includes(place.preset);
}

export function leaveMessage(place = {}, name = 'someone', { late = false } = {}) {
  const display = placeDisplay(place);
  if (late) return { title: `${name} left ${display.label}`, body: 'a little while ago' };
  return { title: `${name} is leaving ${display.label} ${display.emoji}`, body: 'on the move. you will hear when they are close.' };
}

export function overlappingPlace(places = [], point, radius) {
  return places.find(place => Number.isFinite(place?.lat) && Number.isFinite(place?.lng)
    && placeDistance(place, point) < (Number(place.radius) || 150) + radius) || null;
}

export const PLACE_PRESETS = {
  home: { emoji:'🏠', label:'home', status:'vibing at home', together:'home together', animation:'cozy' },
  work: { emoji:'💻', label:'work', status:'working hard', together:'coworking arc', animation:'working' },
  school: { emoji:'📚', label:'school', status:'academic weapon mode', together:'study party', animation:'studying' },
  errands: { emoji:'🛒', label:'errands', status:'doing side quests', together:'side quest duo', animation:'bouncing' },
  custom: { emoji:'📍', label:'somewhere', status:'out and about', together:'together here', animation:'neutral' }
};

export function placeDisplay(place = {}) {
  const preset = PLACE_PRESETS[place.preset] || PLACE_PRESETS.custom;
  const label = String(place.label || preset.label).trim().slice(0, 40);
  const status = String(place.statusText || (place.preset === 'custom' ? `at ${label}` : preset.status)).trim().slice(0, 90);
  return { ...preset, label, status, emoji:String(place.emoji || preset.emoji).slice(0, 16) };
}

// Whether a status document already says what being at `place` (or at no saved
// spot, when place is null) would make it say. Rewriting it anyway bumps
// updatedAt, and the other phone treats that as news.
export function statusShowsPlace(existing, place) {
  if (!existing) return !place;
  const display = place ? placeDisplay(place) : null;
  return String(existing.locationText || '') === (display?.status || '')
    && String(existing.locationPreset || '') === (place?.preset || '')
    && (existing.locationPlaceId === undefined || existing.locationPlaceId === (place?.id || ''));
}

export function matchSavedPlace(places, point, activeId = '') {
  let winner = null;
  let shortest = Infinity;
  for (const place of places || []) {
    if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lng)) continue;
    const distance = placeDistance(place, point);
    const radius = Math.max(50, Math.min(1000, Number(place.radius) || 150));
    const accuracyHelp = Math.min(60, Math.max(0, Number(point?.accuracy) || 0));
    const allowed = (activeId === place.id ? radius * 1.25 : radius) + accuracyHelp;
    if (distance <= allowed && distance < shortest) { winner = place; shortest = distance; }
  }
  return winner;
}

// What the two of you are when you are at the same saved spot. This lived as
// two hand-copied if-chains (home page and map page) next to the preset
// table's own `together` words, which nothing read.
export function togetherPlace(her = {}, him = {}) {
  if (!her.placeLabel && !him.placeLabel) return '';
  const sameLabel = her.placeLabel && him.placeLabel && her.placeLabel.toLocaleLowerCase() === him.placeLabel.toLocaleLowerCase();
  const preset = her.placePreset && her.placePreset === him.placePreset ? her.placePreset : '';
  if (!sameLabel && !preset) return '';
  if (preset && preset !== 'custom' && PLACE_PRESETS[preset]) return PLACE_PRESETS[preset].together;
  return `together at ${her.placeLabel || him.placeLabel}`;
}

export function friendlyDistance(meters) {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

// The one distance function. There were four copies of this.
export function placeDistance(a, b) {
  const radius = 6371000;
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const half = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(half), Math.sqrt(1 - half));
}
