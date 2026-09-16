import { createDataLayer } from './firebase-data.js';
import { setupAuthUI, applyViewerTheme, toast } from './ui-helpers.js';

const params = new URLSearchParams(window.location.search);
const viewer = params.get('as') === 'him' ? 'him' : 'her';
const byId = id => document.getElementById(id);
const other = viewer === 'her' ? 'him' : 'her';
let minutes = 15;
let locations = [];
let watchId = null;
let shareUntil = 0;
let lastSaved = null;
let expiryTimer = null;
let data;
let map;
const markers = {};
let lastMapLocations = [];
let lastFrameSignature = '';
let mapWasMoved = false;
let framingMap = false;
let mapResizeObserver = null;

applyViewerTheme(viewer);
document.querySelector('.back-to-side').href = `${viewer}.html`;
initializeMap();

data = await createDataLayer({
  collectionName: 'locations',
  onItems(nextLocations) {
    locations = nextLocations;
    renderLocations();
  },
  onAuth(user) {
    setupAuthUI(data, user);
  }
});

if (data.mode === 'local') setupAuthUI(data, { local: true });

document.querySelectorAll('.duration-chip').forEach(button => {
  button.addEventListener('click', () => {
    minutes = Number(button.dataset.minutes);
    document.querySelectorAll('.duration-chip').forEach(chip => chip.classList.toggle('active', chip === button));
  });
});

byId('share-location').addEventListener('click', startSharing);
byId('stop-sharing').addEventListener('click', () => stopSharing(true));
byId('hide-last-location').addEventListener('click', () => stopSharing(true));
byId('recenter-map').addEventListener('click', () => {
  mapWasMoved = false;
  byId('recenter-map').hidden = true;
  frameLocations(lastMapLocations, true);
});
window.addEventListener('pagehide', () => {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
});

function startSharing() {
  const error = byId('location-error');
  error.textContent = '';
  if (!navigator.geolocation) {
    error.textContent = 'location is not available on this phone.';
    return;
  }
  if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    error.textContent = 'open the live website to share location.';
    return;
  }

  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  shareUntil = Date.now() + minutes * 60 * 1000;
  setSharingState(true);
  expiryTimer = window.setTimeout(() => stopSharing(false, true), minutes * 60 * 1000);
  watchId = navigator.geolocation.watchPosition(savePosition, handleLocationError, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000
  });
}

async function savePosition(position) {
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
    await data.set(viewer, point);
    byId('location-error').textContent = '';
  } catch (_) {
    byId('location-error').textContent = 'location update failed. trying again.';
  }
}

function handleLocationError(problem) {
  const messages = {
    1: 'location is off. allow it in your phone settings.',
    2: 'your phone cannot find you right now.',
    3: 'that took too long. try again.'
  };
  byId('location-error').textContent = messages[problem.code] || 'location sharing failed.';
  stopSharing(false);
}

async function stopSharing(removeSpot, expired = false) {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  window.clearTimeout(expiryTimer);
  expiryTimer = null;
  shareUntil = 0;
  lastSaved = null;
  setSharingState(false);
  if (removeSpot) {
    try {
      await data.remove(viewer);
      toast('location off 👍');
    } catch (_) {
      byId('location-error').textContent = 'could not remove it. try again.';
    }
  } else if (expired) {
    toast('live sharing ended. last spot kept.');
  }
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
  if (watchId === null) {
    byId('share-location').hidden = false;
    byId('share-location').textContent = mineLive ? 'Resume live updates' : mineKnown ? 'Share again' : 'Share my spot';
    byId('stop-sharing').hidden = !mineLive;
    byId('hide-last-location').hidden = !mineKnown || Boolean(mineLive);
    byId('share-title').textContent = mineLive ? 'Still sharing' : mineKnown ? 'Last location saved' : 'Not sharing';
  }
  updateMap(known, now);
  renderLastKnown(known, active);

  if (!knownHer && !knownHim) {
    setProximity('Need both locations', 'one of you has to go first.', 'distance report');
    byId('map-updated').textContent = 'Nobody here yet';
    return;
  }
  const newest = Math.max(...known.map(item => item.updatedAt || 0));
  byId('map-updated').textContent = newest ? `newest ${timeAgo(newest)}` : 'last known';

  if (her && him) {
    renderLiveDistance(her, him);
    return;
  }

  if (knownHer && knownHim) {
    const meters = distanceMeters(knownHer, knownHim);
    const detail = `About ${friendlyDistance(meters)} apart then · ${lastSeenSummary(knownHer, now)} · ${lastSeenSummary(knownHim, now)}`;
    setProximity('Last known locations', detail, 'old news');
    return;
  }

  if (her || him) {
    const present = her ? 'her' : 'him';
    setProximity(`Waiting for ${present === 'her' ? 'him' : 'her'}…`, `${present === viewer ? 'you are' : 'they are'} on the map.`, 'one down, one to go');
    return;
  }

  const lastPerson = knownHer ? 'her' : 'him';
  const lastPoint = knownHer || knownHim;
  setProximity('One old pin', `${lastPerson === viewer ? 'your' : 'their'} last spot was ${timeAgo(lastPoint.updatedAt)}.`, 'last known');
}

