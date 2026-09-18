// Which side you are on now comes from the account you signed in with, not from
// a ?as= parameter anyone could retype.

import { sharedLayer, onAuthChange } from './data-hub.js';
import { sideForUid } from './household.js';

const params = new URLSearchParams(location.search);

let settle;
const ready = new Promise(resolve => { settle = resolve; });
let settled = false;
let side = null;

const data = await sharedLayer();

if (data.mode === 'local') {
  // No accounts to read when sync is off, so fall back to the URL hint. This
  // path is for local preview only.
  side = params.get('as') === 'him' || params.get('from') === 'him' ? 'him' : 'her';
  settled = true;
  settle(side);
} else {
  onAuthChange(user => {
    side = user ? sideForUid(user.uid) : null;
    if (user && !settled) {
      settled = true;
      settle(side);
    }
  });
}

// Resolves once somebody is signed in. Returns their side, or null when the
// account is not one of the two members.
export function awaitViewer() {
  return ready;
}

export function viewerSide() {
  return side;
}

export function partnerOf(person) {
  return person === 'her' ? 'him' : person === 'him' ? 'her' : null;
}

// Shown when a real account signs in that this household does not know about.
export function showNotAMember() {
  document.querySelector('.thinking-screen')?.remove();
  const card = document.createElement('aside');
  card.className = 'auth-gate';
  card.innerHTML = `<div class="auth-card">
    <span class="auth-icon">☀︎☾</span>
    <p class="tiny-kicker">hmm</p>
    <h2>this account is not one of ours</h2>
    <p>it signed in fine, but it is not the sun or the moon. sign in with the right one.</p>
    <button class="primary-action" type="button">sign out</button>
  </div>`;
  card.querySelector('button').addEventListener('click', async () => {
    const data = await sharedLayer();
    await data.signOut().catch(() => {});
    location.reload();
  });
  document.body.append(card);
}
