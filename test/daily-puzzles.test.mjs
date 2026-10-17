import assert from 'node:assert/strict';
import {timedPuzzle,entryCells,selectedSearchWord} from '../daily-puzzles.js';
import {PUZZLE_CATALOG,catalogPool,wordTheme} from '../puzzle-catalog.js';
import {LITTLE_WORD_CATALOG} from '../daily-words.js';
import {newTimedGame,advanceTimedGame,timedSummary,timedPoints,timedCeiling,timedOver,timeBonus,timedMax} from '../timed-game.js';
import {trioProgress,leagueWeek,weekTimeSaved} from '../league-scores.js';
import {normalizeWeekRecord,wordPoints,weekForDay} from '../word-scores.js';
import {settleActivityWeeks,notifyActivityResults} from '../worker/src/activity-week.js';
assert.equal(new Set(PUZZLE_CATALOG.map(e=>e.id)).size,PUZZLE_CATALOG.length);
assert.ok(LITTLE_WORD_CATALOG.length>800);assert.equal(wordTheme('apple'),'Fruit');
for(let n=0;n<1000;n++){
 const day=new Date(Date.UTC(2026,9,9+n)).toISOString().slice(0,10);
 for(const type of ['search','crossword']){
  const p=timedPuzzle(day,type),bank=catalogPool(p.difficulty,p.themeId);
  assert.deepEqual(p,timedPuzzle(day,type));
  assert.equal(p.difficulty,new Date(day+'T12:00Z').getUTCDay()===0?'hard':'normal');
  assert.equal(p.entries.length,type==='search'?10:p.entries.length);assert.ok(p.entries.length>=4);
  const covered=new Set();
  p.entries.forEach((entry,i)=>{
   assert.ok(bank.some(e=>e.id===entry.id),'every word really belongs to the displayed theme');
   const cells=entryCells(p,i);cells.forEach(c=>{assert.ok(c>=0&&c<p.size*p.size);covered.add(c);});
   assert.equal(cells.map(c=>p.grid[c]).join(''),entry.word);
   if(type==='search'){assert.equal(selectedSearchWord(p,cells[0],cells.at(-1)).index,i);assert.equal(selectedSearchWord(p,cells.at(-1),cells[0]).index,i);}
  });
  if(type==='crossword'){
   [...p.grid].forEach((c,i)=>assert.equal(c!=='#',covered.has(i)));
   // Every maximal horizontal/vertical run is a clued word, not an accidental neighbour.
   for(const step of [1,p.size])for(let i=0;i<p.grid.length;i++){
    if(p.grid[i]==='#'||(step===1?i%p.size!==0&&p.grid[i-1]!=='#':i>=p.size&&p.grid[i-p.size]!=='#'))continue;
    let end=i;while(end+step<p.grid.length&&(step!==1||(end+1)%p.size!==0)&&p.grid[end+step]!=='#')end+=step;
    if(end>i)assert.ok(p.entries.some(e=>e.start===i&&e.step===step&&e.word.length===(end-i)/step+1));
   }
  }
 }
}
for(const day of ['2026-10-09','2026-10-11','2026-10-05-tie-1'])for(const type of ['search','crossword']){
 const p=timedPuzzle(day,type,Date.parse('2026-10-11T17:00Z')),now=p.opensAt+1000;
 for(let n=0;n<=p.entries.length;n++){
  let g=newTimedGame(p,'her',now);
  for(let i=0;i<n;i++)g=advanceTimedGame(g,p,{index:i,expectedCount:i,now:now+i*1000});
  if(!g.done)g=advanceTimedGame(g,p,{index:null,expectedCount:n,now:now+(p.durationMs||120000)});
  const expected=Math.round(n/p.entries.length*50)*(p.hard?2:1);
  assert.equal(timedPoints(g),expected);assert.equal(timedPoints(timedSummary(g)),expected);
 }
 let g=newTimedGame(p,'him',now);g=advanceTimedGame(g,p,{index:0,expectedCount:0,now:now+1000});
 assert.throws(()=>advanceTimedGame(g,p,{index:1,expectedCount:0,now:now+2000}),/other screen/);
 assert.throws(()=>advanceTimedGame(g,p,{index:0,expectedCount:1,now:now+2000}),/Already/);
 assert.equal(timedPoints(g,now+119999),0);
 assert.equal(timedPoints(g,now+(p.durationMs||120000)),Math.round(50/p.entries.length)*(p.hard?2:1),'closing a tab cannot lose already saved partial credit');
 assert.equal(timedOver(g,now+(p.durationMs||120000)),true);
}
const day='2026-10-05-tie-1',now=Date.parse('2026-10-11T18:00Z');
const word=(person,attempts=1,done=true,won=true)=>({day,person,attempts,done,won,updatedAt:now});
const timed=(person,type,count=10,done=true)=>({day,person,type,total:10,count,startedAt:now,finishedAt:done?now+1000:null,done,complete:count===10,closesAt:4102444800000});
assert.equal(trioProgress(day,{her:0,him:0},[word('her')],[],now).outcome,'','a word jackpot cannot beat two untouched games');
assert.equal(trioProgress(day,{her:0,him:0},[word('her'),word('him',1,false,false)],['search','crossword'].map(t=>timed('her',t)),now).outcome,'her');
assert.equal(trioProgress(day,{her:0,him:0},[word('her')],['search','crossword'].map(t=>timed('her',t)),now).outcome,'','400 can still be tied');
assert.equal(timedCeiling(timed('him','search',3,false),'search',now+120000),30);
assert.equal(trioProgress(day,{her:250,him:250},['her','him'].map(p=>word(p)),['her','him'].flatMap(p=>['search','crossword'].map(t=>timed(p,t))),now).outcome,'tie');
assert.equal(trioProgress('2026-10-19-tie-1',{her:0,him:0},[],[],now).ceiling.her,120+120+120,'a new-scale tie set can still earn 120 per game');
// Time bonus: +1 per 5 s left on a fully solved board, capped at +10, new days only.
{
 const at=Date.parse('2026-10-20T14:00Z');
 const board=(d,elapsed,count=10,type='search',durationMs=120000)=>({day:d,type,person:'her',total:10,count,startedAt:at,finishedAt:at+elapsed,done:true,complete:count===10,closesAt:at+86400000,durationMs});
 assert.equal(timedPoints(board('2026-10-20',20000)),60,'a fast clear earns the full +10');
 assert.equal(timedPoints(board('2026-10-20',97000)),54,'23 s left earns +4');
 assert.equal(timedPoints(board('2026-10-20',119999)),50,'under 5 s left earns nothing extra');
 assert.equal(timedPoints({...board('2026-10-20',120000,9),done:true}),45,'no bonus without every word');
 assert.equal(timedPoints(board('2026-10-25',20000,10,'crossword',300000)),120,'Sunday doubles the bonus too');
 assert.equal(timedPoints(board('2026-10-14',20000)),50,'old days keep their 50-point cap');
 assert.equal(timedPoints(board('2026-10-12-tie-1',20000)),100,'old-week tie rounds keep the old cap');
 assert.equal(timeBonus(board('2026-10-20',-5000)),10,'clock skew cannot exceed the cap');
 assert.deepEqual(['2026-10-14','2026-10-20','2026-10-25','2026-10-19-tie-1'].map(timedMax),[50,60,120,120]);
 assert.equal(timedCeiling(undefined,'search',at,'2026-10-19-tie-1'),120);
 // Points tie → more time left on solved boards wins; an exact tie still goes to hard rounds.
 const week='2026-10-19',words=['her','him'].map(person=>({day:'2026-10-20',person,attempts:2,done:true,won:true,updatedAt:at}));
 const run=(her,him,d='2026-10-20')=>[{...board(d,her),person:'her'},{...board(d,him),person:'him'}];
 const byTime=leagueWeek(week,words,run(10000,30000),at+86400000);
 assert.deepEqual(byTime.scores,{her:110,him:110});assert.deepEqual(byTime.winners,['her']);assert.equal(byTime.decidedBy,'time');
 assert.deepEqual(byTime.saved,{her:110000,him:90000});
 assert.deepEqual(leagueWeek(week,words,run(30000,30000),at+86400000).winners,['her','him'],'identical times still tie');
 const oldWords=words.map(w=>({...w,day:'2026-10-13'}));
 assert.deepEqual(leagueWeek('2026-10-12',oldWords,run(10000,30000,'2026-10-13'),at).winners,['her','him'],'old weeks keep hard-round tie-breaks');
 assert.deepEqual(weekTimeSaved(weekForDay(week),[{...board('2026-10-20',60000,9),person:'him'}]),{her:0,him:0},'unsolved boards save no time');
 // Settlement crowns the faster player directly instead of opening a hard set.
 const store=new Map(),home='households/TIME',fast={
  async get(p){return store.get(p)||null;},async list(p){return [...store].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>({id:k.split('/').at(-1),...v}));},
  async dayRange(p,first,last=first){return(await this.list(p)).filter(r=>r.day>=first&&r.day<=last);},
  async createMany(rows){if(rows.some(r=>store.has(r.path)))return false;rows.forEach(r=>store.set(r.path,structuredClone(r.fields)));return true;}
 };
 for(const w of words)store.set(`${home}/wordResults/${w.day}-${w.person}`,w);
 for(const r of run(10000,30000))store.set(`${home}/timedResults/${r.day}-${r.type}-${r.person}`,r);
 await settleActivityWeeks(fast,home,Date.parse('2026-10-26T14:00Z'));
 const crowned=store.get(home+'/wordWeeks/'+week);
 assert.deepEqual(crowned.winners,['her']);assert.equal(crowned.decidedBy,'time');
 assert.equal([...store.keys()].some(k=>k.includes('/wordDuels/')),false,'no hard set when time decides it');
}
assert.deepEqual(normalizeWeekRecord({scores:{her:12,him:8}}).scores,{her:120,him:80});
assert.deepEqual(normalizeWeekRecord({format:'trio',scoreVersion:2,round:2,scores:{her:2000,him:1900}}).scores,{her:2000,him:1900});
assert.equal(wordPoints({day:'2026-10-09',done:true,won:true,attempts:1}),100);
// Atomic settlement, cumulative tied sets, early mathematical clinch and deduped pings.
const docs=new Map(),base='households/TEST',db={
 async get(p){return docs.get(p)||null;},async list(p){return [...docs].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>({id:k.split('/').at(-1),...v}));},
 async dayRange(p,first,last=first){return(await this.list(p)).filter(r=>r.day>=first&&r.day<=last);},
 async createMany(rows){if(rows.some(r=>docs.has(r.path)))return false;rows.forEach(r=>docs.set(r.path,structuredClone(r.fields)));return true;}
};
for(const person of ['her','him']){
 docs.set(`${base}/wordResults/2026-10-11-${person}`,{...word(person),day:'2026-10-11'});
 for(const type of ['search','crossword'])docs.set(`${base}/timedResults/2026-10-11-${type}-${person}`,{...timed(person,type),day:'2026-10-11'});
}
await settleActivityWeeks(db,base,now+2000);await settleActivityWeeks(db,base,now+3000);
assert.equal(docs.get(base+'/wordDuels/'+day).format,'trio');
assert.deepEqual(docs.get(base+'/wordDuels/'+day).scores,{her:400,him:400});
for(const person of ['her','him']){
 docs.set(`${base}/wordResults/${day}-${person}`,word(person));
 for(const type of ['search','crossword'])docs.set(`${base}/timedResults/${day}-${type}-${person}`,timed(person,type));
}
await settleActivityWeeks(db,base,now+4000);
const next=docs.get(base+'/wordDuels/2026-10-05-tie-2');assert.deepEqual(next.scores,{her:800,him:800});
docs.set(base+'/wordResults/'+next.puzzleId+'-her',{...word('her'),day:next.puzzleId});
docs.set(base+'/wordResults/'+next.puzzleId+'-him',{...word('him',1,false,false),day:next.puzzleId});
for(const type of ['search','crossword'])docs.set(`${base}/timedResults/${next.puzzleId}-${type}-her`,{...timed('her',type),day:next.puzzleId});
await settleActivityWeeks(db,base,now+5000);await settleActivityWeeks(db,base,now+6000);
assert.deepEqual(docs.get(base+'/wordWeeks/2026-10-05').scores,{her:1200,him:800});
assert.equal([...docs.keys()].filter(k=>k.includes('/outbox/word-winner')).length,2);
await notifyActivityResults(db,base,now+6000);const count=docs.size;await notifyActivityResults(db,base,now+7000);assert.equal(docs.size,count);
console.log(`DAILY PUZZLES: ${PUZZLE_CATALOG.length} clue entries, ${LITTLE_WORD_CATALOG.length} word answers, 2,000 themed boards, scoring, expiry, strict clinches, cumulative ties and notification dedupe pass`);
