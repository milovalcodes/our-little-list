import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, toast, setButtonBusy, showFailure, escapeHtml } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { timeAgo, friendlyDuration } from './time-format.js';

const byId = id => document.getElementById(id);

let minutes = 15;
let locations = [];
let watchId = null;
let shareUntil = 0;
let lastSaved = null;
let consecutiveErrors = 0;
let retryTimer = null;
let map;
const markers = {};
let lastMapLocations = [];
let lastFrameSignature = '';
let mapWasMoved = false;
let framingMap = false;

const data = await sharedLayer();
onAuthChange(user => setupAuthUI(data, user));
if (data.mode === 'local') setupAuthUI(data, { local: true });

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const viewer = await awaitViewer();
if (!viewer) { showNotAMember(); await new Promise(() => {}); }

applyViewerTheme(viewer);
document.querySelector('.back-to-side').href = `${viewer}.html`;
initializeMap();

data.listenTo('locations', next => {
  locations = next;
  renderLocations();
});

document.querySelectorAll('.duration-chip').forEach(button => {
  button.addEventListener('click', () => {
    minutes = Number(button.dataset.minutes);
    document.querySelectorAll('.duration-chip').forEach(chip => chip.classList.toggle('active', chip === button));
    if (isSharing()) {
      // Changing the window mid-session should extend it, not be ignored.
      shareUntil = Date.now() + minutes * 60 * 1000;
      setSharingState(true);
    }
  });
});

byId('share-location').addEventListener('click', () => startSharing());
byId('stop-sharing').addEventListener('click', () => stopSharing({ removeSpot: false }));
byId('hide-last-location').addEventListener('click', () => stopSharing({ removeSpot: true }));
byId('recenter-map').addEventListener('click', () => {
  mapWasMoved = false;
  byId('recenter-map').hidden = true;
  frameLocations(lastMapLocations, true);
});

window.addEventListener('pagehide', () => clearWatch());

// Phones suspend watchPosition when the page goes to the background and often
// never resume it. The old build kept insisting it was "Sharing for 1 hour"
// while nothing was being sent. Re-arm whenever we come back.
document.addEventListener('visibilitychange', () => {
  if (document.hidden || !isSharing()) return;
  armWatch();
  renderLocations();
});
window.addEventListener('focus', () => { if (isSharing()) armWatch(); });

function isSharing() {
  return shareUntil > Date.now();
}

function clearWatch() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  window.clearTimeout(retryTimer);
  retryTimer = null;
}

function armWatch() {
  clearWatch();
  watchId = navigator.geolocation.watchPosition(savePosition, handleLocationError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 20000
  });
}

function startSharing() {
  const error = byId('location-error');
  error.textContent = '';

  if (!navigator.geolocation) {
    error.textContent = 'location is not available on this phone.';
    showFailure('location is not available on this phone.', 'try another browser or check that Location Services are on.');
    return;
  }
  if (!window.isSecureContext) {
    error.textContent = 'open the live website to share location.';
    showFailure('location only works on the secure live website.', 'open the GitHub Pages link, then try again.');
    return;
  }

  consecutiveErrors = 0;
  shareUntil = Date.now() + minutes * 60 * 1000;
  setButtonBusy(byId('share-location'), true, 'finding you…');
  setSharingState(true);
  armWatch();
}

async function savePosition(position) {
  consecutiveErrors = 0;
  byId('location-error').textContent = '';

  // The sharing window is checked against the clock rather than a setTimeout,
  // which phones throttle or drop entirely while the page is backgrounded.
  if (!isSharing()) {
    stopSharing({ removeSpot: false, expired: true });
    return;
  }

  const point = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    updatedAt: Date.now(),
    shareUntil,
    person: viewer
  };
  if (lastSaved && Date.now() - lastSaved.updatedAt < 8000 && distanceMeters(lastSaved, point) < 10) return;
  lastSaved = point;

  try {
    await data.setTo('locations', viewer, point);
    setButtonBusy(byId('share-location'), false);
  } catch (_) {
    byId('location-error').textContent = 'location update failed. trying again.';
  }
}

function handleLocationError(problem) {
  setButtonBusy(byId('share-location'), false);

  // A permission refusal is final. A timeout or a temporary position failure is
  // just a phone walking into a building — the old build ended the whole
  // session on any error at all.
  if (problem.code === 1) {
    byId('location-error').textContent = 'location is off. allow it in your phone settings.';
    showFailure('location is off.', 'open the phone checker and allow Location, then try again.');
    stopSharing({ removeSpot: false });
    return;
  }

  consecutiveErrors += 1;
  if (consecutiveErrors >= 5 || !isSharing()) {
    byId('location-error').textContent = 'your phone kept failing to find you. sharing stopped.';
    showFailure('your phone could not find you.', 'move near a window or outside, then tap share again.');
    stopSharing({ removeSpot: false });
    return;
  }

  byId('location-error').textContent = problem.code === 3
    ? `that took too long. trying again (${consecutiveErrors}/5).`
    : `your phone cannot find you right now. trying again (${consecutiveErrors}/5).`;

  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => { if (isSharing()) armWatch(); }, 5000 * consecutiveErrors);
}

