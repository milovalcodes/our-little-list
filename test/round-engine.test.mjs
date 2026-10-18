import assert from 'node:assert/strict';
import {weeklyRounds,freshRounds,roundWords,weekDays,assertRevision,isMiniDay,crosswordDuration,MINI_CROSSWORD_START} from '../round-engine.js';
import {prepareReset} from '../game-reset.js';
import {LIBRARY_STATS} from '../round-library.js';
import {activityWindow} from '../activity-clock.js';
import {nextWordAttempt,wordSummary} from '../word-game.js';
import {newTimedGame,advanceTimedGame,timedSummary} from '../timed-game.js';
import {notifyActivityResults} from '../worker/src/activity-week.js';
import {savedDailyRounds} from '../worker/src/puzzles.js';
assert.ok(LIBRARY_STATS.answers>=1300);assert.ok(LIBRARY_STATS.clues>=1000);
assert.equal(MINI_CROSSWORD_START,'2026-10-19');
for(const day of ['2026-10-12','2026-10-19','2026-10-26','2026-11-02','2026-11-30','2026-12-14','2026-12-21','2027-03-08']){
 const plan=weeklyRounds(day),used=Object.values(plan).flatMap(d=>Object.values(d).flatMap(roundWords));
 const expected=Object.values(plan).reduce((n,r)=>n+1+10+(isMiniDay(r.crossword.day)?6:r.crossword.hard?20:10),0);
 assert.equal(used.length,expected);assert.equal(new Set(used).size,expected,'one exclusion set across all three games and seven days');
 for(const [d,rounds]of Object.entries(plan)){
  assert.deepEqual(rounds.word.opensAt,activityWindow(d).opensAt);
  assert.equal(rounds.crossword.durationMs,crosswordDuration(d,rounds.crossword.hard));
  if(isMiniDay(d)){
   // The 5x5 lattice: blocks at the four inner corners, six five-letter answers.
   const c=rounds.crossword;assert.equal(c.size,5);assert.equal(c.catalogVersion,7);assert.equal(c.entries.length,6);
   assert.deepEqual([...c.grid].flatMap((ch,i)=>ch==='#'?[i]:[]),[6,8,16,18]);
   assert.deepEqual(c.entries.map(e=>e.start+'/'+e.step),['0/1','0/5','2/5','4/5','10/1','20/1']);
   assert.ok(c.entries.every(e=>e.word.length===5&&e.clue));
  }else assert.equal(rounds.crossword.catalogVersion,6);
  assert.equal(rounds.search.durationMs,rounds.search.hard?150000:120000);
  for(const puzzle of [rounds.crossword,rounds.search])for(const e of puzzle.entries)assert.equal([...e.word].map((_,i)=>puzzle.grid[e.start+i*e.step]).join(''),e.word);
 }
 const puzzles=Object.values(plan).flatMap(Object.values),now=activityWindow(day).opensAt+10000;
 for(const scope of ['word','search','crossword','all']){
  const reset=prepareReset({day,scope,puzzles,requestId:'unit-reset-'+scope,now});
  assert.equal(Object.keys(reset.rounds).length,scope==='all'?3:1);
  for(const p of Object.values(reset.rounds)){
   assert.equal(p.revision,1);assert.ok(roundWords(p).every(w=>!used.includes(w)));
  }
 }
}
const day='2026-10-12',p=weeklyRounds(day)[day].word,now=p.opensAt+1000,newP={...p,revision:1};
assert.throws(()=>nextWordAttempt(null,newP,{day,person:'him',guess:'apple',expectedCount:0,now}),/reset/);
const next=nextWordAttempt(null,newP,{day,person:'him',guess:'apple',expectedCount:0,expectedRevision:1,now});
assert.equal(wordSummary(next).revision,1);
assert.throws(()=>assertRevision(newP,1,{revision:0}),/reset/);
const timed={...weeklyRounds(day)[day].search,revision:1},g=newTimedGame(timed,'him',now);
assert.equal(timedSummary(g).revision,1);
assert.throws(()=>advanceTimedGame(g,timed,{index:0,expectedCount:0,expectedRevision:0,now}),/reset/);
assert.equal(advanceTimedGame(g,timed,{index:0,expectedCount:0,expectedRevision:1,now}).solved.length,1);
assert.throws(()=>prepareReset({day,scope:'all',puzzles:Object.values(weeklyRounds(day)[day]),requestId:'old',now:p.closesAt+1}),/day changed/i);
assert.deepEqual(weekDays('2026-10-18'),weekDays(day));
const base='households/demo',docs=new Map(),db={async get(p){return docs.get(p)||null;},async list(p){return [...docs].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>({id:k.split('/').at(-1),...v}));},async dayRange(p,first,last=first){return (await this.list(p)).filter(r=>r.day>=first&&r.day<=last);},async createMany(rows){if(rows.some(r=>docs.has(r.path)))return false;rows.forEach(r=>docs.set(r.path,r.fields));return true;}};
docs.set(base+'/wordPuzzles/'+day,{...newP});docs.set(base+'/wordResults/'+day+'-him',{day,person:'him',done:true,won:true,attempts:1,revision:0,updatedAt:now});
docs.set(base+'/activityEvents/'+day+'-word-waiting',{day,createdAt:now-1});
await notifyActivityResults(db,base,now);assert.equal([...docs.keys()].filter(k=>k.includes('/outbox/')).length,0,'retired result is ignored');
docs.set(base+'/wordResults/'+day+'-him',{day,person:'him',done:true,won:true,attempts:1,revision:1,updatedAt:now});
await notifyActivityResults(db,base,now);await notifyActivityResults(db,base,now);
assert.equal([...docs.keys()].filter(k=>k.includes('/outbox/')).length,0,'a reset does not send a second turn ping on the same day');
docs.delete(base+'/activityEvents/'+day+'-word-waiting');
await notifyActivityResults(db,base,now);await notifyActivityResults(db,base,now);
assert.equal([...docs.keys()].filter(k=>k.includes('/outbox/')).length,1);assert.equal(docs.get(base+'/outbox/activity-'+day+'-word-r1-waiting').kind,'game-turn');
db.create=async(path,fields)=>{if(docs.has(path))return false;docs.set(path,structuredClone(fields));return true;};
const tomorrow='2026-10-13',scheduled=await savedDailyRounds(db,base,tomorrow),plan=docs.get(base+'/gamePlans/'+day);
assert.equal(Object.keys(plan.days).length,7);assert.deepEqual(scheduled,weeklyRounds(tomorrow)[tomorrow]);
plan.days[tomorrow].word.word='apple';
assert.equal((await savedDailyRounds(db,base,tomorrow)).word.word,'apple','an existing weekly plan wins over a newly compiled bank');
console.log('ROUND ENGINE: weekly cross-game uniqueness, expanded catalogs, fresh individual/all resets, windows, layouts and stale-submit guards pass');
