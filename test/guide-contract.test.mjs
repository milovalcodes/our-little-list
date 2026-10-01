import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const guide = readFileSync(new URL('guide.html', root), 'utf8');
const chrome = readFileSync(new URL('app-chrome.js', root), 'utf8');
const worker = readFileSync(new URL('service-worker.js', root), 'utf8');
const current = Number(/const CACHE = 'our-little-list-v(\d+)'/.exec(worker)?.[1]);

assert.ok(Number.isInteger(current), 'the offline version needs a number');
assert.match(guide, new RegExp(`data-guide-version="${current}"`), 'review the tutorial when the app version changes');
assert.match(guide, new RegExp(`data-release="${current}"`), 'write patch notes for the current app version');
assert.match(guide, /data-guide-tab="tutorial"/);
assert.match(guide, /data-guide-tab="changes"/);
assert.match(chrome, /guide\.html#tutorial/);
assert.match(chrome, /guide\.html#changes/);
for (const topic of ['home','add','today','list','notes','status','dates','memories','settings']) {
  assert.match(guide, new RegExp(`id="guide-${topic}"`), `the ${topic} tutorial needs a section`);
}
const latest = guide.match(new RegExp(`<article class="release-entry" data-release="${current}">([\\s\\S]*?)<\\/article>`))?.[1];
assert.ok(latest, 'the latest patch note needs its own entry');
for (const kind of ['Added','Changed','Fixed']) assert.match(latest, new RegExp(`<dt>${kind}</dt><dd>[^<]{12,}</dd>`));
console.log(`GUIDE AND PATCH NOTES MATCH v${current}`);
