// First run on a new phone. Nothing used to point at the permissions: the
// location prompt appeared with no explanation, and notifications could only
// be switched on from a page buried in More. Home now says what is missing
// and links to Settings, where each one has its own button.

import { locationPermissionState, LOCATION_ASKED_KEY } from './auto-location.js';
import { isStandalone, isApplePhone } from './device-mode.js';

const LATER_KEY = 'our-little-list-setup-later';
const LATER_MS = 3 * 24 * 60 * 60 * 1000;

const standalone = isStandalone();
const iPhone = isApplePhone();

async function missing() {
  const list = [];
  if (iPhone && !standalone) list.push('add it to your Home Screen');
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') list.push('turn on pings');
  let asked = false;
  try { asked = Boolean(localStorage.getItem(LOCATION_ASKED_KEY)); } catch (_) {}
  if (!asked && await locationPermissionState() === 'prompt') list.push('turn on location');
  return list;
}

async function show() {
  try { if (Date.now() - Number(localStorage.getItem(LATER_KEY) || 0) < LATER_MS) return; } catch (_) {}
  const todo = await missing();
  if (!todo.length || document.querySelector('.setup-nudge')) return;
  const card = document.createElement('aside');
  card.className = 'setup-nudge';
  card.innerHTML = '<span aria-hidden="true">✦</span><div><strong>finish setting up this phone</strong><small></small></div><a href="phone-check.html">set up →</a><button type="button" aria-label="Remind me later">×</button>';
  card.querySelector('small').textContent = todo.join(' · ');
  card.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch (_) {}
    card.remove();
  });
  document.querySelector('.dashboard-shell')?.prepend(card);
}

void show();
