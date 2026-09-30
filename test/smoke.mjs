import { chromium } from 'playwright';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://127.0.0.1:8777';
const START = Date.now();
// The sandbox blocks outbound hosts; those failures are the environment, not the app.
const NOISE = /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|favicon|fonts\.googleapis|unpkg|openstreetmap|gstatic|Failed to load resource/i;

// This used to hardcode one machine's versioned browser path, which meant the
// test only ran there. Try Playwright's own browser, then any chromium already
// sitting in the browsers directory, then say so plainly.
const browser = await launchChromium();

async function launchChromium() {
  const candidates = [process.env.CHROME_PATH, undefined, ...installedChromiums()];
  let lastProblem;
  for (const executablePath of candidates) {
    if (executablePath === null) continue;
    try {
      return await chromium.launch(executablePath ? { executablePath } : {});
    } catch (problem) { lastProblem = problem; }
  }
  console.error('no chromium to run the browser pass with. `npx playwright install chromium`, or set CHROME_PATH.');
  throw lastProblem;
}

function installedChromiums() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return [];
  const found = [];
  for (const entry of readdirSync(root)) {
    for (const binary of ['chrome-linux/chrome', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const full = join(root, entry, binary);
      if (existsSync(full)) found.push(full);
    }
  }
  return found;
}
let failures = 0;
const note = (ok, label, extra = '') => {
  if (!ok) failures++;
  console.log(`${String(Math.round((Date.now() - START) / 1000)).padStart(4)}s ${ok ? ' ok ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`);
};

async function open(path) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    // A service worker cached by an earlier page can bypass the route below and
    // accidentally reconnect the smoke test to production Firebase.
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  const errors = [];
  // The browser pass exercises the UI and local data behavior, not the real
  // household account. Keep it deterministic instead of letting Firebase auth
  // cover the controls with the production sign-in gate.
  await page.route('**/firebase-config.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'export const firebaseConfig = {};'
  }));
  // The smoke pass tests our own UI in local mode. Third-party fonts, map
  // tiles and CDN scripts are not part of it, and a slow CDN used to make the
  // same CI run take anywhere from two to ten minutes.
  await page.route('**/*', route => {
    const requestUrl = new URL(route.request().url());
    return requestUrl.origin === BASE || requestUrl.protocol === 'about:'
      ? route.fallback()
      : route.abort();
  });
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);
  return { context, page, errors };
}

console.log('--- every page renders, no script errors, no sideways scroll ---');
const PAGES = ['her.html','him.html','tasks.html?as=her','notes.html?from=her',
  'location.html?as=her','status.html?as=her','dates.html?as=her','tasks.html?as=her#asks',
  'phone-check.html?as=her','profiles.html','status.html?as=him#partner','tasks.html?as=him#asks'];
PAGES.push('today.html?as=her','memories.html?as=her');

