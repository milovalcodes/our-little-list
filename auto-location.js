// Foreground location for the whole PWA.
//
// Browsers cannot provide honest Life360-style background tracking. Instead,
// every app page starts one watcher while it is alive and renews a short lease.
// If the phone suspends the page, the lease expires and the map becomes
// "last known" rather than pretending the position is still live.

import { sharedLayer } from './data-hub.js';
import { awaitViewer, partnerOf } from './viewer.js';
import { personName } from './profile-store.js';
import { placeDisplay, matchSavedPlace, statusShowsPlace, placeDistance as metersBetween, arrivalMessage, leaveMessage, announcesArrival, announcesLeave } from './place-presets.js';
import { approachStep, approachMessage, APPROACH } from './journey.js';

const LEASE_MS = 4 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;
const RETRY_LIMIT = 5;

let data;
let viewer;
let watchId = null;
let heartbeat = null;
let retryTimer = null;
let errors = 0;
let lastPoint = null;
// The throttle has to outlive the page. Every tap through the app loads this
// module again, and a per-page counter started at zero each time — so simply
// walking around the site wrote a location per page, on top of the heartbeat.
const THROTTLE_KEY = 'our-little-list-location-throttle';
let lastSavedAt = 0;
let lastSavedPoint = null;
let lastAttemptAt = 0;
let writeInFlight = false;
let phase = 'loading';
let detail = '';
let places = [];
let activePlaceId = null;
let placeMatchStarted = false;
let placeStatusInFlight = false;
// Until the saved spots have loaded once, "not at any saved spot" is not a
// fact. A GPS fix that beat the spots used to settle on "nowhere", so the next
// fix — same chair, same spot — looked like an arrival and pinged the other
// phone.
let placesLoaded = false;
// A check that came in while another was still writing. It used to be dropped,
// and the next GPS fix then carried the change as if you had moved.
let placeRecheck = null;
// Whether this phone has ever recorded which spot it was at. Without that, the
// first fix after opening cannot tell a real move from a first-ever reading.
let placeKnown = false;
let partnerPoint = null;
// How long ago this phone last had a fix, read once as the page opens, before
// this page's own fixes overwrite it.
let openedSinceSeen = Infinity;
let lastArrivalPingAt = 0;
// A move noticed only when the app is opened again (the phone was in a pocket)
// still pings, worded as news from a while ago, up to this long after.
const CATCH_UP_MS = 3 * 60 * 60 * 1000;
const LATE_MS = 15 * 60 * 1000;

// Phases you do not come back from by yourself. Re-arming a denied watcher on
// every app switch just asked the phone the same question and got the same no.
const DEAD_PHASES = ['blocked', 'unavailable', 'paused', 'preview', 'needs-permission'];

// The phone's location prompt used to appear on the first page anyone opened,
// with nothing on screen saying why. Until someone taps a "turn on" (Settings
// or the Right now page), an unanswered permission stays unasked.
export const LOCATION_ASKED_KEY = 'our-little-list-location-asked';

restoreThrottle();

const ready = boot();

export function locationSnapshot() {
  return { phase, detail, viewer, pausedUntil: pausedUntil(), updatedAt: lastPoint?.updatedAt || 0, accuracy: lastPoint?.accuracy || 0, lat:lastPoint?.lat, lng:lastPoint?.lng, placeId:lastPoint?.placeId || '', placeLabel:lastPoint?.placeLabel || '', placePreset:lastPoint?.placePreset || '' };
}

export async function resumeAutoLocation() {
  await ready;
  if (!viewer || data?.mode === 'local') return locationSnapshot();
  const wasPaused = isPaused() || expiredPause;
  expiredPause = false;
  try { localStorage.removeItem(pauseKey()); localStorage.setItem(LOCATION_ASKED_KEY, 'yes'); } catch (_) {}
  window.clearTimeout(resumeTimer);
  startWatcher();
  if (wasPaused) tellPartnerSharingIsBack();
  return locationSnapshot();
}

