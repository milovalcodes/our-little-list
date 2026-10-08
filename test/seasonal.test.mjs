import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../seasonal-theme.js', import.meta.url), 'utf8');
const root = { dataset:{} };
const document = { documentElement:root, readyState:'loading', addEventListener() {} };
const window = { setInterval() {} };
vm.runInNewContext(source, { document, window, Date, Intl }, { filename:'seasonal-theme.js' });
const { seasonForDate, refresh } = window.LittleSeason;

for (const [when, expected] of [
  ['2026-09-30T23:59:00-04:00','normal'],
  ['2026-10-01T00:00:00-04:00','spooky'],
  ['2026-10-31T23:59:00-04:00','spooky'],
  ['2026-11-01T00:00:00-04:00','normal'],
  ['2026-11-30T23:59:00-05:00','normal'],
  ['2026-12-01T00:00:00-05:00','christmas'],
  ['2026-12-31T23:59:00-05:00','christmas'],
  ['2027-01-01T00:00:00-05:00','normal']
]) {
  assert.equal(seasonForDate(new Date(when)), expected, `${when} switches at Eastern midnight`);
  assert.equal(refresh(new Date(when)), expected);
  assert.equal(root.dataset.season, expected);
}

for (const page of ['index','her','him','tasks','notes','today','status','dates','memories','phone-check','guide','404']) {
  const html = readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.match(html, /src="seasonal-theme\.js"/, `${page} loads seasonal logic`);
  assert.match(html, /href="seasonal\.css"/, `${page} loads seasonal design`);
  assert.ok(html.indexOf('diary.css') === -1 || html.indexOf('diary.css') < html.indexOf('seasonal.css'), `${page} applies seasonal styles last`);
}
const worker = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
assert.match(worker, /'\.\/seasonal-theme\.js'/);
assert.match(worker, /'\.\/seasonal\.css'/);
console.log('SEASONAL CALENDAR, PAGE COVERAGE, AND OFFLINE CACHE OK');
