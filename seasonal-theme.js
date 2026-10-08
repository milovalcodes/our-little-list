// The two phones share one calendar, even if one of us is travelling.
// Keep this tiny and synchronous so the right palette is picked before CSS paints.
(function () {
  const root = document.documentElement;
  const seasonalCopy = {
    spooky: {
      mark: '🦇',
      home: 'our sky · minor haunting',
      landingKicker: 'our little list · october edition ☀︎☾',
      landingLine: 'slightly haunted, still ours ♡',
      pages: {
        tasks: 'spooky little errands',
        notes: 'mail from this plane of existence',
        today: 'the october pile',
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
      mark: '❄',
      home: 'our sky · snow globe mode',
      landingKicker: 'our little list · december edition ☀︎☾',
      landingLine: 'extra cozy, still ours ♡',
      pages: {
        tasks: 'winter errands and tiny plans',
        notes: 'warm little notes',
        today: 'the december pile',
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
    let month;
    try { month = Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'America/New_York' }).format(date)); }
    catch (_) { month = date.getMonth() + 1; }
    return month === 10 ? 'spooky' : month === 12 ? 'christmas' : 'normal';
  }

  function setCopy(node, text, property = 'textContent') {
    if (!node) return;
    const originalKey = property === 'placeholder' ? 'seasonOriginalPlaceholder' : 'seasonOriginalText';
    if (!(originalKey in node.dataset)) node.dataset[originalKey] = node[property];
    node[property] = text ?? node.dataset[originalKey];
  }

  function paintCopy() {
    if (!document.body) return;
    const copy = seasonalCopy[root.dataset.season];
    setCopy(document.querySelector('.sky-heading .tiny-kicker'), copy?.home);
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

    const stage = document.getElementById('sky-stage');
    let mark = document.querySelector('.seasonal-sky-mark');
    if (stage && copy) {
      if (!mark) { mark = document.createElement('span'); mark.className = 'seasonal-sky-mark'; mark.setAttribute('aria-hidden', 'true'); stage.append(mark); }
      mark.textContent = copy.mark;
    } else mark?.remove();
  }

  function refresh(now = new Date()) {
    const season = seasonForDate(now);
    if (root.dataset.season !== season) root.dataset.season = season;
    paintCopy();
    return season;
  }

  root.dataset.season = seasonForDate(new Date());
  window.LittleSeason = { seasonForDate, refresh, get current() { return root.dataset.season; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintCopy, { once: true });
  else paintCopy();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.setInterval(refresh, 60_000);
})();
