import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {practicePuzzle,PRACTICE_WORDS,PRACTICE_COUNTS} from '../practice-catalog.js';
import {PRACTICE_BANK,PRACTICE_BOARD_EXTRAS} from '../practice-bank.js';
import {practiceStore} from '../practice-store.js';
import {DAILY_WORDS,SUNDAY_WORDS,wordForDay} from '../daily-words.js';
import {WORD_LEXICON} from '../word-lexicon.js';
import {entryCells,selectedSearchWord,timedPuzzle} from '../daily-puzzles.js';
assert.deepEqual(PRACTICE_COUNTS,{word:200,search:100,crossword:100});
const bank=[...PRACTICE_BANK,...PRACTICE_BOARD_EXTRAS];
assert.equal(new Set(bank.map(e=>e.word)).size,bank.length);
assert.ok(bank.every(e=>/^[A-Z]{3,9}$/.test(e.word)&&e.clue.length>8));
assert.equal(new Set(PRACTICE_WORDS.map(e=>e.word)).size,200);
const daily=new Set([...DAILY_WORDS,...SUNDAY_WORDS]);
assert.ok(PRACTICE_WORDS.filter(e=>!daily.has(e.word.toLowerCase())).length>=180);
assert.ok(PRACTICE_WORDS.every(e=>WORD_LEXICON.has(e.word.toLowerCase())));
assert.ok(WORD_LEXICON.size>=20148);
for(const type of ['search','crossword']){
 const signatures=new Set();
 for(let i=0;i<100;i++){
  const p=practicePuzzle(type,i);signatures.add(p.grid);
  assert.equal(p.entries.length,type==='search'?10:6);
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
assert.ok([...docs.keys()].every(k=>k.startsWith('our-little-app-practice-v1:')));
const blocked=practiceStore('blocked',{getItem(){throw Error();},setItem(){throw Error();}});
blocked.save('word',0,{guesses:['abcde']});assert.equal(blocked.load('word',0).guesses.length,1);assert.match(blocked.warning,/can’t save/);
for(const name of ['practice.js','practice-store.js','practice-catalog.js']){
 const code=readFileSync(new URL('../'+name,import.meta.url),'utf8');
 assert.doesNotMatch(code,/playTimedPuzzle|playWord|data\.(?:setTo|addTo|notify|updateIn)|setInterval/);
}
// Frozen daily puzzles: practice and dictionary expansion must not move the schedule.
for(const [day,word,search,crossword] of [
 ['2026-10-09','cloak','d46bc48b03354a3e4cfcd561347970c9589494b56cff77912a046829799fb52c','08d6037232b954c2037f305550fd9116dfa7fc56cd9f0fdd62a90ac7287ecf7c'],
 ['2026-10-11','ghoul','b79282cf3d2f6ea871b3ff1997ea60c832be86ed3cc18c0cb123f538c5cbe016','967ea09bec8a29dda4e94ce34991ea0341154ddf41bab41d7ada9e29ea51ba16'],
 ['2026-11-04','acorn','dc7d73d54fead2ea2a05f3fc6467aac599f31297bf6094d38c2597c08040fac2','e0914cac3f7e62c6c299fac436762c0013e258fcf50b218161a3982aeaa37e51'],
 ['2026-12-06','hoary','c62b416f6d8559d045ec6c82d1e58b0f030b55c7fc921b6a5e30aa7c23bffbeb','cadd3e6d3ffc99588a17cfd614260f98e923e4463516307b0d94169e00b754d3']
]){
 assert.equal(wordForDay(day).word,word);
 for(const [type,hash] of [['search',search],['crossword',crossword]])assert.equal(createHash('sha256').update(JSON.stringify(timedPuzzle(day,type))).digest('hex'),hash);
}
console.log('Practice: 400 valid puzzles, 200 distinct boards, accepted answers, separate saves, storage failure and unchanged daily schedule pass');
