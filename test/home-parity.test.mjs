import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const her = readFileSync(new URL('../her.html', import.meta.url), 'utf8').split(/\r?\n/);
const him = readFileSync(new URL('../him.html', import.meta.url), 'utf8').split(/\r?\n/);
assert.equal(her.length, him.length, 'home pages should have the same layout');
const expected = new Set([4, 5, 12, 17, 22, 27]);
const different = her.flatMap((line, index) => line === him[index] ? [] : [index]);
assert.deepEqual(different, [...expected], 'only the theme, greeting, and self/partner links may differ');
assert.match(her[22], /sky-sun is-self/);
assert.match(him[27], /sky-moon is-self/);
console.log('HOME PAGES STAY IN STEP');