function renderLiveDistance(her, him) {
  const meters = distanceMeters(her, him);
  const friendly = friendlyDistance(meters);
  if (meters <= 75) setProximity('together at last :)', `${friendly} apart. basically touching.`, 'made it');
  else if (meters <= 500) setProximity('almost together', `${friendly} to go.`, 'so close');
  else if (meters <= 2000) setProximity('getting closer', `${friendly} between you.`, 'on the way');
  else if (meters <= 10000) setProximity('on the way', `${friendly} between you.`, 'getting there');
  else setProximity('far away. rude.', `${friendly} between you.`, 'tragic');
}

function renderLastKnown(known, active) {
  byId('last-known-row').innerHTML = ['her', 'him'].map(person => {
    const point = known.find(item => item.id === person);
    if (!point) return `<span class="known-pill missing"><b>${person}</b> no spot yet</span>`;
    const live = active.some(item => item.id === person);
    return `<span class="known-pill ${live ? 'live' : 'last'}"><b>${person}</b> ${live ? 'live now' : `last seen ${timeAgo(point.updatedAt)}`}</span>`;
  }).join('');
}

function lastSeenSummary(point, now) {
  const live = Number(point.shareUntil) > now;
  return `${point.id} ${live ? 'live now' : `last seen ${timeAgo(point.updatedAt)}`}`;
}

function setProximity(message, detail, label) {
  byId('proximity-message').textContent = message;
  byId('proximity-detail').textContent = detail;
  byId('distance-label').textContent = label;
}

function initializeMap() {
  if (!window.L) {
    byId('couple-map').innerHTML = '<p class="map-fallback">map failed. classic.</p>';
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
  if ('ResizeObserver' in window) {
    mapResizeObserver = new ResizeObserver(refreshMapSize);
    mapResizeObserver.observe(mapNode);
  }
}

function updateMap(known, now) {
  if (!map) return;
  lastMapLocations = known;
  ['her', 'him'].forEach(person => {
    const point = known.find(item => item.id === person);
    if (!point && markers[person]) {
      map.removeLayer(markers[person]);
      delete markers[person];
    }
    if (!point) return;
    const isLive = Number(point.shareUntil) > now;
    const icon = markerIcon(person, isLive);
    if (!markers[person]) {
      markers[person] = window.L.marker([point.lat, point.lng], { icon }).addTo(map).bindTooltip(isLive ? person : `${person} · last known`, { direction: 'top', offset: [0, -42] });
      markers[person].isLive = isLive;
    } else {
      markers[person].setLatLng([point.lat, point.lng]);
      if (markers[person].isLive !== isLive) {
        markers[person].setIcon(icon);
        markers[person].setTooltipContent(isLive ? person : `${person} · last known`);
        markers[person].isLive = isLive;
      }
    }
  });

  const frameSignature = known.map(point => `${point.id}:${Number(point.lat).toFixed(5)}:${Number(point.lng).toFixed(5)}`).sort().join('|');
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
    const bounds = window.L.latLngBounds(known.map(point => [point.lat, point.lng]));
    map.fitBounds(bounds.pad(0.35), { maxZoom: 17, animate });
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

function friendlyDuration(value) {
  if (value < 60) return `${value} minutes`;
  return value === 60 ? '1 hour' : `${value / 60} hours`;
}

function timeAgo(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

window.setInterval(renderLocations, 15000);
