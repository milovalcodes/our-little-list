// Every module a page can load has to be in the service worker's precache, or
// the first launch with no signal after an update fails to build the module
// graph (the dock and popups just do not appear). Two new modules were missed
// this way, so walk the real import graph instead of trusting a hand list.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');
const sw = read('service-worker.js');
const listed = new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map(match => match[1]));

const pages = readdirSync(root).filter(name => name.endsWith('.html'));
const seen = new Set();
const queue = [];
for (const page of pages) {
  for (const match of read(page).matchAll(/<script[^>]*src="([^"]+\.js)"/g)) {
    if (!/^https?:/.test(match[1])) queue.push(match[1].replace(/^\.\//, ''));
  }
}
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file) || !existsSync(new URL(file, root))) continue;
  seen.add(file);
  const source = read(file);
  for (const match of source.matchAll(/(?:import\s[^'"]*?from\s*|import\s*\(\s*|import\s+)['"]\.\/([^'"]+\.js)['"]/g)) queue.push(match[1]);
}

const missing = [...seen].filter(file => !listed.has(file));
assert.deepEqual(missing, [], `modules pages load but the service worker does not precache: ${missing.join(', ')}`);
const gone = [...listed].filter(file => !existsSync(new URL(file.split(/[?#]/)[0], root)));
assert.deepEqual(gone, [], `precache lists files that do not exist: ${gone.join(', ')}`);
console.log(` ok  all ${seen.size} modules the pages load are precached, and nothing missing is listed`);
console.log('\nPRECACHE CLEAN');
