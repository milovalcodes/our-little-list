import { sharedLayer, whenReady } from './data-hub.js';
import { applyProfileNames, cachedProfile, saveCachedProfile } from './profile-store.js';
import { viewerSide, awaitViewer } from './viewer.js';

applyEverywhere();

const data = await sharedLayer();

// Only listen once we know this account belongs here. An account that is not a
// member would have its read denied, stacking a permission error on top of the
// plain "not one of ours" message it is already being shown.
if (data.mode === 'local') {
  whenReady(data, listenForNames);
} else {
  awaitViewer().then(side => { if (side) listenForNames(); });
}

function listenForNames() {
  data.listenTo('profiles', items => {
    const profile = items.find(item => item.id === 'couple');
    if (profile) saveCachedProfile(profile);
  });
}

window.addEventListener('littlelist:profile', applyEverywhere);

function applyEverywhere() {
  applyProfileNames();
  const viewer = viewerSide() || document.body.dataset.viewer;
  if (viewer === 'her' || viewer === 'him') {
    const profile = cachedProfile();
    const name = viewer === 'her' ? (profile.sunName || 'Her') : (profile.moonName || 'Him');
    document.title = `For ${name} · Our Little List`;
  }
}
