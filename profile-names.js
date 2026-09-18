import { sharedLayer, whenReady } from './data-hub.js';
import { applyProfileNames, cachedProfile, saveCachedProfile } from './profile-store.js';

applyEverywhere();

const data = await sharedLayer();

whenReady(data, () => {
  data.listenTo('profiles', items => {
    const profile = items.find(item => item.id === 'couple');
    if (profile) saveCachedProfile(profile);
  });
});

window.addEventListener('littlelist:profile', applyEverywhere);

function applyEverywhere() {
  applyProfileNames();
  const viewer = document.body.dataset.viewer;
  if (viewer === 'her' || viewer === 'him') {
    const profile = cachedProfile();
    const name = viewer === 'her' ? (profile.sunName || 'Her') : (profile.moonName || 'Him');
    document.title = `For ${name} · Our Little List`;
  }
}