for (const path of PAGES) {
  const { context, page, errors } = await open(path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const text = await page.evaluate(() => document.body.innerText.trim().length);
  // A `display` rule beats the hidden attribute. That is how the sync chip sat
  // on every page saying "saved" forever: its JavaScript hid it, its CSS did not.
  const leaks = await page.evaluate(() => [...document.querySelectorAll('[hidden]')]
    .filter(element => getComputedStyle(element).display !== 'none')
    .map(element => element.id || element.className || element.tagName));
  note(errors.length === 0 && overflow <= 2 && text > 20 && leaks.length === 0, path.padEnd(26),
       [errors.slice(0,2).join(' | '), overflow > 2 ? `overflow ${overflow}px` : '', text <= 20 ? 'blank' : '', leaks.length ? `shown while hidden: ${leaks.join(', ')}` : ''].filter(Boolean).join(' '));
  await context.close();
}

console.log('\n--- interactions ---');

// A real write takes a network round trip. The local layer answers in the same
// tick, which hid a whole class of bug: code that touched event.currentTarget
// after awaiting a write worked here and threw on the phones, reporting a
// failure after the thing had been added. This serves the data layer with a
// round trip's worth of delay on every write.
async function openSlow(path) {
  const opened = await open('about:blank');
  const source = readFileSync(new URL('../firebase-data.js', import.meta.url), 'utf8')
    .replace(/async (addTo|setTo|updateIn|removeFrom)\(([^)]*)\) \{/g, 'async $1($2) { await new Promise(resolve => setTimeout(resolve, 120));');
  await opened.page.route('**/firebase-data.js', route => route.fulfill({ contentType: 'text/javascript', body: source }));
  await opened.page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded' });
  await opened.page.waitForTimeout(900);
  return opened;
}

{
  const { context, page, errors } = await openSlow('tasks.html?as=him');
  await page.click('[data-open-sheet="quick"]');
  await page.fill('#quick-text', 'water the desk plant');
  await page.click('#quick-submit');
  await page.waitForTimeout(700);
  const failed = await page.locator('.global-failure').count();
  const sheetOpen = await page.locator('#sheet-quick').isVisible();
  const leftover = await page.locator('#quick-text').inputValue();
  const added = await page.locator('.task-row', { hasText: 'water the desk plant' }).count();
  note(added === 1 && failed === 0 && !sheetOpen && leftover === '' && errors.length === 0,
       'quick add on a slow connection closes cleanly instead of reporting a failure',
       errors[0] || JSON.stringify({ added, failed, sheetOpen, leftover }));

  // Something added a moment ago has to be findable.
  await page.click('[data-open-sheet="search"]');
  await page.fill('#global-search', 'plant');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.click('[data-open-sheet="quick"]');
  await page.fill('#quick-text', 'repot the other plant');
  await page.click('#quick-submit');
  await page.waitForTimeout(700);
  await page.click('[data-open-sheet="search"]');
  await page.fill('#global-search', 'repot');
  await page.waitForTimeout(400);
  const found = await page.locator('.search-hit', { hasText: 'repot the other plant' }).count();
  note(found === 1, 'search finds what was added after it was first opened', `found ${found}`);

  // The chip settles once the writes land, and says nothing once they have.
  await page.waitForTimeout(2200);
  const chipAfter = await page.locator('#sync-chip').isVisible();
  await context.setOffline(true); await page.waitForTimeout(200);
  const chipOffline = await page.locator('#sync-chip').innerText().catch(() => '');
  await context.setOffline(false); await page.waitForTimeout(2200);
  const chipBack = await page.locator('#sync-chip').isVisible() ? await page.locator('#sync-chip').innerText() : 'hidden';
  note(!chipAfter && chipOffline.includes('offline') && chipBack !== 'saving…',
       'the sync chip reflects real writes, not the last event it heard',
       JSON.stringify({ chipAfter, chipOffline, chipBack }));
  await context.close();
}

{
  const { context, page, errors } = await open('tasks.html?as=her');
  await page.click('[data-open-sheet="more"]');
  await page.click('#check-update');
  await page.waitForTimeout(1200);
  const stillSpinning = ((await page.locator('#check-update').getAttribute('class')) || '').includes('is-checking');
  note(!stillSpinning && errors.length === 0, 'checking for an update finishes and throws nothing',
       errors[0] || (stillSpinning ? 'still spinning' : ''));
  await context.close();
}

{
  const { context, page } = await open('memories.html?as=her');
  await page.click('#memory-empty .empty-action');
  await page.waitForTimeout(400);
  const quickOpen = await page.locator('#sheet-quick').isVisible();
  const focused = await page.evaluate(() => document.activeElement?.id || '');
  // (The date pile always has the imported ideas in it, so notes stands in.)
  const notes = await open('notes.html?from=her');
  await notes.page.click('#note-inbox-empty .empty-action');
  await notes.page.waitForTimeout(400);
  const noteFocus = await notes.page.evaluate(() => document.activeElement?.id || '');
  const noteSheet = await notes.page.locator('#sheet-quick').isVisible();
  // "Nothing new" is news, not a form: it should not offer to add a to-do.
  const today = await open('today.html?as=her');
  await today.page.waitForTimeout(500);
  const feedButtons = await today.page.locator('#activity-empty .empty-action').count();
  note(!quickOpen && focused === 'memory-text' && noteFocus === 'note-body' && !noteSheet && feedButtons === 0,
       'an empty page offers to add the thing that page is for', JSON.stringify({ quickOpen, focused, noteFocus, noteSheet, feedButtons }));
  await today.context.close();
  await notes.context.close();
  await context.close();
}

// A delete waits behind an undo bar: undo keeps the thing, and letting the bar
// run out really deletes it. Nothing is re-created, so no rule has to allow
// putting back someone else's record.
{
  const { context, page, errors } = await open('tasks.html?as=her');
  await page.fill('#shared-task-title', 'undo me');
  await page.click('#shared-task-form [type="submit"]');
  await page.waitForTimeout(400);
  const row = () => page.locator('.task-row', { hasText: 'undo me' });
  await row().locator('[data-action="delete"]').click();
  await page.waitForTimeout(150);
  const hidden = await row().count() === 0;
  await page.click('.undo-toast button');
  await page.waitForTimeout(200);
  const back = await row().count() === 1;
  await row().locator('[data-action="delete"]').click();
  await page.waitForTimeout(5600);
  const stored = await page.evaluate(() => (JSON.parse(localStorage.getItem('our-little-list-items-v1') || '{"items":[]}').items || []).some(item => item.title === 'undo me'));
  note(hidden && back && !stored && errors.length === 0, 'deleting waits behind an undo bar, then really deletes',
       errors[0] || JSON.stringify({ hidden, back, stored }));
  await context.close();
}

// Timed pause: the status page offers 1 hour / 3 hours / until I turn it on.
{
  const { context, page, errors } = await open('status.html?as=her');
  await page.waitForTimeout(500);
  const choices = await page.locator('#pause-choices button').allTextContents();
  note(choices.join('|') === '1 hour|3 hours|until I turn it on' && errors.length === 0, 'location can be paused for a set time', errors[0] || choices.join('|'));
  await context.close();
}

// One tap sends "thinking of you" from quick add.
{
  const { context, page, errors } = await open('today.html?as=him');
  await page.click('.dock-add');
  await page.waitForTimeout(300);
  await page.click('#quick-thinking');
  await page.waitForTimeout(400);
  const sent = await page.evaluate(() => (JSON.parse(localStorage.getItem('our-little-list-notes-v1') || '{"items":[]}').items || []).some(note => note.body === 'thinking of you ♡' && note.recipient === 'her'));
  note(sent && errors.length === 0, 'one tap sends "thinking of you"', errors[0] || '');
  await context.close();
}

// The dock is the same everywhere: quick-add writes through the normal data
// layer, search can find the result, and the home button respects the account.
{
  const { context, page, errors } = await open('tasks.html?as=him');
  const home = await page.locator('.app-dock a').first().getAttribute('href');
  await page.click('[data-open-sheet="quick"]');
  await page.fill('#quick-text', 'charge the tiny fan');
  await page.click('#quick-submit');
  await page.waitForTimeout(250);
  const added = await page.locator('.task-row', { hasText:'charge the tiny fan' }).count();
  await page.click('[data-open-sheet="search"]');
  await page.fill('#global-search', 'tiny fan');
  await page.waitForTimeout(150);
  const found = await page.locator('.search-hit', { hasText:'charge the tiny fan' }).count();
  note(home === 'him.html' && added === 1 && found === 1 && errors.length === 0,
       'dock, quick-add and search stay on the right side', errors[0] || JSON.stringify({ home, added, found }));
  await context.close();
}

// The fridge note is one shared document, editable without leaving home.
{
  const { context, page, errors } = await open('her.html?as=her');
  await page.click('#fridge-open');
  await page.fill('#fridge-text', 'oat milk is critically low');
  await page.click('#fridge-emoji-pick');
  await page.fill('#emoji-reaction-input', '🥛');
  await page.click('[data-picker-use]');
  await page.click('#fridge-form [type="submit"]');
  await page.waitForTimeout(200);
  const noteText = await page.locator('#fridge-copy').textContent();
  const icon = await page.locator('#fridge-emoji').textContent();
  await page.click('#fridge-open');
  const prefilled = await page.locator('#fridge-text').inputValue();
  await page.click('#sheet-fridge [data-close-sheet]');
  note(noteText === 'oat milk is critically low' && prefilled === noteText && icon === '🥛' && errors.length === 0,
       'the shared fridge note pins, uses any emoji, and reopens with its text', errors[0] || JSON.stringify({ noteText, icon, prefilled }));
  // The fridge is a pinned note: it is in the notes, and unpinning it there
  // takes it off the fridge.
  await page.goto(`${BASE}/notes.html?from=her`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const row = page.locator('.note-thread-row', { hasText: 'oat milk is critically low' });
  const pinnedThere = await row.locator('[data-pin-note]').innerText().catch(() => '');
  await row.locator('[data-pin-note]').click();
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/her.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const after = await page.locator('#fridge-copy').textContent();
  note(pinnedThere.includes('unpin') && after === 'tap to pin something', 'the fridge is a pinned note, and notes can take it down',
       JSON.stringify({ pinnedThere, after }));
  await context.close();
}

// Saved-spot presets have distinct behavior and custom spots keep their own
// words. Geofence math itself is covered in the pure unit pass.
{
  const { context, page, errors } = await open('status.html?as=her');
  await page.click('#saved-places > summary');
  await page.click('[data-place-preset="work"]');
  const work = await page.locator('#place-preview').textContent();
  await page.click('[data-place-preset="custom"]');
  await page.fill('#place-label', 'the creature habitat');
  await page.fill('#place-status', 'plotting at the creature habitat');
  const custom = await page.locator('#place-preview').textContent();
  note(work.includes('working hard') && custom.includes('plotting at the creature habitat') && errors.length === 0,
       'saved spot presets and custom labels preview correctly', errors[0] || JSON.stringify({ work, custom }));
  await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();await data.setTo('places','my-spot',{person:'her',label:'home',preset:'home',statusText:'vibing at home',emoji:'🏠',lat:25.76,lng:-80.19,radius:150,announce:true,createdAt:Date.now()});await data.setTo('locations','him',{person:'him',lat:25.761,lng:-80.19,shareUntil:Date.now()-1000,updatedAt:Date.now()-60000,placeLabel:'home'});});
  await page.locator('[data-toggle-leave="my-spot"]').click();
  const leaveOn=await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();return (await data.readOnce('places')).find(item=>item.id==='my-spot')?.announceLeave;});
  const staleWording=await page.locator('#last-known-row').textContent();
  note(leaveOn===true&&staleWording.includes('updates when')&&errors.length===0,'leaving pings are opt-in and stale partner spots say when they update',errors[0]||JSON.stringify({leaveOn,staleWording}));
  await context.close();
}

