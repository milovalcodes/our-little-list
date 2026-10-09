import assert from 'node:assert/strict';
import {SEASONAL_POOLS,SEASONAL_WORDS,puzzleSeason,seasonalWords} from '../seasonal-puzzles.js';
import {PUZZLE_THEMES,catalogPool} from '../puzzle-catalog.js';
import {wordForDay,wordForTie} from '../daily-words.js';
import {timedPuzzle} from '../daily-puzzles.js';
import {activityClock} from '../activity-clock.js';
import {ensureQuestionOfDay} from '../worker/src/index.js';
import {readFileSync} from 'node:fs';

assert.equal(new Set(SEASONAL_WORDS.map(e=>e.id)).size,SEASONAL_WORDS.length);
for(const season of ['october','december']){
 const entries=SEASONAL_WORDS.filter(e=>e.season===season);
 assert.equal(new Set(entries.map(e=>e.word)).size,entries.length,'normal and hard answers do not overlap within a season');
 assert.ok(seasonalWords(season).length>=31);
 assert.ok(seasonalWords(season,true).length>=14);
}
assert.ok(SEASONAL_WORDS.every(e=>/^[a-z]{5}$/.test(e.word)&&e.theme));
for(const pool of SEASONAL_POOLS){
 assert.ok(pool.entries.length>=24);
 assert.ok(pool.entries.every(e=>/^[A-Z]+$/.test(e.word)&&e.clue.length>10));
 assert.ok(catalogPool(pool.difficulty,pool.id).length>=24);
}
for(let year=2026;year<=2033;year++)for(const month of ['10','12']){
 const season=month==='10'?'october':'december',seen=new Set();
 for(let date=1;date<=31;date++){
  const day=`${year}-${month}-${String(date).padStart(2,'0')}`,p=wordForDay(day);
  if(!p)continue;
  assert.ok(SEASONAL_WORDS.some(e=>e.id===p.entryId&&e.season===season&&e.word===p.word&&e.theme===p.theme));
  assert.ok(!seen.has(p.word),'no repeated Little Word within a seasonal month');seen.add(p.word);
  for(const type of ['search','crossword']){
   const board=timedPuzzle(day,type);
   assert.equal(PUZZLE_THEMES.find(t=>t.id===board.themeId&&t.difficulty===board.difficulty).season,season);
   assert.ok(board.entries.length>=4);
   if(type==='search')assert.equal(board.entries.length,10);
  }
 }
}
for(const month of ['01','02','03','04','05','06','07','08','09','11']){
 const day=`2027-${month}-11`;
 assert.equal(puzzleSeason(day),'');assert.ok(!SEASONAL_WORDS.some(e=>e.id===wordForDay(day).entryId));
 for(const type of ['search','crossword'])assert.ok(!/^(october|december)-/.test(timedPuzzle(day,type).themeId));
}
// Daily content follows the 9 a.m. activity window, independent of UTC midnight
// and the viewing phone's timezone; a fresh tie uses the actual opening month.
for(const [time,day,season]of [
 ['2026-11-01T13:59:59Z','2026-10-31','october'],
 ['2026-11-01T14:00:00Z','2026-11-01',''],
 ['2026-12-01T13:59:59Z','2026-11-30',''],
 ['2026-12-01T14:00:00Z','2026-12-01','december'],
 ['2027-01-01T13:59:59Z','2026-12-31','december'],
 ['2027-01-01T14:00:00Z','2027-01-01',''],
]){assert.equal(activityClock(new Date(time)).day,day);assert.equal(puzzleSeason(day),season);}
for(const [time,season]of [['2026-11-01T03:59Z','october'],['2026-11-01T04:00Z',''],['2026-12-01T05:00Z','december'],['2027-01-01T05:00Z','']]){
 const now=Date.parse(time),id='2026-09-28-tie-1';
 assert.equal(puzzleSeason(id,now),season);
 assert.equal(wordForTie('2026-09-28',1,now).entryId.includes(season+'-hard-'),Boolean(season));
 for(const type of ['search','crossword']){
  const p=timedPuzzle(id,type,now);
  assert.equal(PUZZLE_THEMES.find(t=>t.id===p.themeId&&t.difficulty==='hard').season,season);
 }
}
// Simulate an update on a day that already has a v1 ocean board. Neither saved
// answers nor progress may be changed to dress up today's round.
const docs=new Map(),base='households/TEST',db={
 async get(p){return docs.get(p)||null;},
 async list(p){return [...docs].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>({id:k.split('/').at(-1),...v}));},
 async create(p,v){if(docs.has(p))return false;docs.set(p,structuredClone(v));return true;},
 async createMany(rows){if(rows.some(r=>docs.has(r.path)))return false;rows.forEach(r=>docs.set(r.path,structuredClone(r.fields)));return true;}
};
const oldWord={...wordForDay('2026-10-09'),word:'ocean',theme:'Ocean & water',catalogVersion:1,entryId:'word-ocean'};
const oldBoard={...timedPuzzle('2026-09-30','search'),day:'2026-10-09',theme:'By the ocean',themeId:'ocean',catalogVersion:1};
docs.set(base+'/wordPuzzles/2026-10-09',oldWord);docs.set(base+'/timedPuzzles/2026-10-09-search',oldBoard);
await ensureQuestionOfDay(db,base,Date.parse('2026-10-09T18:00Z'));
assert.deepEqual(docs.get(base+'/wordPuzzles/2026-10-09'),oldWord);
assert.deepEqual(docs.get(base+'/timedPuzzles/2026-10-09-search'),oldBoard);
assert.match(docs.get(base+'/timedPuzzles/2026-10-09-crossword').themeId,/^october-/);
const pingCount=[...docs.values()].filter(v=>v.kind==='activities-open').length;
await ensureQuestionOfDay(db,base,Date.parse('2026-10-09T18:01Z'));
assert.equal([...docs.values()].filter(v=>v.kind==='activities-open').length,pingCount);
for(const file of ['activities.html','daily-puzzles.js','word-tiebreaker.js','worker/src/activity-week.js'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/sopa/i);
console.log('SEASONAL PUZZLES: eight years, all pools, boundaries/DST, hard ties, no monthly word repeats, immutable old rounds and deduped pings pass');
