// The two phones share one calendar, even if one of us is travelling.
// Keep this tiny and synchronous so the right palette is picked before CSS paints.
(function () {
  const root = document.documentElement;
  const seasonalCopy = {
    spooky: {
      mark: '🎃',
      art: 'seasonal-spooky.svg',
      home: '🎃 our sky · spooky season',
      gameLine: 'a little spooky rivalry',
      landingKicker: 'our little app · spooky season ☀︎☾',
      landingLine: 'same two weirdos, now with bats ♡',
      pages: {
        tasks: 'spooky little errands',
        notes: 'mail from this plane of existence',
        today: 'the october pile',
        activities: 'a little spooky rivalry',
        status: 'currently haunting',
        dates: 'plans after dark',
        memories: 'evidence we survived october',
        'phone-check': 'the mildly haunted controls',
        guide: 'field guide to this little haunting'
      },
      empty: {
        'today-empty': 'No tiny horrors today',
        'activity-empty': 'Nothing new lurking',
        'note-inbox-empty': 'No notes from beyond (yet)',
        'date-empty': 'No after-dark plans yet',
        'memory-empty': 'No October evidence yet'
      },
      placeholders: {
        'status-text': 'song, snack, spooky little thought…',
        'date-title': 'midnight pancakes',
        'memory-text': 'something worth haunting the jar with',
        'focus-label': 'what are we exorcising today?'
      }
    },
    christmas: {
      mark: '🎄',
      art: 'seasonal-christmas.svg',
      home: '🎄 our sky · december edition',
      gameLine: 'a little snow-day rivalry',
      landingKicker: 'our little app · december edition ☀︎☾',
      landingLine: 'same two weirdos, now with lights ♡',
      pages: {
        tasks: 'winter errands and tiny plans',
        notes: 'warm little notes',
        today: 'the december pile',
        activities: 'a little snow-day rivalry',
        status: 'snowed in or on the move?',
        dates: 'plans worth leaving the blanket for',
        memories: 'kept warm in here',
        'phone-check': 'the cozy controls',
        guide: 'field guide to the snow globe'
      },
      empty: {
        'today-empty': 'All clear. Blanket time.',
        'activity-empty': 'All quiet for now',
        'note-inbox-empty': 'No notes under the tree yet',
        'date-empty': 'No winter plans yet',
        'memory-empty': 'The winter jar is empty'
      },
      placeholders: {
        'status-text': 'song, snack, snow-day thought…',
        'date-title': 'hot chocolate and a walk',
        'memory-text': 'something worth keeping warm',
        'focus-label': 'what are we wrapping up today?'
      }
    }
  };

  function seasonForDate(date) {
    return globalThis.LittleSeasonAssets.seasonForDate(date);
  }

  function dressImage(image) {
    const source = image.getAttribute('src') || '';
    const assets = globalThis.LittleSeasonAssets.forSeason(root.dataset.season);
    // Only our own character art, never photos or an emoji chosen by either person.
    const match = source.match(/^(?:\.\/)?(sun-profile|moon-profile|sun-moon)(?:-personalized|-spooky|-christmas)?\.png$/);
    if (!match) return;
    const target = match[1] === 'sun-profile' ? assets.sun : match[1] === 'moon-profile' ? assets.moon : assets.pair;
    if (source !== target) image.setAttribute('src', target);
  }

  function paintAssets() {
    if (!document.head) return;
    const assets = globalThis.LittleSeasonAssets.forSeason(root.dataset.season);
    for (const image of document.querySelectorAll('img')) dressImage(image);
    for (const [selector, target] of [
      ['link[rel="icon"]', assets.icon], ['link[rel="apple-touch-icon"]', assets.apple]
    ]) for (const link of document.querySelectorAll(selector)) {
      if (link.getAttribute('href') !== target) link.setAttribute('href', target);
    }
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      if (!meta.dataset.seasonOriginalColor) meta.dataset.seasonOriginalColor = meta.content;
      meta.content = root.dataset.season === 'normal' ? meta.dataset.seasonOriginalColor : assets.theme;
    }
  }

  function startArtwork() {
    paintAssets();
    // Profiles, focus sheets and settings render after the first page paint.
    // Visit only new images rather than rescanning the page on every status tick.
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') dressImage(record.target);
        else for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches('img')) dressImage(node);
          for (const image of node.querySelectorAll('img')) dressImage(image);
        }
      }
    });
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src'] });
  }

  function setCopy(node, text, property = 'textContent') {
    if (!node) return;
    const originalKey = property === 'placeholder' ? 'seasonOriginalPlaceholder' : 'seasonOriginalText';
    if (!(originalKey in node.dataset)) node.dataset[originalKey] = node[property];
    node[property] = text ?? node.dataset[originalKey];
  }

  function setArt(parent, className, art, before = null) {
    if (!parent) return;
    let image = parent.querySelector(`.${className}`);
    if (!art) { image?.remove(); return; }
    if (!image) {
      image = document.createElement('img');
      image.className = className;
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.draggable = false;
      if (before) parent.insertBefore(image, before);
      else parent.append(image);
    }
    if (image.getAttribute('src') !== art) image.src = art;
  }

  function paintCopy() {
    if (!document.body) return;
    const copy = seasonalCopy[root.dataset.season];
    setCopy(document.querySelector('.sky-heading .tiny-kicker'), copy?.home);
    setCopy(document.querySelector('.game-room-intro h2'), copy?.gameLine);
    setCopy(document.querySelector('.landing-copy .tiny-kicker'), copy?.landingKicker);
    setCopy(document.querySelector('.landing-copy > p:last-child'), copy?.landingLine);
    for (const id of ['today-empty', 'activity-empty', 'note-inbox-empty', 'date-empty', 'memory-empty']) {
      setCopy(document.querySelector(`#${id} strong`), copy?.empty[id]);
    }
    for (const id of ['status-text', 'date-title', 'memory-text', 'focus-label']) {
      setCopy(document.getElementById(id), copy?.placeholders[id], 'placeholder');
    }

    const hero = document.querySelector('.feature-shell > .feature-hero');
    let whisper = document.querySelector('.seasonal-whisper');
    const line = copy?.pages[document.body.dataset.app];
    if (hero && line) {
      if (!whisper) { whisper = document.createElement('p'); whisper.className = 'seasonal-whisper'; hero.after(whisper); }
      whisper.textContent = `${copy.mark} ${line}`;
    } else whisper?.remove();

    setArt(document.getElementById('sky-stage'), 'seasonal-sky-art', copy?.art);
    const landing = document.querySelector('.landing-copy');
    setArt(landing, 'seasonal-landing-art', copy?.art, landing?.querySelector('.landing-pair'));
  }

  function refresh(now = new Date()) {
    const season = seasonForDate(now);
    if (root.dataset.season !== season) root.dataset.season = season;
    paintCopy();
    paintAssets();
    return season;
  }

  root.dataset.season = seasonForDate(new Date());
  window.LittleSeason = { seasonForDate, refresh, get current() { return root.dataset.season; } };
  paintAssets();
  function start() { paintCopy(); startArtwork(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.setInterval(refresh, 60_000);
})();