// Notification choices are device settings: they have to survive a reload and
// reach the registration later, even if permission has not been granted yet.
{
  const { context, page, errors } = await open('phone-check.html?as=her#pings');
  await page.locator('[data-category="lists"]').uncheck({ force:true });
  await page.selectOption('#in-app-sound', 'pop');
  await page.locator('input[name="vibration"][value="pulse"]').check({ force:true });
  // No save button any more: the switches save themselves.
  await page.waitForTimeout(900);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('our-little-list-notification-preferences-v1') || '{}'));
  note(saved.categories?.lists === false && saved.inAppSound === 'pop' && saved.vibration === 'pulse' && errors.length === 0,
       'notification choices save on this phone', errors[0] || JSON.stringify(saved));
  await context.close();
}

// Old bookmarks and queued notifications land in the consolidated homes.
{
  const help = await open('help.html?as=her');
  note(help.page.url().endsWith('/tasks.html#asks'), 'old help links move into the list', help.page.url());
  await help.context.close();
  const admire = await open('admire.html?as=her');
  note(admire.page.url().endsWith('/status.html#partner'), 'old admire links move into right now', admire.page.url());
  await admire.context.close();
  // Merged pages: queued reminder nudges and old bookmarks still land somewhere real.
  const moved = {};
  for (const [from, to] of [['reminders.html?from=her', '/tasks.html#asks'], ['activity.html?as=her', '/today.html#new'], ['notifications.html?as=her', '/phone-check.html#pings']]) {
    const opened = await open(from);
    moved[from] = opened.page.url().endsWith(to) ? 'ok' : opened.page.url();
    await opened.context.close();
  }
  note(Object.values(moved).every(value => value === 'ok'), 'reminders, what\'s new and little pings redirect to where they live now', JSON.stringify(moved));
}

// The new home is one data-driven sky, not the old greeting plus four menu boxes.
{
  const { context, page, errors } = await open('her.html?as=her');
  await page.evaluate(async()=>{
    const now=Date.now();const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();
    await data.setTo('presence','her',{person:'her',lastSeenAt:now});await data.setTo('presence','him',{person:'him',lastSeenAt:now});
    await data.setTo('statuses','him',{person:'him',emoji:'🎧',category:'listening to',text:'one song again',updatedAt:now});
    await data.setTo('locations','her',{person:'her',lat:25.7617,lng:-80.1918,shareUntil:now+3600000,updatedAt:now});
    await data.setTo('locations','him',{person:'him',lat:25.762,lng:-80.1918,shareUntil:now+3600000,updatedAt:now});
    await data.setTo('notes','sky-note',{sender:'him',from:'him',recipient:'her',to:'her',body:'tiny spoon sighting',mood:'moon',createdAt:now});
    await data.setTo('items','sky-win',{title:'tiny win',done:true,doneAt:now});
    await data.setTo('reactions','sky-reaction',{by:'him',to:'her',emoji:'🫶',createdAt:now});
  });
  await page.waitForTimeout(350);
  const orbit=await page.locator('#sky-stage').getAttribute('data-orbit');
  const title=await page.locator('#sky-orbit-title').textContent();
  const liveStatus=await page.locator('#sky-status-him:not([hidden])').count();
  const noteStar=await page.locator('#sky-note-star:not([hidden])').count();
  const wins=await page.locator('#sky-wins:not([hidden])').count();
  const reaction=await page.locator('#sky-reaction-her:not([hidden])').count();
  const oldDashboard=await page.locator('.compact-hello,.home-group').count();
  const routes=await page.evaluate(()=>({self:document.querySelector('#sky-person-her')?.getAttribute('href'),partner:document.querySelector('#sky-person-him')?.getAttribute('href')}));
  note(orbit==='together'&&title?.includes('together')&&liveStatus===1&&noteStar===1&&wins===1&&reaction===1&&oldDashboard===0&&routes.self==='status.html'&&routes.partner==='status.html#partner'&&errors.length===0,
       'our sky reflects live data without the old dashboard',errors[0]||JSON.stringify({orbit,title,liveStatus,noteStar,wins,reaction,oldDashboard,routes}));
  await context.close();
}

// Add a task, it should show up in the list.
{
  const { context, page, errors } = await open('tasks.html?as=her');
  await page.fill('#shared-task-title', 'buy oat milk');
  await page.click('#shared-task-form [type="submit"]');
  await page.waitForTimeout(500);
  const shown = await page.locator('.task-row', { hasText: 'buy oat milk' }).count();
  note(shown === 1 && errors.length === 0, 'add a task', errors[0] || (shown !== 1 ? `found ${shown}` : ''));
  await page.locator('.task-row', { hasText: 'buy oat milk' }).locator('.task-title').click();
  await page.fill('[data-edit-task] [name="title"]', 'buy oat milk and tea');
  await page.fill('[data-edit-task] [name="due"]', '2026-10-02');
  await page.selectOption('[data-edit-task] [name="recurrence"]', 'weekly');
  await page.click('[data-edit-task] [type="submit"]');
  await page.waitForTimeout(300);
  const editedTask = await page.evaluate(() => JSON.parse(localStorage.getItem('our-little-list-items-v1')).items.find(item => item.title === 'buy oat milk and tea'));
  note(editedTask?.due === '2026-10-02' && editedTask?.recurrence === 'weekly' && errors.length === 0,
       'a task title and details can be fixed in place', errors[0] || JSON.stringify(editedTask));
  await context.close();
}

