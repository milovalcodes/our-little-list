// The front door used to be a two-button picker, which made sense when both
// phones shared one login. Now the account decides the side, so this just sends
// you to yours.

import { sharedLayer, onAuthChange } from './data-hub.js';
import { setupAuthUI } from './ui-helpers.js';
import { awaitViewer, showNotAMember } from './viewer.js';

const note = document.getElementById('entry-note');

const data = await sharedLayer();
onAuthChange(user => {
  setupAuthUI(data, user);
  if (note) note.textContent = user ? 'one second…' : '';
});
if (data.mode === 'local') setupAuthUI(data, { local: true });

const viewer = await awaitViewer();
if (!viewer) {
  showNotAMember();
} else {
  if (note) note.textContent = viewer === 'her' ? 'hi sunshine ☀️' : 'hi moon 🌙';
  location.replace(`${viewer}.html`);
}
