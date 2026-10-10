import assert from 'node:assert/strict';
import {EDITION_WORDS,NEW_POOLS,usesNewEdition,editionWordPool} from '../puzzle-edition.js';
import {PRACTICE_EDITION_WORDS,PRACTICE_EDITION_EXTRAS} from '../practice-edition-bank.js';
import {practicePuzzle,PRACTICE_WORDS} from '../practice-catalog.js';
import {practiceStore} from '../practice-store.js';
import {WORD_LEXICON} from '../word-lexicon.js';
import {wordForDay,wordForTie} from '../daily-words.js';
import {timedPuzzle,PUZZLE_LIMIT_MS} from '../daily-puzzles.js';
import {newTimedGame,advanceTimedGame,timedSummary} from '../timed-game.js';
import {activityClock} from '../activity-clock.js';
import {ensureQuestionOfDay} from '../worker/src/index.js';

assert.equal(PUZZLE_LIMIT_MS,120000);
assert.equal(wordForDay('2026-10-09').catalogVersion,2);
assert.equal(wordForDay(activityClock(new Date('2026-10-10T12:59:59Z')).day).catalogVersion,2);
assert.equal(wordForDay(activityClock(new Date('2026-10-10T13:00:00Z')).day).catalogVersion,4);
assert.equal(usesNewEdition('2026-10-05-tie-1',Date.parse('2026-10-10T12:59:59Z')),false);
assert.equal(wordForTie('2026-10-05',1,Date.parse('2026-10-10T13:00Z')).catalogVersion,4);
assert.equal(new Set(EDITION_WORDS.map(e=>e.id)).size,EDITION_WORDS.length);
assert.ok(EDITION_WORDS.every(e=>/^[a-z]{5}$/.test(e.word)&&WORD_LEXICON.has(e.word)));
for(const season of ['','october','december']){
 const words=EDITION_WORDS.filter(e=>e.season===season);
 assert.equal(new Set(words.map(e=>e.word)).size,words.length,'no cross-difficulty duplicates within an answer season');
 assert.ok(editionWordPool(false,season).length>=31);
 assert.ok(editionWordPool(true,season).length>=14);
 // Harder patterns, not academic obscurity. The editorial review is still human.
 const repeats=a=>a.filter(e=>new Set(e.word).size<5).length/a.length;
 assert.ok(repeats(editionWordPool(true,season))>repeats(editionWordPool(false,season)),'hard words lean more on repeated-letter deduction');
}
const retiredJargon=new Set('reify meson muons redox ileum clade taxon schwa quoin paean prion limen numen hypha mesic pappi sorus tilth xeric glume arils kyrie neume firns gelid nival nilas serac neves metonymy synecdoche aporia ontology operon'.split(' '));
for(const e of [...EDITION_WORDS,...NEW_POOLS.flatMap(p=>p.entries),...PRACTICE_EDITION_WORDS,...PRACTICE_EDITION_EXTRAS])assert.ok(!retiredJargon.has(e.word.toLowerCase()),'do not restore the specialist-vocabulary edition: '+e.word);
for(const p of NEW_POOLS){
 assert.ok(p.entries.length>=30);
 assert.equal(new Set(p.entries.map(e=>e.word)).size,p.entries.length);
 assert.ok(p.entries.every(e=>/^[A-Z]{3,12}$/.test(e.word)&&e.clue.length>15&&!/REMOVE|TODO|placeholder/.test(e.clue)));
 assert.ok(p.entries.filter(e=>e.word.length<=(p.difficulty==='hard'?10:9)).length>=24,'enough compact words to vary the boards');
}
assert.ok([...PRACTICE_EDITION_WORDS,...PRACTICE_EDITION_EXTRAS].every(e=>e.clue&&!/REMOVE|TODO/.test(e.clue)));
assert.ok(PRACTICE_WORDS.every(e=>!EDITION_WORDS.some(d=>d.word===e.word.toLowerCase())),'practice answers are separate from the active daily bank');
const docs=new Map([1,2].map(v=>['our-little-app-practice-v'+v+':old:word:0',JSON.stringify({guesses:['apple'],completed:true})]));
const saved=JSON.stringify([...docs]);
const store=practiceStore('old',{getItem:k=>docs.get(k),setItem:(k,v)=>docs.set(k,v)});
assert.equal(store.completed('word'),0);assert.equal(JSON.stringify([...docs]),saved,'older edition saves are left intact');
assert.deepEqual(store.load('word',0).guesses,[]);
for(const type of ['word','search','crossword'])for(const i of [0,49,50,99]){
 const p=practicePuzzle(type,i);
 assert.equal(p.difficulty,i<(type==='word'?100:50)?'normal':'hard');
}
for(const month of [9,10,11])for(let i=0;i<60;i++){
 const day=new Date(Date.UTC(2026,month,10+i)).toISOString().slice(0,10);
 for(const type of ['search','crossword']){
  const p=timedPuzzle(day,type),target=type==='search'?10:p.hard?8:6;
  assert.equal(p.catalogVersion,4);assert.equal(p.entries.length,target);
  assert.equal(p.size,p.hard?12:11);
  if(type==='crossword')assert.ok(p.entries.reduce((n,e)=>n+e.word.length,0)<=80);
  // Exercise each saved move below the deadline; this checks mechanics, not human solve speed.
  let g=newTimedGame(p,'him',p.opensAt+1000);
  for(let n=0;n<target;n++)g=advanceTimedGame(g,p,{index:n,expectedCount:n,now:g.startedAt+(n+1)*10000});
  assert.equal(timedSummary(g).count,target);
  assert.equal(g.done,true);
 }
}
// Server rollover preserves already-open boards and publishes one shared new edition.
const data=new Map(),base='households/TEST',db={
 async get(p){return data.get(p)||null;},
 async list(p){return [...data].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>({id:k.split('/').at(-1),...v}));},
 async create(p,v){if(data.has(p))return false;data.set(p,structuredClone(v));return true;},
 async createMany(rows){if(rows.some(r=>data.has(r.path)))return false;rows.forEach(r=>data.set(r.path,structuredClone(r.fields)));return true;}
};
await ensureQuestionOfDay(db,base,Date.parse('2026-10-10T12:59Z'));
const old=structuredClone([...data]);
await ensureQuestionOfDay(db,base,Date.parse('2026-10-10T13:00Z'));
for(const [key,v]of old)assert.deepEqual(data.get(key),v);
for(const collection of ['wordPuzzles','timedPuzzles']){
 const keys=collection==='wordPuzzles'?['2026-10-10']:['2026-10-10-search','2026-10-10-crossword'];
 for(const key of keys)assert.equal(data.get(base+'/'+collection+'/'+key).catalogVersion,4);
}
const size=data.size;await ensureQuestionOfDay(db,base,Date.parse('2026-10-10T13:01Z'));assert.equal(data.size,size);
console.log('Puzzle edition: reviewed catalogs, exact 9am cutover, 360 compact playable boards, separate practice saves and idempotent publication pass');
