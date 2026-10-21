import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORD_HINTS,wordHint} from '../word-hints.js';
import {WORD_BOOK} from '../word-book.js';
import {LITTLE_WORD_CATALOG} from '../daily-words.js';
import {answerPool} from '../round-library.js';

// Include retired and seasonal answers: saved rounds outlive catalog changes.
const words=new Set([
 ...WORD_BOOK.filter(e=>e.word.length===5),...LITTLE_WORD_CATALOG,
 ...[false,true].flatMap(h=>['','october','december'].flatMap(s=>answerPool(h,s))),
].map(e=>e.word.toUpperCase()));
for(const word of words){
 const hint=wordHint(word);
 assert.ok(hint,`Missing individual hint: ${word}`);
 assert.ok(hint.length<=24&&hint.split(/\s+/).length<=3,`Use a broad category, not a clue: ${word}`);
 assert.ok(!new RegExp(`\\b${word}\\b`,'i').test(hint),`Hint reveals answer: ${word}`);
}
assert.equal(Object.keys(WORD_HINTS).length,words.size,'no missing or unused hint rows');
assert.ok(new Set(Object.values(WORD_HINTS)).size<words.size,'appropriate categories may be shared by multiple words');
assert.equal(wordHint('alone'),'Social life');
assert.equal(wordHint('whale'),'Animals');
assert.equal(wordHint('baker'),'Jobs');
assert.equal(wordHint('apple'),'Food');
assert.equal(wordHint('ocean'),'Geography');
assert.equal(wordHint('lunar'),'Space');
assert.equal(wordHint('ALONE'),wordHint('alone'));
assert.equal(wordHint('future-unknown-answer'),'','unknown words must not fall back to a batch category');
const ui=readFileSync(new URL('../daily-word.js',import.meta.url),'utf8');
assert.match(ui,/escapeHtml\(wordHint\(puzzle.word\)\)/,'saved rounds use the actual answer to resolve their hint');
assert.doesNotMatch(ui,/puzzle\.theme\|\|/,'stored category labels must not override word-specific hints');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
assert.ok(sw.includes("'./word-hints.js'"),'individual hints must work offline');
console.log(`WORD HINTS: ${words.size} individually assigned, broad categories cover current, seasonal and legacy answers`);