{
  const { context, page, errors } = await open('notes.html?from=her');
  await page.fill('#note-body', 'the small moon report');
  await page.click('#note-submit');
  await page.waitForTimeout(300);
  await page.locator('.note-thread-row', { hasText: 'the small moon report' }).locator('[data-edit-note]').click();
  await page.fill('[data-note-edit] textarea', 'the corrected moon report');
  await page.click('[data-note-edit] [type="submit"]');
  await page.waitForTimeout(300);
  const editedNote = await page.evaluate(() => JSON.parse(localStorage.getItem('our-little-list-notes-v1')).items.find(item => item.body === 'the corrected moon report'));
  note(editedNote?.editedAt > editedNote?.createdAt && errors.length === 0,
       'a sent note can be edited', errors[0] || JSON.stringify(editedNote));
  await page.locator('.note-thread-row', { hasText: 'the corrected moon report' }).locator('[data-delete-note]').click();
  const hidden = await page.locator('.note-thread-row', { hasText: 'the corrected moon report' }).count() === 0;
  await page.click('.undo-toast button');
  const restored = await page.locator('.note-thread-row', { hasText: 'the corrected moon report' }).count() === 1;
  note(hidden && restored && errors.length === 0, 'a note delete can be undone', errors[0] || JSON.stringify({ hidden, restored }));
  await context.close();
}

// Reminders are asks with a time. "weekend" on a Saturday or Sunday used to jump
// a whole week: with the clock pinned to a Saturday morning, "weekend, evening"
// is tonight; on a Saturday night, "weekend, morning-ish" is tomorrow.
{
  const weekendAt = async (when, time) => {
    const { context, page } = await open('about:blank');
    await page.clock.install({ time: when });
    await page.goto(`${BASE}/tasks.html?as=her#asks`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(900);
    await page.click('#help-urgency [data-urgency="timed"]');
    await page.click('#day-choices [data-day="weekend"]');
    await page.click(`#time-choices [data-time="${time}"]`);
    const preview = await page.evaluate(() => document.getElementById('reminder-when-preview')?.textContent || '');
    await context.close();
    return preview;
  };
  const saturdayMorning = await weekendAt(new Date(2026, 9, 3, 8, 0), '19:00');
  const saturdayNight = await weekendAt(new Date(2026, 9, 3, 22, 0), '09:00');
  const wednesday = await weekendAt(new Date(2026, 8, 30, 8, 0), '09:00');
  note(saturdayMorning.startsWith('today') && saturdayNight.startsWith('tomorrow') && /Saturday/.test(wednesday),
       '"weekend" on a weekend means this weekend', JSON.stringify({ saturdayMorning, saturdayNight, wednesday }));
}

// An ask for a moment that has passed is refused; one in the future is saved,
// shows its time on both sides, and appears on the other side's Today.
{
  const { context, page, errors } = await open('tasks.html?as=her#asks');
  await page.fill('#help-title', 'past thing');
  await page.click('#help-urgency [data-urgency="timed"]');
  await page.click('#day-choices [data-day="today"]');
  await page.click('#time-choices [data-time="custom"]');
  await page.fill('#custom-time', '00:01');
  await page.click('#help-submit');
  await page.waitForTimeout(400);
  const refused = await page.locator('.global-failure').count();
  note(refused === 1, 'an ask for a time already gone is refused', refused !== 1 ? 'it was accepted' : '');

  await page.click('.global-failure .failure-close');
  await page.click('#day-choices [data-day="tomorrow"]');
  await page.fill('#help-title', 'bring the water bottle');
  await page.click('#help-submit');
  await page.waitForTimeout(500);
  const mine = await page.locator('#help-mine-list .help-card', { hasText: 'bring the water bottle' }).innerText().catch(() => '');
  const whenHidden = await page.locator('#ask-when').isHidden();

  // "grab something" is the grocery list, not a second list of things to pick up.
  await page.click('#help-presets [data-groceries]');
  await page.waitForTimeout(200);
  const onGroceries = await page.locator('.tab.active[data-tab="grocery"]').count();
  note(onGroceries === 1 && page.url().endsWith('tasks.html?as=her'), '"grab something" opens the grocery list', page.url());

  // Local mode keeps data per browser context, so look from his side in this one.
  await page.goto(`${BASE}/tasks.html?as=him#asks`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const theirs = await page.locator('#help-inbox-list .help-card', { hasText: 'bring the water bottle' }).innerText().catch(() => '');
  note(mine.includes('⏰ tomorrow') && theirs.includes('⏰ tomorrow') && whenHidden && errors.length === 0,
       'an ask with a time is what a reminder was', errors[0] || JSON.stringify({ mine, theirs, whenHidden }));
  await context.close();
}

// The first ask of the day while the other person focuses offers a real urgent
// choice. Later asks do not repeatedly stop you with the same prompt.
{
  const {context,page,errors}=await open('tasks.html?as=her#asks');
  await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();await data.setTo('statuses','him',{person:'him',state:'online',text:'',category:'',emoji:'',focusUntil:Date.now()+15*60000,updatedAt:Date.now()});});
  await page.fill('#help-title','urgent cup of water');
  await page.click('#help-submit');
  const prompted=await page.locator('.focus-ask-dialog').count();
  await page.click('[data-focus-choice="urgent"]');
  await page.locator('#help-mine-list .help-card',{hasText:'urgent cup of water'}).waitFor();
  const first=await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();return (await data.readOnce('help')).find(item=>item.title==='urgent cup of water');});
  await page.fill('#help-title','ordinary second ask');
  await page.click('#help-submit');
  await page.locator('#help-mine-list .help-card',{hasText:'ordinary second ask'}).waitFor();
  const second=await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();return (await data.readOnce('help')).find(item=>item.title==='ordinary second ask');});
  note(prompted===1&&first?.urgent===true&&second?.urgent===false&&await page.locator('.focus-ask-dialog').count()===0&&errors.length===0,'focus asks can notify anyway without nagging all day',errors[0]||JSON.stringify({prompted,first,second}));
  await context.close();
}

