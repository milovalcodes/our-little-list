// Foreground location for the whole PWA.
//
// Browsers cannot provide honest Life360-style background tracking. Instead,
// every app page starts one watcher while it is alive and renews a short lease.
// If the phone suspends the page, the lease expires and the map becomes
// "last known" rather than pretending the position is still live.

import { sharedLayer } from './data-hub.js';
import { awaitViewer } from './viewer.js';

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
let lastSavedAt = 0;
let lastSavedPoint = null;
let lastAttemptAt = 0;
let writeInFlight = false;
let phase = 'loading';
let detail = '';

const ready = boot();

export function locationSnapshot() {
  return { phase, detail, viewer, updatedAt: lastPoint?.updatedAt || 0, accuracy: lastPoint?.accuracy || 0 };
}

export async function resumeAutoLocation() {
  await ready;
  if (!viewer || data?.mode === 'local') return locationSnapshot();
  try { localStorage.removeItem(pauseKey()); } catch (_) {}
  startWatcher();
  return locationSnapshot();
}

export async function pauseAutoLocation({ removeSpot = false } = {}) {
  await ready;
  stopWatcher();
  phase = 'paused';
  detail = removeSpot ? 'last spot hidden' : 'last spot kept';
  try { localStorage.setItem(pauseKey(), 'yes'); } catch (_) {}
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
  if (isPaused()) {
    phase = 'paused';
    detail = 'paused on this phone';
    emit();
    return;
  }
  startWatcher();
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
  phase = 'starting';
  detail = 'finding this phone';
  emit();
  armWatch();
  heartbeat = window.setInterval(refreshLease, HEARTBEAT_MS);
}

function armWatch() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(savePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 15000,
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
  lastPoint = next;
  phase = 'live';
  detail = 'updating while the app is open';
  emit();
  // A GPS watcher can chatter several times a second. The map does not need
  // that many cloud writes: save meaningful movement, or refresh once a minute.
  await persistPoint(next);
}

async function persistPoint(next, renewLease = false) {
  const now = Date.now();
  const previous = lastSavedPoint;
  const sinceSave = now - lastSavedAt;
  const sinceAttempt = now - lastAttemptAt;
  if (writeInFlight || sinceAttempt < 15000) return;
  if (!renewLease && lastSavedAt && (sinceSave < 15000 || (sinceSave < 60000 && previous && metersBetween(previous, next) < 25))) return;
  writeInFlight = true;
  lastAttemptAt = now;
  try {
    await data.setTo('locations', viewer, next);
    lastSavedAt = now;
    lastSavedPoint = next;
  } catch (_) {
    phase = 'offline';
    detail = 'could not sync yet; trying again';
    emit();
  } finally {
    writeInFlight = false;
  }
}

function refreshLease() {
  if (document.hidden || phase === 'paused' || phase === 'blocked') return;
  if (!lastPoint) {
    armWatch();
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

function isPaused() {
  try { return localStorage.getItem(pauseKey()) === 'yes'; } catch (_) { return false; }
}

function emit() {
  window.dispatchEvent(new CustomEvent('littlelist:location-state', { detail: locationSnapshot() }));
}

window.addEventListener('pagehide', stopWatcher);
window.addEventListener('pageshow', () => { if (viewer && !isPaused() && data?.mode !== 'local') startWatcher(); });
window.addEventListener('online', refreshLease);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopWatcher();
  else if (viewer && !isPaused() && data?.mode !== 'local') startWatcher();
});

function metersBetween(a, b) {
  const radius = 6371000;
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const half = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(half), Math.sqrt(1 - half));
}
