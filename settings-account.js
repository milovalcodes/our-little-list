// Signing out lives in Settings now, behind a second tap. It used to be the
// top-left button on home, exactly where every other page has "← back".

import { sharedLayer } from './data-hub.js';
import { awaitViewer } from './viewer.js';
import { forgetPushSubscription } from './push-client.js';
import { personName } from './profile-store.js';

const button = document.getElementById('sign-out');
const data = await sharedLayer();
const viewer = await awaitViewer();

function paintAccount() {
  const status = document.getElementById('account-status');
  if (status && viewer) status.textContent = `as ${personName(viewer)} (${viewer === 'her' ? 'the sun' : 'the moon'})`;
}
paintAccount();
window.addEventListener('littlelist:profile', paintAccount);

let armed = null;
button?.addEventListener('click', async () => {
  if (!armed) {
    button.textContent = 'tap again to sign out';
    button.classList.add('confirming');
    armed = window.setTimeout(() => { armed = null; button.textContent = 'sign out'; button.classList.remove('confirming'); }, 4000);
    return;
  }
  window.clearTimeout(armed);
  button.disabled = true;
  button.textContent = 'signing out…';
  // Drop this phone's push registration first, while the rules still let us:
  // otherwise it keeps answering for whoever just left. Bounded, because a
  // phone that thinks it is online but is not leaves that write pending
  // forever, and the button used to sit at "signing out…" with no way off the
  // account. A registration left behind is claimed by the next sign-in.
  if (viewer) {
    await Promise.race([
      forgetPushSubscription(data, viewer),
      new Promise(resolve => window.setTimeout(resolve, 2500))
    ]);
  }
  try { await data.signOut(); } catch (_) { /* already gone */ }
  try {
    if (viewer) localStorage.removeItem(`our-little-list-seen-${viewer}`);
    localStorage.removeItem('our-little-list-side');
  } catch (_) {}
  location.replace('index.html');
});
