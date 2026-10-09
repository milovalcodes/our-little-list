import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme } from './ui-helpers.js';

// Signed-in side, theme, and the return link should never drift between pages.
export async function bootPage({ onAuth } = {}) {
  const data = await sharedLayer();
  const showAuth = user => { setupAuthUI(data, user); onAuth?.(user, data); };
  onAuthChange(showAuth);
  if (data.mode === 'local') showAuth({ local: true });
  const viewer = await awaitViewer();
  if (!viewer) { showNotAMember(); await new Promise(() => {}); }
  applyViewerTheme(viewer);
  // Every signed-in destination, including Activities and Settings, can show
  // a partner's ping. ES modules keep this singleton on legacy script pages.
  void import('./live-notes.js');
  document.querySelectorAll('.back-to-side').forEach(back => { back.href = `${viewer}.html`; });
  return { data, viewer, other: partnerOf(viewer) };
}