// minutes = 0 pauses until turned back on; otherwise sharing comes back by
// itself (Snap's Ghost Mode, Life360's Bubbles), and the other phone is told.
export async function pauseAutoLocation({ removeSpot = false, minutes = 0 } = {}) {
  await ready;
  stopWatcher();
  phase = 'paused';
  const until = minutes > 0 ? Date.now() + minutes * 60000 : 0;
  detail = until ? `back on at ${new Date(until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : removeSpot ? 'last spot hidden' : 'last spot kept';
  try { localStorage.setItem(pauseKey(), until ? String(until) : 'yes'); } catch (_) {}
  armTimedResume();
  let synced = true;
  if (viewer && data?.mode !== 'local') {
    try {
      if (removeSpot) await data.removeFrom('locations', viewer);
      else await data.updateIn('locations', viewer, { shareUntil: Date.now() - 1 });
    } catch (_) { synced = false; }
  }
  if (!synced) detail = 'paused here; the live badge may take a few minutes to expire';
  emit();
  return locationSnapshot();
}

async function boot() {
  data = await sharedLayer();
  viewer = await awaitViewer();
  if (!viewer) return;
  if (data.mode === 'local') {
    phase = 'preview';
    detail = 'location stays off in local preview';
    emit();
    return;
  }
  try { const stored = localStorage.getItem(placeKey()); placeKnown = stored !== null; activePlaceId = stored || ''; } catch (_) { activePlaceId = ''; }
  openedSinceSeen = lastSeenAt() ? Date.now() - lastSeenAt() : Infinity;
  data.listenTo('locations', items => {
    const partner = partnerOf(viewer);
    partnerPoint = items.find(item => item.id === partner || item.person === partner) || null;
  });
  data.listenTo('places', items => {
    places = items.filter(item => item.person === viewer && Number.isFinite(item.lat) && Number.isFinite(item.lng));
    placesLoaded = true;
    // A change to the list of spots is not movement: saving a spot while
    // standing in it must not ring the other phone with "arrived".
    // The first load of the list after this page opened is the page's first
    // check, which may still be a move made while the app was closed.
    if (lastPoint) void applyPlaceMatch(lastPoint, undefined, { moved: !placeMatchStarted });
  });
  if (isPaused()) {
    phase = 'paused';
    const until = pausedUntil();
    detail = until ? `back on at ${new Date(until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'paused on this phone';
    armTimedResume();
    emit();
    return;
  }
  if (await waitingForFirstAsk()) {
    phase = 'needs-permission';
    detail = 'tap turn on to share while the app is open';
    emit();
    return;
  }
  // A timed pause that ran out while the app was closed.
  if (expiredPause) { expiredPause = false; tellPartnerSharingIsBack(); }
  startWatcher();
}

export async function locationPermissionState() {
  try { return (await navigator.permissions?.query({ name: 'geolocation' }))?.state || 'unknown'; } catch (_) { return 'unknown'; }
}

async function waitingForFirstAsk() {
  try { if (localStorage.getItem(LOCATION_ASKED_KEY)) return false; } catch (_) { return false; }
  return (await locationPermissionState()) === 'prompt';
}

let resumeTimer = null;
let expiredPause = false;
function armTimedResume() {
  window.clearTimeout(resumeTimer);
  const until = pausedUntil();
  if (!until) return;
  // setTimeout caps near 24.8 days; a pause is hours, but stay safe.
  resumeTimer = window.setTimeout(() => {
    if (pausedUntil() !== until) return;
    void resumeAutoLocation();
  }, Math.min(until - Date.now() + 500, 2 ** 31 - 1));
}

function tellPartnerSharingIsBack() {
  if (!viewer || data?.mode === 'local') return;
  void data.notify(partnerOf(viewer), {
    title: `${personName(viewer)} is sharing location again`,
    body: 'back on the map',
    url: 'status.html#couple-map',
    kind: 'arrival'
  });
}

// Precise GPS is what drains a phone. It is only worth it on the map page or
// when you are close enough to a saved spot for an arrival to hinge on it.
let highAccuracyOn = null;
function wantsHighAccuracy() {
  if (document.body?.dataset.app === 'status') return true;
  // The first fix decides "at a saved spot or not"; a rough one could look
  // like leaving home and then arriving again a moment later.
  if (!lastPoint) return true;
  return places.some(place => metersBetween(lastPoint, place) <= (Number(place.radius) || 150) + 400);
}

function startWatcher() {
  stopWatcher();
  if (!navigator.geolocation) {
    phase = 'unavailable';
    detail = 'this browser has no location support';
    emit();
    return;
  }
  if (!window.isSecureContext) {
    phase = 'unavailable';
    detail = 'location needs the live https site';
    emit();
    return;
  }
  errors = 0;
  // Coming back to the app after it was put away: the next fix is compared
  // with the remembered spot like a fresh page, late wording included.
  placeMatchStarted = false;
  openedSinceSeen = lastSeenAt() ? Date.now() - lastSeenAt() : Infinity;
  phase = 'starting';
  detail = 'finding this phone';
  emit();
  armWatch();
  heartbeat = window.setInterval(refreshLease, HEARTBEAT_MS);
}

function armWatch() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  highAccuracyOn = wantsHighAccuracy();
  watchId = navigator.geolocation.watchPosition(savePosition, handleError, {
    enableHighAccuracy: highAccuracyOn,
    maximumAge: highAccuracyOn ? 15000 : 45000,
    timeout: 20000
  });
}

