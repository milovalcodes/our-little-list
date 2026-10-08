// Old addresses, and where those things live now. GitHub Pages answers a page
// that no longer exists with 404.html, which loads this file and forwards you;
// the service worker loads it too, so a queued notification or an offline
// bookmark for an old address still opens the right place. This one list
// replaces seven separate one-line redirect pages.
(function (scope) {
  const OLD_PAGES = {
    'activity.html': 'today.html#new',
    'admire.html': 'status.html#partner',
    'help.html': 'tasks.html#asks',
    'reminders.html': 'tasks.html#asks',
    'notifications.html': 'phone-check.html#pings',
    'location.html': 'status.html',
    'profiles.html': 'phone-check.html#names'
  };
  // These two always passed their query (?as=her) along; the rest never did.
  const KEEPS_QUERY = ['location.html', 'profiles.html'];
  // Returns the new absolute address for an old one, or '' if it is not old.
  // The old hash only carries over when the new home names no section.
  scope.oldPageTarget = function (href) {
    const url = new URL(href, scope.location.href);
    const name = url.pathname.split('/').pop();
    if (name === 'games.html' || (name === 'today.html' && /^(?:#game(?:-[A-Za-z0-9_-]+)?|#question)$/.test(url.hash))) {
      const next = new URL('activities.html', url);
      next.search = url.search; next.hash = url.hash;
      return next.href;
    }
    const target = OLD_PAGES[name];
    if (!target) return '';
    const [page, hash] = target.split('#');
    const next = new URL(page, url);
    if (KEEPS_QUERY.includes(name)) next.search = url.search;
    // Queued notifications may still name a record on a retired page.
    // Keep that record, rather than replacing it with a generic tab.
    const itemHash = /^(?:#(?:ask|item|done|note|date|memory)-[A-Za-z0-9_-]+)$/.test(url.hash);
    next.hash = itemHash ? url.hash : hash ? `#${hash}` : url.hash;
    return next.href;
  };
})(self);
