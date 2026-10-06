// "On my way" trip mode for Right now. A website only knows where the phone is
// while it is open on screen, so for the drive over this keeps the screen
// awake (Screen Wake Lock), keeps location on, and shows the distance left.
// It ends itself once you are together, or after a couple of hours.
import { resumeAutoLocation } from './auto-location.js';
import { toast } from './ui-helpers.js';
import { friendlyDistance, placeDistance } from './place-presets.js';
import { personName } from './profile-store.js';

const KEY = 'our-little-list-trip';
const MAX_MS = 2 * 60 * 60 * 1000;
const TOGETHER_M = 120;
let lock = null;
let viewer = null;
let lastMeters = NaN;
const byId = id => document.getElementById(id);

function readTrip() {
  try {
    const trip = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return trip && Date.now() - Number(trip.startedAt) < MAX_MS ? trip : null;
  } catch (_) { return null; }
}

export function tripActive() { return Boolean(readTrip()); }

async function holdScreen() {
  if (!('wakeLock' in navigator) || document.hidden) return false;
  try {
    if (!lock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    }
    return true;
  } catch (_) { return false; }
}

function letScreenSleep() {
  try { lock?.release(); } catch (_) {}
  lock = null;
}

export async function startTrip({ quiet = false } = {}) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ startedAt: Date.now(), wasApart: Number.isFinite(lastMeters) && lastMeters > 400 })); } catch (_) {}
  await resumeAutoLocation();
  const held = await holdScreen();
  render();
  if (!quiet) toast(held ? 'on my way · screen stays on so they get the pings' : 'on my way · keep this screen open so they get the pings');
}

export function endTrip(message = '') {
  try { sessionStorage.removeItem(KEY); } catch (_) {}
  letScreenSleep();
  render();
  if (message) toast(message);
}

// Called by the map with every location update.
export function updateTrip(known = []) {
  const mine = known.find(point => point.id === viewer);
  const theirs = known.find(point => point.id !== viewer);
  lastMeters = mine && theirs ? placeDistance(mine, theirs) : NaN;
  const trip = readTrip();
  if (!trip) { if (lock) letScreenSleep(); render(); return; }
  // Started while still side by side (walking out together, say): only end
  // once there has actually been some distance to close.
  if (Number.isFinite(lastMeters) && lastMeters > 400 && !trip.wasApart) {
    try { sessionStorage.setItem(KEY, JSON.stringify({ ...trip, wasApart: true })); } catch (_) {}
    trip.wasApart = true;
  }
  if (trip.wasApart && Number.isFinite(lastMeters) && lastMeters <= TOGETHER_M) {
    endTrip('made it 🫶 trip mode is off');
    return;
  }
  render();
}

function render() {
  const bar = byId('trip-bar');
  if (!bar) return;
  const trip = readTrip();
  bar.classList.toggle('is-on', Boolean(trip));
  byId('trip-toggle').textContent = trip ? 'end trip' : '🚗 on my way';
  byId('trip-toggle').setAttribute('aria-pressed', trip ? 'true' : 'false');
  const partner = viewer === 'her' ? 'him' : 'her';
  const left = Number.isFinite(lastMeters) ? `${friendlyDistance(lastMeters)} to ${personName(partner)}` : `heading to ${personName(partner)}`;
  byId('trip-copy').textContent = trip
    ? `${left} · ${lock ? 'screen stays on' : 'keep this screen open'}`
    : `keeps the screen on for the trip, so ${personName(partner)} gets leaving, almost there and together pings`;
}

export function setupTrip(currentViewer) {
  viewer = currentViewer;
  byId('trip-toggle')?.addEventListener('click', () => (readTrip() ? endTrip('trip mode off') : startTrip()));
  // The browser drops the wake lock whenever the page is hidden; take it back
  // when the trip is still on and the page comes back.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && readTrip()) void holdScreen().then(render); });
  if (readTrip()) void holdScreen().then(render);
  render();
}
