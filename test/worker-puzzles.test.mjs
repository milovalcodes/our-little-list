import './daily-calendar.test.mjs';
import assert from 'node:assert/strict';
import compiled from '../worker/src/compiled-crosswords.json' with {type:'json'};
import {fingerprint} from '../scripts/compile-worker-crosswords.mjs';
import {workerTimedPuzzle} from '../worker/src/puzzles.js';
import {timedPuzzle,entryCells} from '../daily-puzzles.js';
import {isMiniDay,weeklyRounds,roundWords,weekDays} from '../round-engine.js';
import {workerWordPuzzle} from '../worker/src/puzzles.js';
assert.equal(compiled.fingerprint,fingerprint(),'recompile Worker layouts whenever their source banks or generator change');
assert.ok(Date.parse(compiled.end+'T12:00Z')>Date.now()+180*86400000,'extend the compiled calendar before deploying within six months of its end');
for(const [day,board]of Object.entries(compiled.days)){
 const hard=new Date(day+'T12:00Z').getUTCDay()===0;
 assert.equal(board.entries.length,hard?20:10);
 for(let i=0;i<board.entries.length;i++)assert.equal(entryCells(board,i).map(p=>board.grid[p]).join(''),board.entries[i].word);
}
for(const day of ['2026-10-12','2026-10-18','2026-12-01','2027-01-03','2027-03-14','2027-11-07']){
 if(day>='2026-10-21'||day<compiled.engineStart)assert.deepEqual(workerTimedPuzzle(day,'crossword'),day>=compiled.engineStart?weeklyRounds(day)[day].crossword:timedPuzzle(day,'crossword'),'new compiled daily board is identical to its reviewed generator');
 if(day>='2026-10-21')assert.deepEqual(workerWordPuzzle(day),weeklyRounds(day)[day].word);
}
const weeks=new Map();
for(const [day,rounds]of Object.entries(compiled.rounds)){
 const week=weekDays(day)[0],used=weeks.get(week)||new Set();
 for(const p of Object.values(rounds))for(const word of roundWords(p)){assert.ok(!used.has(word),week+' repeats '+word);used.add(word);}
 weeks.set(week,used);
 assert.equal(rounds.search.entries.length,10);assert.equal(rounds.crossword.entries.length,isMiniDay(day)?6:rounds.crossword.hard?20:10);
}
for(const when of ['2026-10-12','2026-12-12','2027-01-12'])for(let round=1;round<=70;round++){
 const p=workerTimedPuzzle('2026-10-05-tie-'+round,'crossword',Date.parse(when+'T18:00Z'));
 assert.equal(p.entries.length,20);assert.equal(p.durationMs,300000);
}
console.log('WORKER PUZZLES: two years of exact daily layouts, all hard tie themes, source fingerprint and deployment horizon pass');