// A self-reminder has one scheduled nudge to this phone, with no immediate
// heads-up (especially not to the partner).
{
  const {context,page,errors}=await open('tasks.html?as=her#asks');
  await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();window.__selfNudges=[];data.notify=async(...args)=>{window.__selfNudges.push(args);return {queued:true};};});
  await page.locator('#ask-for-me').check();
  const timeShown=await page.locator('#ask-when').isVisible();
  await page.click('#day-choices [data-day="tomorrow"]');
  await page.fill('#help-title','check the plant');
  await page.click('#help-submit');
  await page.locator('#help-mine-list .help-card',{hasText:'check the plant'}).waitFor();
  const self=await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();return {record:(await data.readOnce('help')).find(item=>item.title==='check the plant'), nudges:window.__selfNudges};});
  const noInbox=await page.locator('#help-inbox-list .help-card',{hasText:'check the plant'}).count()===0;
  note(timeShown&&self.record?.to==='her'&&self.nudges.length===1&&self.nudges[0][0]==='her'&&self.nudges[0][1]?.kind==='reminder'&&noInbox&&errors.length===0,'self-reminders nudge only your own phone at the chosen time',errors[0]||JSON.stringify(self));
  await context.close();
}

// Recurring tasks roll forward instead of disappearing, and groceries keep an aisle.
{
  const { context, page, errors } = await open('tasks.html?as=her');
  await page.fill('#shared-task-title', 'daily vitamin');
  await page.click('[data-repeat="daily"]');
  await page.click('#shared-task-form [type="submit"]');
  await page.waitForTimeout(250);
  await page.click('.task-row .task-check');
  await page.waitForTimeout(250);
  const recurring = await page.locator('.task-row', { hasText: 'daily vitamin' }).count();
  note(recurring === 1 && errors.length === 0, 'recurring task rolls forward', errors[0] || '');
  await page.click('[data-tab="grocery"]');
  await page.fill('#shared-task-title', 'avocados');
  await page.selectOption('#grocery-aisle', 'produce');
  await page.click('#shared-task-form [type="submit"]');
  await page.waitForTimeout(250);
  note(await page.locator('.aisle-label', { hasText: 'produce' }).count() === 1, 'groceries group by aisle');
  await context.close();
}

// The Today hub stays focused on what is due and the shared focus session.
// A daily answer stays hidden on the partner's side until both have answered.
// Editing an answer must not send a second heads-up.
{
  const { context, page, errors } = await open('today.html?as=her');
  await page.evaluate(async () => {
    const { sharedLayer } = await import('./data-hub.js');
    const data = await sharedLayer();
    window.questionPings = [];
    data.notify = async (to, message) => { window.questionPings.push({ to, message }); return { queued: true }; };
  });
  await page.fill('#question-answer', 'sun answer only');
  await page.click('#question-save');
  await page.waitForTimeout(150);
  const herPings = await page.evaluate(() => window.questionPings);
  const herOwn = await page.locator('#question-answers').innerText();
  await page.goto(`${BASE}/today.html?as=him`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const himBefore = await page.locator('#question-answers').innerText();
  await page.evaluate(async () => {
    const { sharedLayer } = await import('./data-hub.js');
    const data = await sharedLayer();
    window.questionPings = [];
    data.notify = async (to, message) => { window.questionPings.push({ to, message }); return { queued: true }; };
  });
  await page.fill('#question-answer', 'moon answer too');
  await page.click('#question-save');
  await page.waitForTimeout(150);
  const bothAnswers = await page.locator('#question-answers').innerText();
  await page.click('#question-edit');
  await page.fill('#question-answer', 'moon answer edited');
  await page.click('#question-save');
  await page.waitForTimeout(150);
  const himPings = await page.evaluate(() => window.questionPings);
  note(herOwn.includes('sun answer only') && !himBefore.includes('sun answer only')
       && himBefore.includes('answered') && bothAnswers.includes('sun answer only') && bothAnswers.includes('moon answer too')
       && himPings.length === 1 && herPings.length === 1 && himPings[0].to === 'her'
       && herPings[0].to === 'him' && himPings[0].message.kind === 'note' && errors.length === 0,
       'daily answers reveal together and ping only once', errors[0] || JSON.stringify({ herOwn, himBefore, bothAnswers, herPings, himPings }));
  await context.close();
}

// The Today hub stays focused on what is due and the shared focus session.
// A focus session is part of your status while it runs — and when it ends, the
// status you had set is still there, with its own expiry, not the timer's.
{
  const { context, page, errors } = await open('status.html?as=her');
  await page.evaluate(() => document.querySelector('.status-editor-disclosure')?.setAttribute('open', ''));
  await page.fill('#status-text', 'humming a song');
  await page.click('#status-save');
  await page.waitForTimeout(400);

  await page.goto(`${BASE}/today.html?as=her`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.fill('#focus-label', 'fold laundry');
  await page.click('#focus-start');
  await page.waitForTimeout(350);
  const focus = await page.locator('.focus-person.active', { hasText: 'fold laundry' }).count();
  const obsoleteDump = await page.locator('.dump-card,#dump-form').count();
  note(focus === 1 && obsoleteDump === 0 && errors.length === 0, 'today keeps focus without the duplicate thought inbox', errors[0] || '');

  await page.goto(`${BASE}/status.html?as=her`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const during = await page.locator('.person-status-card.is-me').innerText();
  await page.goto(`${BASE}/today.html?as=her`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.click('.focus-person [data-stop="her"]');
  await page.waitForTimeout(400);
  const stopped = await page.locator('.focus-person.active').count();
  await page.goto(`${BASE}/status.html?as=her`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const after = await page.locator('.person-status-card.is-me').innerText();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('our-little-list-statuses-v1')).items.find(item => item.id === 'her'));
  note(during.includes('locking in') && during.includes('fold laundry') && during.includes('humming a song')
       && stopped === 0 && after.includes('humming a song') && !after.includes('locking in') && !Number(stored.expiresAt),
       'a focus session is part of the status, and does not wipe or time out the one you set',
       JSON.stringify({ during, after, expiresAt: stored.expiresAt }));
  await context.close();
}

// A date you did goes in the memory jar, and undoing it takes it back out.
{
  const { context, page, errors } = await open('dates.html?as=her');
  await page.fill('#date-title', 'picnic at the lake');
  await page.click('#date-submit');
  await page.waitForTimeout(400);
  const card = page.locator('.date-idea-card', { hasText: 'picnic at the lake' });
  await card.locator('[data-action="complete"]').click();
  await page.waitForTimeout(500);
  const jar = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('our-little-list-memories-v1')).items.map(item => item.text); } catch (_) { return []; } });
  const afterDone = await jar();
  // Finished ideas sort to the bottom of the pile, past "show more".
  for (let tries = 0; tries < 10 && !(await page.locator('.date-idea-card', { hasText: 'picnic at the lake' }).count()); tries += 1) {
    await page.click('#date-more').catch(() => {});
    await page.waitForTimeout(150);
  }
  await page.locator('.date-idea-card', { hasText: 'picnic at the lake' }).locator('[data-action="complete"]').click();
  await page.waitForTimeout(500);
  const afterUndo = await jar();
  note(afterDone.includes('✦ we did: picnic at the lake') && !afterUndo.includes('✦ we did: picnic at the lake') && errors.length === 0,
       'a finished date lands in the memory jar, and undo takes it out', errors[0] || JSON.stringify({ afterDone, afterUndo }));
  await context.close();
}

