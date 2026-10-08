import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../seasonal-assets.js';
const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const api = globalThis.LittleSeasonAssets;
const base = JSON.parse(read('manifest.webmanifest'));
const sw = read('service-worker.js');
for (const [season, date] of [
  ['normal','2026-11-30T23:59:59-05:00'],
  ['christmas','2026-12-01T00:00:00-05:00'],
  ['spooky','2026-10-01T00:00:00-04:00']
]) {
  const art = api.forSeason(season);
  for (const key of ['sun','moon','pair','icon','apple','badge','notification']) {
    const bytes = readFileSync(new URL(art[key], root));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.ok(sw.includes("'" + './' + art[key] + "'"), art[key] + ' works offline');
  }
  const manifest = api.manifest(base, new Date(date));
  assert.ok(!('id' in manifest), 'keep the original implicit start_url identity');
  const installUrl = 'https://milovalcodes.github.io/our-little-list/manifest.webmanifest';
  assert.equal(new URL(manifest.start_url, installUrl).href, 'https://milovalcodes.github.io/our-little-list/index.html');
  assert.ok(!('id' in api.manifest({ ...base, id:'./index.html' }, new Date(date))), 'repair an older cached manifest too');
  assert.equal(manifest.start_url, base.start_url);
  assert.equal(manifest.scope, base.scope);
  assert.equal(manifest.icons[0].src, art.icon);
  for (const icon of manifest.icons) {
    const bytes = readFileSync(new URL(icon.src, root));
    assert.equal(icon.sizes, bytes.readUInt32BE(16) + 'x' + bytes.readUInt32BE(20));
  }
  // An October cache must still offer the right install art in December.
  const handlers = {};
  const self = { location:{ href:'https://example.test/app/service-worker.js', origin:'https://example.test' }, addEventListener:(type, fn) => { handlers[type] = fn; } };
  const sandbox = { self, URL, Response, Request, console,
    Date:class extends Date { constructor(...args) { super(...(args.length ? args : [date])); } },
    caches:{ match:async () => new Response(JSON.stringify(base)) },
    fetch:async () => { throw new Error('offline'); }
  };
  vm.createContext(sandbox);
  sandbox.importScripts = file => vm.runInContext(read(file), sandbox);
  vm.runInContext(sw, sandbox);
  let response;
  handlers.fetch({ request:new Request('https://example.test/app/manifest.webmanifest'), respondWith:value => { response = value; } });
  const offline = await (await response).json();
  assert.deepEqual(offline, manifest);
}
for (const page of ['index','her','him','tasks','notes','today','status','dates','memories','phone-check','guide','404']) {
  const html = read(page + '.html');
  assert.ok(html.indexOf('seasonal-assets.js') >= 0 && html.indexOf('seasonal-assets.js') < html.indexOf('seasonal-theme.js'));
  if (page !== '404') assert.match(html, /rel="manifest" href="manifest.webmanifest"/);
}
console.log('SEASONAL ART: files, dimensions, page coverage, install identity and offline rollover checked');
