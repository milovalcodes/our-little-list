// "currently haunting the website" — one heartbeat per page, not one per module.

let started = false;
let timer = null;

export function startPresence(data, viewer, page = 'somewhere') {
  if (started || !data || (viewer !== 'her' && viewer !== 'him')) return;
  started = true;

  const beat = () => {
    void data.setTo('presence', viewer, {
      person: viewer,
      lastSeenAt: Date.now(),
      page
    }).catch(() => {});
  };

  beat();
  timer = window.setInterval(beat, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
  window.addEventListener('focus', beat);
  window.addEventListener('pagehide', () => window.clearInterval(timer));
}
