import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {practicePuzzle,PRACTICE_WORDS,PRACTICE_COUNTS} from '../practice-catalog.js';
import {PRACTICE_EDITION_WORDS as PRACTICE_BANK,PRACTICE_EDITION_EXTRAS as PRACTICE_BOARD_EXTRAS} from '../practice-edition-bank.js';
import {EDITION_WORDS} from '../puzzle-edition.js';
import {practiceStore} from '../practice-store.js';
import {DAILY_WORDS,SUNDAY_WORDS,wordForDay} from '../daily-words.js';
import {WORD_LEXICON} from '../word-lexicon.js';
import {entryCells,selectedSearchWord,timedPuzzle} from '../daily-puzzles.js';
assert.deepEqual(PRACTICE_COUNTS,{word:200,search:100,crossword:100});
// Any future layout/content change needs a new edition, not silently reused saves.
const editionHash=createHash('sha256');
for(const [type,count]of Object.entries(PRACTICE_COUNTS))for(let i=0;i<count;i++)editionHash.update(JSON.stringify(practicePuzzle(type,i)));
assert.equal(editionHash.digest('hex'),'78c3ebcafdee7309d3640d017ab0e238199c2a79cfd5930250aa85f62555cd56','v2 practice boards must stay stable');
const bank=[...PRACTICE_BANK,...PRACTICE_BOARD_EXTRAS];
assert.equal(new Set(bank.map(e=>e.word)).size,bank.length);
assert.ok(bank.every(e=>/^[A-Z]{3,12}$/.test(e.word)&&e.clue.length>8));
assert.equal(new Set(PRACTICE_WORDS.map(e=>e.word)).size,200);
const daily=new Set(EDITION_WORDS.map(e=>e.word));
assert.ok(PRACTICE_WORDS.filter(e=>!daily.has(e.word.toLowerCase())).length>=180);
assert.ok(PRACTICE_WORDS.every(e=>WORD_LEXICON.has(e.word.toLowerCase())));
assert.ok(WORD_LEXICON.size>=20148);
for(const type of ['search','crossword']){
 const signatures=new Set();
 for(let i=0;i<100;i++){
  const p=practicePuzzle(type,i);signatures.add(p.grid);
  assert.equal(p.entries.length,type==='search'?10:i<50?6:8);
  assert.ok(!('closesAt' in p)&&!('opensAt' in p));
  for(let n=0;n<p.entries.length;n++){
   const cells=entryCells(p,n);
   assert.equal(cells.map(c=>p.grid[c]).join(''),p.entries[n].word);
   assert.ok(cells.every(c=>c>=0&&c<p.grid.length));
   if(type==='search'){
    assert.equal(selectedSearchWord(p,cells[0],cells.at(-1)).index,n);
    assert.equal(selectedSearchWord(p,cells.at(-1),cells[0]).index,n);
   }else assert.ok(p.entries.some((_,j)=>j!==n&&entryCells(p,j).some(c=>cells.includes(c))),'each crossword word crosses another');
  }
  assert.equal(practicePuzzle(type,i).grid,p.grid);
 }
 assert.equal(signatures.size,100);
}
assert.throws(()=>practicePuzzle('word',200));
assert.throws(()=>practicePuzzle('unknown',0));
const docs=new Map(),storage={getItem:k=>docs.get(k),setItem:(k,v)=>docs.set(k,v)};
const a=practiceStore('house:him',storage),b=practiceStore('house:her',storage);
a.save('word',0,{guesses:['abcde'],completed:true});a.move('word',8);
assert.equal(a.completed('word'),1);assert.equal(b.completed('word'),0);
assert.equal(practiceStore('house:him',storage).cursor('word'),8);
assert.ok([...docs.keys()].every(k=>k.startsWith('our-little-app-practice-v2:')));
const blocked=practiceStore('blocked',{getItem(){throw Error();},setItem(){throw Error();}});
blocked.save('word',0,{guesses:['abcde']});assert.equal(blocked.load('word',0).guesses.length,1);assert.match(blocked.warning,/can’t save/);
for(const name of ['practice.js','practice-store.js','practice-catalog.js']){
 const code=readFileSync(new URL('../'+name,import.meta.url),'utf8');
 assert.doesNotMatch(code,/playTimedPuzzle|playWord|data\.(?:setTo|addTo|notify|updateIn)|setInterval/);
}
// The previous edition's last day remains byte-for-byte unchanged.
for(const [day,word,search,crossword] of [
 ['2026-10-09','cloak','d46bc48b03354a3e4cfcd561347970c9589494b56cff77912a046829799fb52c','08d6037232b954c2037f305550fd9116dfa7fc56cd9f0fdd62a90ac7287ecf7c'],
]){
 assert.equal(wordForDay(day).word,word);
 for(const [type,hash] of [['search',search],['crossword',crossword]])assert.equal(createHash('sha256').update(JSON.stringify(timedPuzzle(day,type))).digest('hex'),hash);
}
console.log('Practice: 400 valid puzzles, 200 distinct boards, accepted answers, separate saves, storage failure and unchanged daily schedule pass');