async function stopSharing({ removeSpot = false, expired = false } = {}) {
  clearWatch();
  shareUntil = 0;
  lastSaved = null;
  consecutiveErrors = 0;
  setSharingState(false);

  if (removeSpot) {
    try {
      await data.removeFrom('locations', viewer);
      toast('location off 👍');
    } catch (_) {
      byId('location-error').textContent = 'could not remove it. try again.';
      showFailure('the last location did not clear.', 'check the internet and tap "hide my last spot" again.');
    }
  } else if (expired) {
    toast('live sharing ended. last spot kept.');
  }
  renderLocations();
}

function setSharingState(active) {
  byId('share-location').hidden = active;
  byId('stop-sharing').hidden = !active;
  byId('hide-last-location').hidden = true;
  byId('share-location').textContent = 'Share my spot';
  byId('share-title').textContent = active ? `Sharing for ${friendlyDuration(minutes)}` : 'Not sharing';
}

function renderLocations() {
  const now = Date.now();
  const known = locations.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  const active = known.filter(item => Number(item.shareUntil) > now);
  const her = active.find(item => item.id === 'her');
  const him = active.find(item => item.id === 'him');
  const knownHer = known.find(item => item.id === 'her');
  const knownHim = known.find(item => item.id === 'him');
  const mineKnown = known.find(item => item.id === viewer);
  const mineLive = active.find(item => item.id === viewer);

  if (!isSharing()) {
    byId('share-location').hidden = false;
    byId('share-location').textContent = mineLive ? 'Resume live updates' : mineKnown ? 'Share again' : 'Share my spot';
    byId('stop-sharing').hidden = true;
    byId('hide-last-location').hidden = !mineKnown;
    byId('share-title').textContent = mineLive ? 'Last shared' : mineKnown ? 'Last location saved' : 'Not sharing';
  }

  updateMap(known, now);
  renderLastKnown(known, active);

  if (!knownHer && !knownHim) {
    setProximity('Need both spots', 'one of us has to share first.', 'distance');
    byId('map-updated').textContent = 'Nobody here yet';
    return;
  }

  const newest = Math.max(...known.map(item => Number(item.updatedAt) || 0));
  byId('map-updated').textContent = newest ? `newest ${timeAgo(newest)}` : 'last known';

  if (her && him) {
    renderLiveDistance(her, him);
    return;
  }
  if (knownHer && knownHim) {
    const meters = distanceMeters(knownHer, knownHim);
    setProximity('Last known locations', `About ${friendlyDistance(meters)} apart then · ${lastSeenSummary(knownHer, now)} · ${lastSeenSummary(knownHim, now)}`, 'old news');
    return;
  }
  if (her || him) {
    const present = her ? 'her' : 'him';
    setProximity(
      `Waiting for ${personName(present === 'her' ? 'him' : 'her')}…`,
      `${present === viewer ? 'you are' : `${personName(present)} is`} on the map.`,
      'one down, one to go'
    );
    return;
  }

  const lastPoint = knownHer || knownHim;
  const lastPerson = knownHer ? 'her' : 'him';
  setProximity('One last spot', `${lastPerson === viewer ? 'your' : 'their'} last spot was ${timeAgo(lastPoint.updatedAt)}.`, 'last known');
}

function renderLiveDistance(her, him) {
  const meters = distanceMeters(her, him);
  const friendly = friendlyDistance(meters);
  if (meters <= 75) setProximity('together at last :)', `${friendly} apart.`, 'made it');
  else if (meters <= 500) setProximity('almost together', `${friendly} to go.`, 'so close');
  else if (meters <= 2000) setProximity('getting closer', `${friendly} between you.`, 'on the way');
  else if (meters <= 10000) setProximity('on the way', `${friendly} between you.`, 'getting there');
  else setProximity('still a bit away', `${friendly} between you.`, 'for now');
}

function renderLastKnown(known, active) {
  // Names come from a free-text field, so they get escaped like anything else.
  byId('last-known-row').innerHTML = ['her', 'him'].map(person => {
    const name = escapeHtml(personName(person));
    const point = known.find(item => item.id === person);
    if (!point) return `<span class="known-pill missing"><b>${name}</b> no spot yet</span>`;
    const live = active.some(item => item.id === person);
    return `<span class="known-pill ${live ? 'live' : 'last'}"><b>${name}</b> ${live ? 'live now' : `last seen ${escapeHtml(timeAgo(point.updatedAt))}`}</span>`;
  }).join('');
}

function lastSeenSummary(point, now) {
  const live = Number(point.shareUntil) > now;
  return `${personName(point.id)} ${live ? 'live now' : `last seen ${timeAgo(point.updatedAt)}`}`;
}

function setProximity(message, detail, label) {
  byId('proximity-message').textContent = message;
  byId('proximity-detail').textContent = detail;
  byId('distance-label').textContent = label;
}