// Quick add makes the same asks the Asks tab does, time and all.
{
  const { context, page, errors } = await open('tasks.html?as=her');
  await page.click('[data-open-sheet="quick"]');
  await page.click('[data-quick-kind="ask"]');
  await page.fill('#quick-text', 'call the vet');
  await page.fill('#quick-ask-note', 'ask about the tiny dog');
  await page.click('[data-quick-urgency="timed"]');
  await page.click('#quick-day-choices [data-day="tomorrow"]');
  await page.click('#quick-time-choices [data-time="19:00"]');
  await page.click('#quick-submit');
  await page.waitForTimeout(500);
  const saved = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('our-little-list-help-v1')).items.find(item => item.title === 'call the vet'); } catch (_) { return null; } });
  note(saved && saved.dueAt > Date.now() && saved.state === 'open' && saved.to === 'him' && saved.note === 'ask about the tiny dog' && errors.length === 0,
       'quick add uses the same day and time picker as asks', errors[0] || JSON.stringify(saved));
  await context.close();
}

// Text-only memories work everywhere; photos are optional.
{
  const { context, page, errors } = await open('memories.html?as=her');
  await page.fill('#memory-text', 'the tiny mug incident');
  await page.click('#memory-save');
  await page.waitForTimeout(300);
  note(await page.locator('.memory-card', { hasText: 'the tiny mug incident' }).count() === 1 && errors.length === 0,
       'memory jar saves a moment', errors[0] || '');
  await page.fill('#memory-text', 'sunny afternoon');
  await page.setInputFiles('#memory-photo', {
    name: 'sun.png', mimeType: 'image/png', buffer: readFileSync(new URL('../sun-profile.png', import.meta.url))
  });
  await page.click('#memory-save');
  await page.waitForTimeout(500);
  const photoSplit = await page.evaluate(() => {
    const memory = JSON.parse(localStorage.getItem('our-little-list-memories-v1')).items.find(item => item.text === 'sunny afternoon');
    const image = JSON.parse(localStorage.getItem('our-little-list-memoryPhotos-v1')).items.find(item => item.id === memory.id);
    return { id: memory.id, thumb: memory.thumb?.length, inline: memory.photo?.length || 0, hasPhoto: memory.hasPhoto, full: image?.photo?.length || 0 };
  });
  await page.locator('.memory-card', { hasText: 'sunny afternoon' }).locator('[data-open]').click();
  await page.waitForTimeout(250);
  const featuredFull = await page.locator('#memory-random img').getAttribute('src');
  note(photoSplit.hasPhoto && photoSplit.thumb < 30000 && photoSplit.inline === 0 && photoSplit.full > photoSplit.thumb && featuredFull?.length === photoSplit.full && errors.length === 0,
       'photos stay out of the memory feed until opened', errors[0] || JSON.stringify({ photoSplit, featured: featuredFull?.length }));
  await page.evaluate(() => {
    const memories = JSON.parse(localStorage.getItem('our-little-list-memories-v1'));
    const full = JSON.parse(localStorage.getItem('our-little-list-memoryPhotos-v1')).items[0].photo;
    memories.items.push({ id: 'old-photo', text: 'old photo', photo: full, addedBy: 'her', createdAt: Date.now() - 1000 });
    localStorage.setItem('our-little-list-memories-v1', JSON.stringify(memories));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const memory = JSON.parse(localStorage.getItem('our-little-list-memories-v1')).items.find(item => item.id === 'old-photo');
    return memory?.hasPhoto && !memory.photo && JSON.parse(localStorage.getItem('our-little-list-memoryPhotos-v1')).items.some(item => item.id === 'old-photo');
  });
  note(errors.length === 0, 'old inline photos move without losing their original', errors[0] || '');
  await page.locator('.memory-card', { hasText: 'old photo' }).locator('[data-delete]').click();
  await page.waitForTimeout(5600);
  const cleaned = await page.evaluate(() => {
    const memories = JSON.parse(localStorage.getItem('our-little-list-memories-v1')).items;
    const photos = JSON.parse(localStorage.getItem('our-little-list-memoryPhotos-v1')).items;
    return !memories.some(item => item.id === 'old-photo') && !photos.some(item => item.id === 'old-photo');
  });
  note(cleaned && errors.length === 0, 'deleting a memory also removes its stored photo', errors[0] || String(cleaned));
  await context.close();
}

// An arrival tap is a one-field update. It used to rebuild the whole document
// from whatever was in memory. The window that made that destructive — the gap
// before the first snapshot lands — is not reproducible here, so this guards the
// shape of the write rather than the race: whatever else an arrival does, the
// status and the availability have to survive it.
{
  const { context, page, errors } = await open('status.html?as=her');
  await page.evaluate(() => document.querySelector('.status-editor-disclosure')?.setAttribute('open', ''));
  await page.fill('#status-text', 'the tiny mug album');
  await page.selectOption('#status-category', 'listening to');
  await page.click('#status-save');
  await page.waitForTimeout(400);
  await page.click('#arrival-presets [data-arrival="leaving now"]');
  await page.waitForTimeout(500);
  const stillThere = await page.locator('.person-status-card.is-me .status-custom', { hasText: 'the tiny mug album' }).count();
  const arrived = await page.locator('.person-status-card.is-me .status-arrival', { hasText: 'leaving now' }).count();
  note(stillThere === 1 && arrived === 1 && errors.length === 0, 'an arrival tap keeps the status you set',
       errors[0] || `status ${stillThere}, arrival ${arrived}`);

  // Clearing the custom bit must not also commit an availability you only hovered over.
  await page.click('.status-choice[data-state="dnd"]');
  await page.click('#status-clear');
  await page.waitForTimeout(400);
  const presence = await page.locator('.person-status-card.is-me .status-presence').innerText();
  note(!presence.includes('busy') && errors.length === 0, 'clearing the custom bit leaves availability alone', presence);
  await context.close();
}

