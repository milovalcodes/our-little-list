import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://127.0.0.1:8777';
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
  console.log(`${ok ? ' ok ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`);
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
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);
  return { context, page, errors };
}

console.log('--- every page renders, no script errors, no sideways scroll ---');
const PAGES = ['her.html','him.html','tasks.html?as=her','reminders.html?from=her','notes.html?from=her',
  'location.html?as=her','activity.html?as=her','status.html?as=her','dates.html?as=her','help.html?as=her',
  'phone-check.html?as=her','profiles.html','admire.html?as=her','help.html?as=him'];
PAGES.push('today.html?as=her','memories.html?as=her');

for (const path of PAGES) {
  const { context, page, errors } = await open(path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const text = await page.evaluate(() => document.body.innerText.trim().length);
  note(errors.length === 0 && overflow <= 2 && text > 20, path.padEnd(26),
       [errors.slice(0,2).join(' | '), overflow > 2 ? `overflow ${overflow}px` : '', text <= 20 ? 'blank' : ''].filter(Boolean).join(' '));
  await context.close();
}

console.log('\n--- interactions ---');

// Add a task, it should show up in the list.
{
  const { context, page, errors } = await open('tasks.html?as=her');
  await page.fill('#shared-task-title', 'buy oat milk');
  await page.click('#shared-task-form [type="submit"]');
  await page.waitForTimeout(500);
  const shown = await page.locator('.task-row', { hasText: 'buy oat milk' }).count();
  note(shown === 1 && errors.length === 0, 'add a task', errors[0] || (shown !== 1 ? `found ${shown}` : ''));
  await context.close();
}

// A reminder in the past must be refused, one in the future must be accepted.
{
  const { context, page, errors } = await open('reminders.html?from=her');
  await page.fill('#reminder-title', 'past thing');
  await page.click('#day-choices [data-day="today"]');
  await page.click('#time-choices [data-time="custom"]');
  await page.fill('#custom-time', '00:01');
  await page.click('#reminder-submit');
  await page.waitForTimeout(400);
  const refused = await page.locator('.global-failure').count();
  note(refused === 1, 'past reminder is refused', refused !== 1 ? 'it was accepted' : '');

  await page.click('.global-failure .failure-close');
  await page.click('#day-choices [data-day="tomorrow"]');
  await page.click('#reminder-submit');
  await page.waitForTimeout(500);
  const sent = await page.locator('#sent-state:visible').count();
  note(sent === 1 && errors.length === 0, 'future reminder is accepted', errors[0] || '');
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

// The Today hub can park a thought and start a shared focus session.
{
  const { context, page, errors } = await open('today.html?as=her');
  await page.fill('#dump-text', 'return the library book');
  await page.click('#dump-form [type="submit"]');
  await page.fill('#focus-label', 'fold laundry');
  await page.click('#focus-start');
  await page.waitForTimeout(350);
  const thought = await page.locator('.dump-row', { hasText: 'return the library book' }).count();
  const focus = await page.locator('.focus-person.active', { hasText: 'fold laundry' }).count();
  note(thought === 1 && focus === 1 && errors.length === 0, 'today hub saves thoughts and focus', errors[0] || '');
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
  await context.close();
}

// Energy, arrival presets and partner-status reactions share the same status screen.
{
  const { context, page, errors } = await open('status.html?as=her');
  await page.click('details.status-editor summary');
  await page.click('[data-energy="need company"]');
  await page.fill('#status-text', 'soup would fix me');
  await page.click('#status-save');
  await page.click('[data-arrival="almost there"]');
  await page.click('[data-react-status="him"][data-emoji="♡"]');
  await page.waitForTimeout(300);
  const card = page.locator('.person-status-card.is-me');
  const ready = await card.filter({ hasText: 'need company' }).filter({ hasText: 'almost there' }).count();
  note(ready === 1 && errors.length === 0, 'status keeps energy, arrival and reactions together', errors[0] || '');
  await context.close();
}

// Help request round trip: her asks, him answers.
{
  const her = await open('help.html?as=her');
  await her.page.click('#help-presets [data-title="bring me water"]');
  await her.page.click('#help-submit');
  await her.page.waitForTimeout(500);
  const asked = await her.page.locator('#sent-state:visible').count();
  note(asked === 1 && her.errors.length === 0, 'send a help request', her.errors[0] || '');

  // Local mode keeps data per browser context, so answer it in the same one.
  await her.page.goto(`${BASE}/help.html?as=him`, { waitUntil: 'domcontentloaded' });
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

await browser.close();
console.log(failures === 0 ? '\nALL CLEAN' : `\n${failures} check(s) failed`);
process.exit(failures ? 1 : 0);
