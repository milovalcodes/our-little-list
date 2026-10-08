// One calendar for pages, background notifications and the installed app icon.
// Classic script so a service worker can use it without a build step.
(function (scope) {
  function seasonForDate(date = new Date()) {
    const month = Number(new Intl.DateTimeFormat('en-US', {
      month: 'numeric', timeZone: 'America/New_York'
    }).format(date));
    return month === 10 ? 'spooky' : month === 12 ? 'christmas' : 'normal';
  }
  function forSeason(season) {
    const festive = season === 'spooky' || season === 'christmas';
    return Object.freeze({
      sun: festive ? `sun-profile-${season}.png` : 'sun-profile.png',
      moon: festive ? `moon-profile-${season}.png` : 'moon-profile.png',
      pair: festive ? `sun-moon-${season}.png` : 'sun-moon-personalized.png',
      icon: festive ? `icon-${season}-192.png` : 'icon-192.png',
      apple: festive ? `icon-${season}-180.png` : 'sun-moon-personalized.png',
      badge: festive ? `notification-badge-${season}.png` : 'notification-badge.png',
      notification: festive ? `icon-${season}-192.png` : 'notification-icon.png',
      theme: season === 'spooky' ? '#302444' : season === 'christmas' ? '#1d4a4b' : '#18264c',
      background: season === 'spooky' ? '#302444' : season === 'christmas' ? '#1d4a4b' : '#fff7df'
    });
  }
  function manifest(base, date = new Date()) {
    const assets = forSeason(seasonForDate(date));
    return { ...base, id: './index.html', theme_color: assets.theme,
      background_color: assets.background, icons: [
        { src: assets.icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: assets.pair, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: assets.pair, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ] };
  }
  scope.LittleSeasonAssets = Object.freeze({ seasonForDate, forSeason, manifest });
})(globalThis);