// Date roulette honors its filters instead of quietly pulling an untagged old idea.
{
  const { context, page, errors } = await open('dates.html?as=her');
  await page.fill('#date-title', 'meteor picnic');
  await page.selectOption('#date-cost', 'treat');
  await page.selectOption('#date-energy', 'high');
  await page.selectOption('#date-weather', 'outdoor');
  await page.selectOption('#date-distance', 'drive');
  await page.selectOption('#date-duration', 'day');
  await page.click('#date-submit');
  await page.selectOption('#filter-cost', 'treat');
  await page.selectOption('#filter-energy', 'high');
  await page.selectOption('#filter-weather', 'outdoor');
  await page.selectOption('#filter-distance', 'drive');
  await page.selectOption('#filter-duration', 'day');
  await page.click('#pick-random');
  await page.waitForTimeout(250);
  note(await page.locator('#random-date', { hasText: 'meteor picnic' }).count() === 1 && errors.length === 0,
       'date roulette respects every filter', errors[0] || '');
  await page.locator('.date-idea-card', { hasText: 'meteor picnic' }).locator('[data-action="edit"]').click();
  await page.fill('[data-edit-date] [name="title"]', 'meteor picnic with snacks');
  await page.fill('[data-edit-date] [name="note"]', 'bring the blanket');
  await page.selectOption('[data-edit-date] [name="vibe"]', 'stay in');
  await page.click('[data-edit-date] [type="submit"]');
  await page.waitForTimeout(300);
  const editedDate = await page.evaluate(() => JSON.parse(localStorage.getItem('our-little-list-dates-v1')).items.find(item => item.title === 'meteor picnic with snacks'));
  note(editedDate?.note === 'bring the blanket' && editedDate?.vibe === 'stay in' && errors.length === 0,
       'a date idea can be edited without losing its other details', errors[0] || JSON.stringify(editedDate));
  await context.close();
}

// Energy, arrival presets and partner-status reactions share the same status screen.
{
  const { context, page, errors } = await open('status.html?as=her');
  await page.click('details.status-editor summary');
  await page.click('[data-energy="need company"]');
  const chipFilled=await page.locator('#status-text').inputValue()==='need company';
  await page.click('#status-emoji-pick');
  await page.fill('#emoji-reaction-input', '🪐');
  await page.click('[data-picker-use]');
  await page.fill('#status-text', 'soup would fix me');
  await page.click('#status-save');
  const chosenEmoji = await page.evaluate(() => JSON.parse(localStorage.getItem('our-little-list-statuses-v1')).items.find(item => item.id === 'her')?.emoji);
  await page.click('[data-arrival="almost there"]');
  await page.click('[data-status-picker="him"]');
  await page.click('[data-picker-emoji="❤️"]');
  await page.waitForTimeout(300);
  const card = page.locator('.person-status-card.is-me');
  // The chip now fills the ordinary words field; typing over it intentionally
  // replaces that draft instead of leaving a second energy label on the card.
  const ready = await card.filter({ hasText: 'soup would fix me' }).filter({ hasText: 'almost there' }).count();
  const visibleReaction=await page.locator('[data-react-status="him"][data-emoji="❤️"]').count();
  await page.click('[data-react-status="him"][data-emoji="❤️"]');
  await page.waitForTimeout(200);
  const undone=await page.locator('[data-react-status="him"][data-emoji="❤️"]').count()===0;
  await page.goto(`${BASE}/today.html?as=her#new`);
  const arrivalFeed=await page.locator('.activity-row', {hasText:'almost there'}).filter({hasText:'are on the way'}).count();
  note(ready === 1 && chipFilled && chosenEmoji === '🪐' && visibleReaction === 1 && undone && arrivalFeed === 1 && errors.length === 0, 'status quick words, arrival feed, emoji and reactions work together', errors[0] || `arrival feed ${arrivalFeed}`);
  await context.close();
}

// Note reactions save without a false error, stand out, and toggle back off.
{
  const { context, page, errors } = await open('notes.html?as=her');
  await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const data=await sharedLayer();await data.addTo('notes',{sender:'him',from:'him',recipient:'her',to:'her',body:'reaction test note',mood:'moon',createdAt:Date.now()});});
  await page.waitForTimeout(200);
  await page.click('[data-note-picker]');
  await page.fill('#emoji-reaction-input','🦦');
  await page.click('[data-picker-use]');
  await page.waitForTimeout(250);
  const active=await page.locator('.reaction-display[data-note-picker]',{hasText:'🦦'}).count();
  const falseError=await page.locator('.global-failure').count();
  await page.click('.reaction-display[data-note-picker]');
  await page.click('[data-picker-remove]');
  await page.waitForTimeout(200);
  const undone=await page.locator('.reaction-display[data-note-picker]',{hasText:'🦦'}).count()===0;
  note(active === 1 && falseError === 0 && undone && errors.length === 0, 'any keyboard emoji reacts cleanly and undoes', errors[0] || (falseError?'false failure shown':''));
  await context.close();
}

// Help request round trip: her asks, him answers.
{
  const her = await open('tasks.html?as=her#asks');
  await her.page.click('#help-presets [data-title="bring me water"]');
  await her.page.click('#help-submit');
  await her.page.waitForTimeout(500);
  const asked = await her.page.locator('#help-sent:visible').count();
  note(asked === 1 && her.errors.length === 0, 'send a help request', her.errors[0] || '');

  // Local mode keeps data per browser context, so answer it in the same one.
  await her.page.goto(`${BASE}/tasks.html?as=him#asks`, { waitUntil: 'domcontentloaded' });
  await her.page.waitForTimeout(1100);
  const inbox = await her.page.locator('#help-inbox-list .help-card').count();
  note(inbox >= 1, 'request arrives in the other inbox', inbox === 0 ? 'inbox empty' : '');
  if (inbox >= 1) {
    await her.page.click('#help-inbox-list [data-answer="on-it"]');
    await her.page.waitForTimeout(600);
    const chosen = await her.page.locator('.help-answer.is-chosen').count();
    note(chosen >= 1, 'answering marks the request');
  }
  await her.context.close();
}

