import assert from 'node:assert/strict';
import {activityClock,activityWindow} from '../activity-clock.js';
import {DAILY_WORDS,SUNDAY_WORDS,wordForDay,wordForTie} from '../daily-words.js';
import {WORD_LEXICON} from '../word-lexicon.js';
import {scoreGuess,nextWordAttempt,wordSummary} from '../word-game.js';
import {wordPoints,scoreWeek,weekForDay,reigningCrowns,duelOutcome} from '../word-scores.js';
import {settleWordWeeks} from '../worker/src/word-week.js';
import {ensureQuestionOfDay} from '../worker/src/index.js';
assert.equal(activityClock(new Date('2026-10-09T12:59:59Z')).day,'2026-10-08');
assert.equal(activityClock(new Date('2026-10-09T13:00:00Z')).day,'2026-10-09');
assert.equal(activityClock(new Date('2026-12-09T13:59:59Z')).day,'2026-12-08');
assert.equal(activityClock(new Date('2026-12-09T14:00:00Z')).day,'2026-12-09');
for(const [day,hours] of [['2026-10-31',25],['2027-03-13',23],['2026-10-08',24]]){
  const w=activityWindow(day);assert.equal((w.closesAt-w.opensAt)/3600000,hours);
}
assert.equal(new Set([...DAILY_WORDS,...SUNDAY_WORDS]).size,DAILY_WORDS.length+SUNDAY_WORDS.length);
assert.ok(DAILY_WORDS.length>500&&SUNDAY_WORDS.length>300&&WORD_LEXICON.size>15000);
assert.ok([...DAILY_WORDS,...SUNDAY_WORDS].every(w=>/^[a-z]{5}$/.test(w)));
for(let i=0;i<365;i++){const day=new Date(Date.UTC(2026,9,8+i)).toISOString().slice(0,10);assert.ok((new Date(day+'T12:00Z').getUTCDay()===0?SUNDAY_WORDS:DAILY_WORDS).includes(wordForDay(day).word));}
assert.deepEqual(scoreGuess('allee','apple'),['correct','present','absent','absent','correct']);
assert.deepEqual(scoreGuess('sassy','sissy'),['correct','absent','correct','correct','correct']);
const puzzle={day:'2026-10-08',word:'apple',opensAt:0,closesAt:10000};
let game=nextWordAttempt(null,puzzle,{day:puzzle.day,person:'her',guess:'grape',expectedCount:0,now:10});
assert.throws(()=>nextWordAttempt(game,puzzle,{day:puzzle.day,person:'her',guess:'grape',expectedCount:1,now:20}),/Already/);
assert.throws(()=>nextWordAttempt(game,puzzle,{day:puzzle.day,person:'her',guess:'apple',expectedCount:0,now:20}),/other screen/);
assert.throws(()=>nextWordAttempt(game,puzzle,{day:puzzle.day,person:'him',guess:'apple',expectedCount:1,now:20}),/not your/);
game=nextWordAttempt(game,puzzle,{day:puzzle.day,person:'her',guess:'apple',expectedCount:1,now:20});
assert.equal(wordPoints(wordSummary(game)),40);
assert.throws(()=>nextWordAttempt(game,puzzle,{day:puzzle.day,person:'her',guess:'table',expectedCount:2,now:20}),/finished/);
assert.throws(()=>nextWordAttempt(null,puzzle,{day:puzzle.day,person:'her',guess:'apple',expectedCount:0,now:10000}),/closed/);
assert.equal(wordPoints({day:'2026-10-11',done:true,won:true,attempts:1}),200);
assert.equal(wordPoints({day:'2026-10-11',done:true,won:false,attempts:5}),0);
assert.deepEqual(weekForDay('2026-10-11').days,['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11']);
const result=(person,day,attempts=1,won=true,done=true)=>({person,day,attempts,won,done,updatedAt:1});
assert.equal(duelOutcome(result('her','2026-10-05-tie-1'),result('him','2026-10-05-tie-1',1,false,false)),'her','20 cannot be caught after a missed first guess');
assert.equal(duelOutcome(result('her','2026-10-05-tie-1'),null),'','20 can still be tied');
assert.equal(duelOutcome(result('her','2026-10-05-tie-1'),result('him','2026-10-05-tie-1')),'tie');
assert.deepEqual(reigningCrowns([{week:'2026-10-05',winners:['her']},{week:'2026-10-12',winners:['her']}]),{week:'2026-10-12',her:2,him:0});
assert.deepEqual(reigningCrowns([{week:'2026-10-05',winners:['her']},{week:'2026-10-12',winners:['him']}]),{week:'2026-10-12',her:0,him:1});
const docs=new Map(),base='households/TEST';
const db={
  async get(path){return docs.get(path)||null;},
  async list(path){return [...docs].filter(([key])=>key.startsWith(path+'/')).map(([path,fields])=>({id:path.split('/').pop(),...fields}));},
  async create(path,fields){if(docs.has(path))return false;docs.set(path,structuredClone(fields));return true;},
  async createMany(records){if(records.some(r=>docs.has(r.path)))return false;records.forEach(r=>docs.set(r.path,structuredClone(r.fields)));return true;}
};
const morning=Date.parse('2026-10-08T13:00Z');
await ensureQuestionOfDay(db,base,morning);await ensureQuestionOfDay(db,base,morning+60000);
assert.ok(docs.has(base+'/wordPuzzles/2026-10-08'));
assert.equal([...docs.values()].filter(v=>v.kind==='activities-open').length,2,'exactly one opening ping per phone');
docs.set(base+'/wordResults/2026-10-11-her',result('her','2026-10-11',2));
docs.set(base+'/wordResults/2026-10-11-him',result('him','2026-10-11',2));
const sunday=Date.parse('2026-10-11T18:00Z');
await settleWordWeeks(db,base,sunday);await settleWordWeeks(db,base,sunday);
assert.ok(docs.has(base+'/wordDuels/2026-10-05-tie-1'));
assert.ok(!docs.has(base+'/wordWeeks/2026-10-05'));
for(const p of ['her','him'])docs.set(base+'/wordResults/2026-10-05-tie-1-'+p,result(p,'2026-10-05-tie-1',3));
await settleWordWeeks(db,base,sunday+60000);
assert.ok(docs.has(base+'/wordDuels/2026-10-05-tie-2'));
assert.equal(docs.get(base+'/wordDuelEnds/2026-10-05-tie-1').outcome,'tie');
docs.set(base+'/wordResults/2026-10-05-tie-2-her',result('her','2026-10-05-tie-2',1));
docs.set(base+'/wordResults/2026-10-05-tie-2-him',result('him','2026-10-05-tie-2',1,false,false));
await settleWordWeeks(db,base,sunday+120000);await settleWordWeeks(db,base,sunday+180000);
assert.deepEqual(docs.get(base+'/wordWeeks/2026-10-05').winners,['her']);
assert.equal([...docs.keys()].filter(k=>k.includes('word-winner-')).length,2);
// A missed Sunday does not stall the following week.
docs.set(base+'/wordResults/2026-10-12-him',result('him','2026-10-12',4));
await settleWordWeeks(db,base,Date.parse('2026-10-19T13:00Z'));
assert.deepEqual(docs.get(base+'/wordWeeks/2026-10-12').winners,['him']);
console.log('DAILY WORD: clocks, banks, repeated letters, attempts, points, Sunday settlement, repeating ties, early clinch, crowns and idempotent pings pass');

