// "currently haunting the website" — one heartbeat per page, not one per module.

let started = false;
let timer = null;

export function startPresence(data, viewer, page = 'somewhere') {
  if (started || !data || (viewer !== 'her' && viewer !== 'him')) return;
  started = true;

  // visibilitychange, focus and pageshow all fire when a PWA returns, and each
  // one used to cost a write. One beat per ten seconds is plenty for a dot that
  // means "here in the last two minutes".
  let lastBeatAt = 0;
  const beat = () => {
    if (Date.now() - lastBeatAt < 10000) return;
    lastBeatAt = Date.now();
    void data.setTo('presence', viewer, {
      person: viewer,
      lastSeenAt: Date.now(),
      page
    }).catch(() => {});
  };

  const arm = () => {
    window.clearInterval(timer);
    timer = window.setInterval(beat, 60000);
  };

  const wakeUp = () => { beat(); arm(); };

  wakeUp();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wakeUp(); });
  window.addEventListener('focus', beat);
  // pagehide is usually a freeze, not a close — phones put the page in the back
  // pocket and hand it back intact. Stopping the timer without restarting it on
  // the way back left presence permanently stuck at "last seen" on a page that
  // was in fact open.
  window.addEventListener('pagehide', () => window.clearInterval(timer));
  window.addEventListener('pageshow', wakeUp);
}