// Names are free text, so a name with markup must not break the map panel.
{
  const { context, page, errors } = await open('profiles.html');
  await page.fill('#sun-name', '<img src=x onerror=alert(1)>');
  await page.fill('#moon-name', 'Milo');
  await page.click('#profile-save');
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/location.html?as=her`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  const injected = await page.evaluate(() => document.querySelectorAll('#last-known-row img').length);
  const pillText = await page.evaluate(() => document.getElementById('last-known-row')?.innerText || '');
  note(injected === 0 && errors.length === 0, 'a name with html is escaped, not rendered',
       injected > 0 ? 'markup executed' : errors[0] || '');
  note(pillText.includes('<img'), 'the escaped name is shown as text', pillText ? `saw "${pillText.slice(0,40)}"` : 'empty');
  await context.close();
}

// timeAgo must speak in hours and days, not 1287 minutes.
{
  const { context, page } = await open('her.html');
  const results = await page.evaluate(async () => {
    const { timeAgo } = await import('./time-format.js');
    const hour = 3600000;
    return {
      fresh: timeAgo(Date.now() - 90000),
      hours: timeAgo(Date.now() - 5 * hour),
      days: timeAgo(Date.now() - 3 * 24 * hour),
      weeks: timeAgo(Date.now() - 15 * 24 * hour),
      junk: timeAgo(undefined)
    };
  });
  const good = results.hours === '5h ago' && results.days === '3d ago' && results.weeks === '2w ago' && results.junk === 'a while ago';
  note(good, 'timeAgo handles hours, days, weeks and junk', JSON.stringify(results));
  await context.close();
}

// The activity feed redraws itself on every snapshot — a presence beat alone
// does that about twice a minute. The "delete for us" confirm used to live on
// the button element, so a redraw between the two taps silently threw it away
// and the delete never happened.
{
  // What's new lives at the bottom of Today now.
  const { context, page, errors } = await open('today.html?as=her');
  await page.setViewportSize({ width: 390, height: 500 });
  await page.evaluate(() => localStorage.setItem('our-little-list-notes-v1', JSON.stringify({ items: [
    { id: 'n1', sender: 'him', recipient: 'her', body: 'a note to delete', mood: 'heart', createdAt: Date.now() }
  ] })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1300);
  const rows = await page.locator('.activity-row').count();
  const readNow = () => page.evaluate(() => {
    try { return !!JSON.parse(localStorage.getItem('our-little-list-notes-v1')).items[0].read; } catch (_) { return false; }
  });
  // Opening Today is not reading the feed at its bottom; scrolling to it is.
  const readBeforeScrolling = await readNow();
  await page.locator('#new').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1300);
  const markedRead = await readNow();
  note(!readBeforeScrolling && markedRead, 'reading the feed marks the note read, and only then',
       JSON.stringify({ readBeforeScrolling, markedRead }));
  await page.click('.activity-row .delete-for-us');
  // Stand in for the snapshot that lands between the two taps.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('littlelist:profile')));
  await page.waitForTimeout(100);
  const armed = await page.evaluate(() => document.querySelector('.delete-for-us')?.textContent || '');
  await page.click('.activity-row .delete-for-us');
  await page.waitForTimeout(500);
  const left = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('our-little-list-notes-v1')).items.length; } catch (_) { return -1; }
  });
  note(rows === 1 && armed.includes('tap again') && left === 0,
       'a redraw between the two taps does not eat the delete',
       errors[0] || `rows ${rows}, confirm "${armed}", left ${left}`);
  await context.close();
}

// Typing one name used to freeze the whole form: the other side's rename
// stopped arriving, and saving then wrote a stale copy of it back over them.
{
  const { context, page, errors } = await open('profiles.html');
  await page.evaluate(() => localStorage.setItem('our-little-list-profiles-v1', JSON.stringify({ items: [
    { id: 'couple', sunName: 'Sun', moonName: 'Moon', updatedAt: Date.now() }
  ] })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.fill('#moon-name', 'Moonbeam');
  // The other phone renames the sun while this one is mid-edit.
  await page.evaluate(() => {
    const key = 'our-little-list-profiles-v1';
    localStorage.setItem(key, JSON.stringify({ items: [{ id: 'couple', sunName: 'Sunshine', moonName: 'Moon', updatedAt: Date.now() }] }));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  });
  await page.waitForTimeout(200);
  const mid = await page.evaluate(() => ({ sun: document.getElementById('sun-name').value, moon: document.getElementById('moon-name').value }));
  await page.click('#profile-save');
  await page.waitForTimeout(400);
  const saved = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('our-little-list-profiles-v1')).items[0]; } catch (_) { return {}; }
  });
  note(mid.sun === 'Sunshine' && mid.moon === 'Moonbeam' && saved.sunName === 'Sunshine' && saved.moonName === 'Moonbeam',
       'renaming one of us does not revert the other', errors[0] || JSON.stringify({ mid, saved }));
  await context.close();
}

// Signing out does local work (dropping the account) behind remote work (letting
// go of this phone's push registration). A phone that believes it is online but
// is not leaves that write pending forever, and the button used to sit at
// "signing out…" with no way off the account. This context blocks service
// workers, so the cleanup's first step never finishes either - which is exactly
// the shape being guarded against.
{
  const { context, page } = await open('phone-check.html?as=her#account');
  await page.waitForTimeout(600);
  let navigated = false;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigated = true; });
  // One tap only arms it; nobody signs out by brushing the button.
  await page.click('#sign-out');
  await page.waitForTimeout(300);
  const armedOnly = !navigated && (await page.locator('#sign-out').textContent()).includes('tap again');
  await page.click('#sign-out');
  await page.waitForTimeout(7000);
  note(navigated && armedOnly, 'signing out asks twice and is not held hostage by a cleanup that never lands',
       JSON.stringify({ navigated, armedOnly }));
  await context.close();
}

// The front door is no longer a picker: it routes you to your own side.
{
  const { context, page, errors } = await open('index.html');
  const landed = new URL(page.url()).pathname;
  note(/her\.html|him\.html$/.test(landed) && errors.length === 0,
       'the front door routes you to your side', errors[0] || `landed on ${landed}`);
  await context.close();
}

// A dashboard must not render someone else's side around your data.
{
  const { context, page } = await open('him.html');
  const landed = new URL(page.url()).pathname;
  note(landed.endsWith('her.html'), 'the wrong dashboard redirects to yours', `landed on ${landed}`);
  await context.close();
}

// Pull the plug. An installed app that dies the moment the network does is not
// really installed. (The Firebase path can't be exercised here — this copy runs
// in local mode — so this guards the shell and the service worker.)
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${BASE}/her.html`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);

  await context.setOffline(true);
  await page.goto(`${BASE}/tasks.html?as=her`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const text = await page.evaluate(() => document.body.innerText.trim().length);
  const composer = await page.locator('#shared-task-form').count();
  note(text > 20 && composer === 1, 'a page still opens with the network unplugged',
       errors[0] || `text ${text}, composer ${composer}`);

  await context.setOffline(false);
  await context.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL CLEAN' : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