function stopWatcher() {
  if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  window.clearInterval(heartbeat);
  window.clearTimeout(retryTimer);
  heartbeat = null;
  retryTimer = null;
}

async function savePosition(position) {
  errors = 0;
  const now = Date.now();
  const next = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    updatedAt: now,
    shareUntil: now + LEASE_MS,
    person: viewer
  };
  const matched = closestPlace(next);
  if (matched) {
    const display = placeDisplay(matched);
    next.placeId = matched.id;
    next.placeLabel = display.label;
    next.placePreset = matched.preset || 'custom';
    next.placeEmoji = display.emoji;
  } else {
    next.placeId = '';
    next.placeLabel = '';
    next.placePreset = '';
    next.placeEmoji = '';
  }
  lastPoint = next;
  phase = 'live';
  detail = 'updating while the app is open';
  emit();
  // Checked before this fix is marked as seen: the gap since the last one is
  // what tells a fresh move from one that happened while the app was away.
  await applyPlaceMatch(next, matched);
  markSeen();
  void checkApproach(next);
  // Walked near a saved spot (or away from all of them): switch GPS mode.
  if (watchId !== null && highAccuracyOn !== null && wantsHighAccuracy() !== highAccuracyOn) armWatch();
  // A GPS watcher can chatter several times a second. The map does not need
  // that many cloud writes: save meaningful movement, or refresh once a minute.
  await persistPoint(next);
}

function closestPlace(point) {
  return matchSavedPlace(places, point, activePlaceId);
}