function initializeMap() {
  if (!window.L) {
    byId('couple-map').innerHTML = '<p class="map-fallback">the map did not load. check the internet and reload.</p>';
    return;
  }
  const mapNode = byId('couple-map');
  map = window.L.map(mapNode, {
    zoomControl: false,
    attributionControl: true,
    dragging: true,
    touchZoom: true,
    bounceAtZoomLimits: false
  }).setView([39.5, -98.35], 3);
  window.L.control.zoom({ position: 'bottomright' }).addTo(map);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    keepBuffer: 4,
    updateWhenIdle: true,
    crossOrigin: true,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const rememberManualMove = () => {
    if (framingMap) return;
    mapWasMoved = true;
    byId('recenter-map').hidden = lastMapLocations.length === 0;
  };
  map.on('dragstart', rememberManualMove);
  map.on('zoomstart', rememberManualMove);

  const refreshMapSize = () => window.requestAnimationFrame(() => map?.invalidateSize({ animate: false, pan: false }));
  refreshMapSize();
  window.setTimeout(refreshMapSize, 250);
  window.addEventListener('resize', refreshMapSize, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(refreshMapSize, 250), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) window.setTimeout(refreshMapSize, 100);
  });
  if ('ResizeObserver' in window) new ResizeObserver(refreshMapSize).observe(mapNode);
}

function updateMap(known, now) {
  if (!map) return;
  lastMapLocations = known;

  ['her', 'him'].forEach(person => {
    const point = known.find(item => item.id === person);
    if (!point) {
      if (markers[person]) {
        map.removeLayer(markers[person]);
        delete markers[person];
      }
      return;
    }
    const isLive = Number(point.shareUntil) > now;
    const label = isLive ? personName(person) : `${personName(person)} · last known`;
    if (!markers[person]) {
      markers[person] = window.L.marker([point.lat, point.lng], { icon: markerIcon(person, isLive) })
        .addTo(map)
        .bindTooltip(label, { direction: 'top', offset: [0, -42] });
      markers[person].isLive = isLive;
    } else {
      markers[person].setLatLng([point.lat, point.lng]);
      if (markers[person].isLive !== isLive) {
        markers[person].setIcon(markerIcon(person, isLive));
        markers[person].isLive = isLive;
      }
      markers[person].setTooltipContent(label);
    }
  });

  const frameSignature = known
    .map(point => `${point.id}:${Number(point.lat).toFixed(5)}:${Number(point.lng).toFixed(5)}`)
    .sort()
    .join('|');
  if (!mapWasMoved && frameSignature !== lastFrameSignature) frameLocations(known, Boolean(lastFrameSignature));
  lastFrameSignature = frameSignature;
  if (known.length === 0) byId('recenter-map').hidden = true;
}

function frameLocations(known, animate = false) {
  if (!map || known.length === 0) return;
  framingMap = true;
  map.stop();
  if (known.length === 1) {
    map.setView([known[0].lat, known[0].lng], 15, { animate });
  } else {
    map.fitBounds(window.L.latLngBounds(known.map(point => [point.lat, point.lng])).pad(0.35), { maxZoom: 17, animate });
  }
  window.setTimeout(() => { framingMap = false; }, animate ? 400 : 50);
}

function markerIcon(person, isLive) {
  const artwork = person === 'her'
    ? `<svg class="map-character" viewBox="0 0 48 48" aria-hidden="true">
        <g class="sun-rays" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.8">
          <path d="M24 3v5M24 40v5M3 24h5M40 24h5M9.2 9.2l3.6 3.6M35.2 35.2l3.6 3.6M38.8 9.2l-3.6 3.6M12.8 35.2l-3.6 3.6"/>
        </g>
        <circle cx="24" cy="24" r="13.5" fill="#ffd45e" stroke="currentColor" stroke-width="2"/>
        <path d="M17.2 23c1.3-1.2 3.2-1.2 4.5 0M26.3 23c1.3-1.2 3.2-1.2 4.5 0M20 28.2c2.5 2.2 5.5 2.2 8 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>
      </svg>`
    : `<svg class="map-character" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M33.8 6.2c-8.7 1.3-15.3 8.8-15.3 17.8 0 9.1 6.7 16.6 15.5 17.8A19 19 0 1 1 33.8 6.2Z" fill="#cbd4ff" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/>
        <path d="M15.3 21.8c1.3-1.1 3.1-1.1 4.4 0M14.7 20l-1.5-1M20.3 20l1.5-1M14.7 27.6c1.8 1.7 3.9 1.7 5.7 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>
        <circle cx="35.8" cy="13" r="1.25" fill="#fff3bd"/><circle cx="39" cy="19" r=".8" fill="#fff3bd"/>
      </svg>`;
  return window.L.divIcon({
    className: 'couple-marker-wrap',
    html: `<span class="couple-marker ${person} ${isLive ? 'live' : 'last-known'}">${artwork}</span>`,
    iconSize: [52, 52],
    iconAnchor: [26, 48]
  });
}

function distanceMeters(a, b) {
  const radius = 6371000;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * Math.PI / 180;
  const deltaLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function friendlyDistance(meters) {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

window.setInterval(renderLocations, 15000);
window.addEventListener('littlelist:profile', renderLocations);
