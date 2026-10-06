// A small first-run nudge for phone pings. Location is optional and stays in
// Settings; declining it should not make Home say setup is unfinished.

import { isStandalone, isApplePhone } from './device-mode.js';

const LATER_KEY = 'our-little-list-setup-later';
const LATER_MS = 3 * 24 * 60 * 60 * 1000;

const standalone = isStandalone();
const iPhone = isApplePhone();

async function missing() {
  const list = [];
  if (iPhone && !standalone) list.push('add it to your Home Screen');
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') list.push('turn on pings');
  return list;
}

async function show() {
  try { if (Date.now() - Number(localStorage.getItem(LATER_KEY) || 0) < LATER_MS) return; } catch (_) {}
  const todo = await missing();
  if (!todo.length || document.querySelector('.setup-nudge')) return;
  const card = document.createElement('aside');
  card.className = 'setup-nudge';
  card.innerHTML = '<span aria-hidden="true">✦</span><div><strong>this phone might miss pings</strong><small></small></div><a href="phone-check.html">set up →</a><button type="button" aria-label="Remind me later">×</button>';
  card.querySelector('small').textContent = todo.join(' · ');
  card.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch (_) {}
    card.remove();
  });
  // It sits in Next up with everything else that wants a moment of yours, not
  // as a banner above the sky.
  document.querySelector('.home-next-up')?.append(card);
}

void show();