const {normalizeWeekRecord}=await import('../word-scores.js');
assert.deepEqual(normalizeWeekRecord({week:'2026-10-05',winners:['him']}).scores,{her:0,him:0});
assert.deepEqual(normalizeWeekRecord({scores:{her:'<img>',him:99},winners:null},{scores:{her:3,him:4}}).scores,{her:3,him:4});
assert.deepEqual(normalizeWeekRecord({winners:['him','him','bad']}).winners,['him']);

assert.deepEqual([1,2,3,4,5].map(attempts=>wordPoints({day:'2026-10-08',done:true,won:true,attempts})),[100,40,30,20,10]);
assert.deepEqual([1,2,3,4,5].map(attempts=>wordPoints({day:'2026-10-11',done:true,won:true,attempts})),[200,80,60,40,20]);
const perfect=weekForDay('2026-10-12').days.map(day=>result('her',day));
assert.equal(scoreWeek('2026-10-12',perfect).scores.her,800);
assert.equal(normalizeWeekRecord({scores:{her:80,him:0}}).scores.her,800);
assert.equal(duelOutcome(result('her','2026-10-05-tie-1',2),result('him','2026-10-05-tie-1',1,false,false)),'','8 can still be tied after one miss');
assert.equal(duelOutcome(result('her','2026-10-05-tie-1',2),result('him','2026-10-05-tie-1',2,false,false)),'her','8 cannot be caught after two misses');