async function applyPlaceMatch(point, knownMatch = undefined, { moved = true } = {}) {
  if (!viewer || !data || !placesLoaded) return;
  if (placeStatusInFlight) {
    // Anything that was not movement keeps the whole re-check from counting as
    // an arrival.
    placeRecheck = { moved: placeRecheck ? placeRecheck.moved && moved : moved };
    return;
  }
  const place = knownMatch === undefined ? closestPlace(point) : knownMatch;
  const nextId = place?.id || '';
  if (placeMatchStarted && nextId === activePlaceId) return;
  const firstCheck = !placeMatchStarted;
  const previousId = activePlaceId;
  const previousPlace = places.find(item => item.id === previousId);
  // Only a real arrival pings: not the first fix after a page opens, and not a
  // spot being saved (or edited) while you are already standing in it.
  // The first fix after a page opens used to be ignored outright. This app
  // reloads on every page change and stops watching when it is put away, so
  // that threw away nearly every real move. Now the first fix is compared with
  // the spot this phone last recorded: a change counts, and if that record is
  // old the ping says it happened a little while ago.
  const sinceSeen = openedSinceSeen;
  const catchUp = firstCheck && placeKnown && sinceSeen <= CATCH_UP_MS && Number(point?.accuracy || 0) <= 100;
  const counts = moved && (!firstCheck || catchUp);
  const late = firstCheck && sinceSeen > LATE_MS;
  const shouldNotify = counts && Boolean(nextId) && nextId !== previousId && announcesArrival(place);
  // Arriving somewhere says more than having left: when a late check finds
  // both, only the arrival goes out.
  const shouldNotifyLeave = counts && Boolean(previousPlace) && nextId !== previousId && announcesLeave(previousPlace) && !(late && shouldNotify);
  placeMatchStarted = true;
  rememberPlace(nextId);
  placeStatusInFlight = true;
  try {
    const statuses = await data.readOnce('statuses');
    const existing = statuses.find(item => item.id === viewer || item.person === viewer);
    const display = place ? placeDisplay(place) : null;
    const locationText = display?.status || '';
    const locationPreset = place?.preset || '';
    // Every page used to rewrite this on its first GPS fix, changed or not —
    // and with no saved spots at all. Each rewrite bumped updatedAt, so the
    // other phone got an "updated their status" popup and a fresh "changed
    // locations · left a saved spot" in its feed whenever this one opened a
    // page. Now only a real change is written.
    if (statusShowsPlace(existing, place)) {
      if (shouldNotifyLeave) void announcePlaceChange(previousPlace,'left',{ late });
      if (shouldNotify) void announcePlaceChange(place,'arrived',{ late });
      return;
    }
    const payload = {
      person:viewer,
      locationText,
      locationEmoji:display?.emoji || '',
      locationPreset,
      locationLabel:display?.label || '',
      locationPlaceId:nextId,
      locationAt:Date.now(),
      updateKind:'location',
      updatedAt:Date.now(),
      ...(existing ? {} : { state:'online', text:'', category:'', emoji:'', energy:'functioning', expiresAt:0 })
    };
    await data.setTo('statuses', viewer, payload);
    if (shouldNotifyLeave) void announcePlaceChange(previousPlace,'left',{ late });
    if (shouldNotify) void announcePlaceChange(place,'arrived',{ late });
  } catch (_) {
    // The location itself can still be useful even when its cosmetic status
    // update has to wait. Forget that this one was applied, so the next fix
    // tries again instead of believing it already happened.
    rememberPlace(previousId);
    if (firstCheck) placeMatchStarted = false;
  } finally {
    placeStatusInFlight = false;
    if (placeRecheck && lastPoint) {
      const next = placeRecheck;
      placeRecheck = null;
      void applyPlaceMatch(lastPoint, undefined, next);
    }
  }
}

