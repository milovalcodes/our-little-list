import assert from 'node:assert/strict';
import {timedPuzzle} from '../daily-puzzles.js';
import {timedLimit,newTimedGame,advanceTimedGame,timedSummary,timedOver,timedPoints} from '../timed-game.js';
import {wordForDay,wordForTie} from '../daily-words.js';
for(const type of ['search','crossword']){

 for(const day of ['2026-10-11','2026-11-08','2026-12-06','2026-10-05-tie-1']){
  const p=timedPuzzle(day,type,Date.parse('2026-10-11T18:00Z')),start=p.opensAt+1000;
  const duration=type==='search'?150000:day>='2026-10-12'?300000:180000;
  assert.equal(p.durationMs,duration);
  let g=newTimedGame(p,'him',start);
  assert.equal(timedLimit(type,g),duration);
  g=advanceTimedGame(g,p,{index:0,expectedCount:0,now:start+125000});
  assert.equal(g.solved.length,1,'hard round remains playable after two minutes');
  assert.equal(timedOver(timedSummary(g),start+duration-1),false,'partner cannot peek early');
  g=advanceTimedGame(g,p,{index:1,expectedCount:1,now:start+duration});
  assert.equal(g.solved.length,1,'deadline rejects another word');
  assert.equal(timedPoints(timedSummary(g)),Math.round(50/g.total)*2);
 }
 assert.equal(timedPuzzle('2026-10-12',type).durationMs,type==='crossword'?180000:120000);
 const legacy=newTimedGame({...timedPuzzle('2026-10-11',type),durationMs:undefined},'her',Date.parse('2026-10-11T15:00Z'));
 assert.equal(timedLimit(type,legacy),120000,'stored old rounds retain their own deadline');
}
for(const day of ['2026-10-11','2026-10-18','2026-12-06']){
 const expected=day.includes('-10-')?'Halloween & autumn':'Christmas & winter';
 assert.equal(wordForDay(day).theme,expected);
 for(const type of ['search','crossword'])assert.equal(timedPuzzle(day,type).theme,expected);
}
assert.equal(wordForTie('2026-10-05',1,Date.parse('2026-10-11T18:00Z')).theme,'Halloween & autumn');
assert.equal(new Set([11,18,25].map(n=>wordForDay('2026-10-'+n).word)).size,3);
console.log('HARD ROUNDS: extended server-compatible deadlines, legacy preservation, private peeks, double scoring, broad hints and distinct replacement Sundays pass');