// "<name> just got home! 🏠" to the other phone. GPS near the edge of a spot
// can step out and back in; one ping per spot per half hour is plenty.
const ARRIVAL_QUIET_MS = 30 * 60 * 1000;
async function announcePlaceChange(place,change,{ late = false } = {}) {
  const key = `our-little-list-${change}-${viewer}-${place.id}`;
  try { if (Date.now() - Number(localStorage.getItem(key) || 0) < ARRIVAL_QUIET_MS) return; } catch (_) {}
  // Claim the cooldown before the async read/outbox write. Another tab can
  // observe the same GPS transition while this one is still sending it.
  const claimedAt=Date.now();
  try { localStorage.setItem(key,String(claimedAt)); } catch (_) {}
  const partner = partnerOf(viewer);
  let together = false;
  if(change==='arrived')try {
    // If they are already there (live, inside this spot), say so.
    const points = await data.readOnce('locations');
    const theirs = points.find(point => point.id === partner || point.person === partner);
    const radius = Math.max(50, Math.min(1000, Number(place.radius) || 150)) + 60;
    together = Boolean(theirs && Number(theirs.shareUntil) > Date.now() && Number.isFinite(theirs.lat) && metersBetween(place, theirs) <= radius);
  } catch (_) { /* the plain message is fine */ }
  if(change==='arrived')lastArrivalPingAt=Date.now();
  const message = change==='left'?leaveMessage(place,personName(viewer),{ late }):arrivalMessage(place, personName(viewer), { together, late });
  const result=await data.notify(partner, { ...message, url: 'status.html#couple-map', kind: 'arrival', ref: `place-${place.id}-${change}` });
  if(!result?.queued)try { if(localStorage.getItem(key)===String(claimedAt))localStorage.removeItem(key); } catch (_) {}
}

function rememberPlace(id) {
  activePlaceId = id;
  placeKnown = true;
  try { localStorage.setItem(placeKey(), id); } catch (_) {}
}

// When this phone last had a fix, so a later first check knows how old its
// remembered spot is.
function seenKey() { return `our-little-list-place-seen-${viewer}`; }
function lastSeenAt() { try { return Number(localStorage.getItem(seenKey())) || 0; } catch (_) { return 0; } }
function markSeen() { try { localStorage.setItem(seenKey(), String(Date.now())); } catch (_) {} }

// Almost together / together at last, to the other phone. The reading this is
// compared with is kept across page loads, so walking between pages of the
// app does not reset it.
function approachKey() { return `our-little-list-approach-${viewer}`; }
async function checkApproach(point) {
  if (!viewer || !data || data.mode === 'local' || !partnerPoint) return;
  let before = null;
  try { before = JSON.parse(localStorage.getItem(approachKey()) || 'null'); } catch (_) {}
  const now = Date.now();
  const step = approachStep({ before, after: point, partner: partnerPoint, distance: metersBetween, now });
  try { localStorage.setItem(approachKey(), JSON.stringify({ lat: point.lat, lng: point.lng, at: now, stage: step.stage })); } catch (_) {}
  if (!step.ping) return;
  // Walking into a saved spot where they are already sends "you're both here";
  // a second "together at last" on top of it would be noise.
  const matched = closestPlace(point);
  if (step.ping === 'together' && ((matched && matched.id !== activePlaceId && announcesArrival(matched)) || now - lastArrivalPingAt < 3 * 60000)) return;
  const key = `our-little-list-approach-ping-${viewer}-${step.ping}`;
  try { if (now - Number(localStorage.getItem(key) || 0) < APPROACH.cooldown) return; localStorage.setItem(key, String(now)); } catch (_) {}
  const partner = partnerOf(viewer);
  const message = approachMessage(step.ping, personName(viewer), { meters: step.meters, partnerLive: Number(partnerPoint.shareUntil) > now });
  const result = await data.notify(partner, { ...message, url: 'status.html#couple-map', kind: 'arrival', ref: `approach-${step.ping}` });
  if (!result?.queued) try { localStorage.removeItem(key); } catch (_) {}
}

async function persistPoint(next, renewLease = false) {
  const now = Date.now();
  const previous = lastSavedPoint;
  const sinceSave = now - lastSavedAt;
  const sinceAttempt = now - lastAttemptAt;
  if (writeInFlight || sinceAttempt < 15000) return;
  // A lease renewal is only worth a write once the old one is halfway gone.
  if (renewLease && lastSavedAt && sinceSave < LEASE_MS / 2) return;
  if (!renewLease && lastSavedAt && (sinceSave < 15000 || (sinceSave < 60000 && previous && metersBetween(previous, next) < 25))) return;
  writeInFlight = true;
  lastAttemptAt = now;
  rememberThrottle();
  try {
    await data.setTo('locations', viewer, next);
    lastSavedAt = now;
    lastSavedPoint = next;
    rememberThrottle();
  } catch (_) {
    phase = 'offline';
    detail = 'could not sync yet; trying again';
    emit();
  } finally {
    writeInFlight = false;
  }
}

function refreshLease() {
  if (document.hidden || DEAD_PHASES.includes(phase) || phase === 'error') return;
  if (!lastPoint) {
    // Nothing to renew, and no watcher to renew it from. Asking the platform to
    // watch again here used to throw outright on a browser with no geolocation.
    if (watchId !== null) armWatch();
    return;
  }
  const now = Date.now();
  const renewed = { ...lastPoint, updatedAt: now, shareUntil: now + LEASE_MS };
  lastPoint = renewed;
  void persistPoint(renewed, true);
}

function handleError(problem) {
  if (problem?.code === 1) {
    stopWatcher();
    phase = 'blocked';
    detail = 'allow location in phone settings';
    emit();
    return;
  }
  errors += 1;
  if (errors >= RETRY_LIMIT) {
    stopWatcher();
    phase = 'error';
    detail = 'this phone could not get a position';
    emit();
    return;
  }
  phase = 'retrying';
  detail = `trying again (${errors}/${RETRY_LIMIT})`;
  emit();
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(armWatch, errors * 4000);
}

function pauseKey() {
  return `our-little-list-location-paused-${viewer}`;
}

function placeKey() {
  return `our-little-list-active-place-${viewer}`;
}

function isPaused() {
  let value = null;
  try { value = localStorage.getItem(pauseKey()); } catch (_) { return false; }
  if (!value) return false;
  if (value === 'yes') return true;
  if (Number(value) > Date.now()) return true;
  try { localStorage.removeItem(pauseKey()); } catch (_) {}
  expiredPause = true;
  return false;
}

// 0 when not paused or paused until turned back on.
function pausedUntil() {
  try { const value = Number(localStorage.getItem(pauseKey())); return value > Date.now() ? value : 0; } catch (_) { return 0; }
}

function emit() {
  window.dispatchEvent(new CustomEvent('littlelist:location-state', { detail: locationSnapshot() }));
}

function resumeIfSensible() {
  if (!viewer || data?.mode === 'local') return;
  if (isPaused()) {
    // Another page in the app paused this. Honour it rather than quietly
    // resuming and republishing a live badge the user thought they turned off.
    if (phase !== 'paused') { stopWatcher(); phase = 'paused'; detail = 'paused on this phone'; emit(); }
    return;
  }
  if (phase === 'paused') {
    // Turned back on from another page, or a timed pause ran out.
    if (expiredPause) { expiredPause = false; tellPartnerSharingIsBack(); }
    restoreThrottle();
    startWatcher();
    return;
  }
  if (DEAD_PHASES.includes(phase)) return;
  restoreThrottle();
  startWatcher();
}

window.addEventListener('pagehide', stopWatcher);
window.addEventListener('pageshow', resumeIfSensible);
window.addEventListener('online', refreshLease);
window.addEventListener('storage', event => { if (event.key === pauseKey()) resumeIfSensible(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopWatcher();
  else resumeIfSensible();
});

function rememberThrottle() {
  try {
    sessionStorage.setItem(THROTTLE_KEY, JSON.stringify({ lastSavedAt, lastAttemptAt, lastSavedPoint }));
  } catch (_) { /* private mode; the in-page throttle still applies */ }
}

function restoreThrottle() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(THROTTLE_KEY) || 'null');
    if (!saved) return;
    lastSavedAt = Number(saved.lastSavedAt) || 0;
    lastAttemptAt = Number(saved.lastAttemptAt) || 0;
    lastSavedPoint = saved.lastSavedPoint || null;
  } catch (_) { /* nothing worth recovering */ }
}

