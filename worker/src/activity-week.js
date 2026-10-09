import {activityClock,activityWindow} from '../../activity-clock.js';
import {weekForDay,shiftDay} from '../../word-scores.js';
import {wordForTie} from '../../daily-words.js';
import {timedPuzzle,PUZZLE_TYPES,LEAGUE_START_DAY} from '../../daily-puzzles.js';
import {timedOver} from '../../timed-game.js';
import {leagueWeek,trioProgress,LEAGUE_WEEK} from '../../league-scores.js';

const people=['her','him'];
async function rounds(db,base,day,last=day){
 const [words,timed]=await Promise.all(['wordResults','timedResults'].map(name=>db.dayRange(`${base}/${name}`,day,last)));
 return {words,timed};
}
export async function settleActivityWeeks(db,base,now){
 const today=activityClock(now).day,latest=weekForDay(today).start;
 const finals=await db.list(base+'/wordWeeks'),duels=await db.list(base+'/wordDuels');
 const ping=(id,to,title,body,hash)=>({path:`${base}/outbox/${id}-${to}`,fields:{to,title,body,url:'activities.html#'+hash,kind:'word-week',ref:'wordWeeks/'+id,createdAt:now,sendAt:now}});
 async function award(score,winner,round,ending){
  const winners=winner?[winner]:score.winners;
  const writes=[{path:base+'/wordWeeks/'+score.week,fields:{...score,scoreVersion:2,format:'trio',round,tieRound:round,winners,settledAt:now}}];
  if(ending)writes.push(ending);
  for(const p of people)if(winners.length)writes.push(ping('word-winner-'+score.week,p,'The weekly crown has a home ♛',(winners[0]==='her'?'Sun':'Moon')+' takes the crown. Your weekly recap is ready.','scoreboard-'+score.week));
  await db.createMany(writes);
 }
 async function open(score,round,ending){
  const word=wordForTie(score.week,round,now),day=word.day;
  const writes=[{path:base+'/wordPuzzles/'+day,fields:word},{path:base+'/wordDuels/'+day,fields:{week:score.week,round,puzzleId:day,scores:score.scores,format:'trio',scoreVersion:2,createdAt:now}},...PUZZLE_TYPES.map(type=>({path:`${base}/timedPuzzles/${day}-${type}`,fields:timedPuzzle(day,type,now)}))];
  if(ending)writes.push(ending);
  for(const p of people)writes.push(ping(day,p,round===1?'A tie. Three more rounds!':'Still tied. Fresh set!', 'Three hard puzzles, double points. Play when you can.','tiebreaker'));
  await db.createMany(writes);
 }
 for(let week=LEAGUE_WEEK;week<=latest;week=shiftDay(week,7)){
  if(finals.some(w=>w.week===week))continue;
  const span=weekForDay(week);if(today<span.end)continue;
  const active=duels.filter(d=>d.week===week).sort((a,b)=>b.round-a.round)[0];
  // Leave historical word-only ties to their original settlement path.
  if(active&&active.format!=='trio')continue;
  if(active){
   const {words,timed}=await rounds(db,base,active.puzzleId),progress=trioProgress(active.puzzleId,active.scores,words,timed,now);
   if(!progress.outcome)continue;
   const score={week,end:span.end,scores:progress.scores,winners:[]};
   const ending={path:base+'/wordDuelEnds/'+active.puzzleId,fields:{week,outcome:progress.outcome,closedAt:now}};
   if(progress.outcome==='tie')await open(score,active.round+1,ending);
   else await award(score,progress.outcome,active.round,ending);
   continue;
  }
  const sunday=await rounds(db,base,span.end);
  const allFinished=people.every(p=>sunday.words.some(w=>w.person===p&&w.done)&&PUZZLE_TYPES.every(type=>sunday.timed.some(t=>t.person===p&&t.type===type&&timedOver(t,now))));
  if(now<activityWindow(span.end).closesAt&&!allFinished)continue;
  const {words,timed}=await rounds(db,base,span.start,span.end);
  const score=leagueWeek(week,words,timed,now);
  // A genuinely unplayed week rests. A played 0–0 week is still a tie.
  if(score.scores.her===score.scores.him&&(words.length||timed.length))await open(score,1);
  else await award(score,'',0);
 }
}

export async function notifyActivityResults(db,base,now){
 const today=activityClock(now).day;if(today<LEAGUE_START_DAY)return;
 const duels=await db.list(base+'/wordDuels'),ends=await db.list(base+'/wordDuelEnds');
 const days=[today,...duels.filter(d=>d.format==='trio'&&!ends.some(e=>e.id===d.puzzleId)).map(d=>d.puzzleId)];
 for(const day of days){
 const {words,timed}=await rounds(db,base,day);
 for(const type of ['word',...PUZZLE_TYPES]){
  const records=type==='word'?words:timed.filter(r=>r.type===type),finished=records.filter(r=>type==='word'?r.done:timedOver(r,now));
  if(!finished.length)continue;
  const both=finished.length===2,first=both?[...finished].sort((a,b)=>(a.finishedAt||a.updatedAt||a.startedAt)-(b.finishedAt||b.updatedAt||b.startedAt))[0]:finished[0];
  const event=both?'reveal':'waiting',id=`${day}-${type}-${event}`,path=base+'/activityEvents/'+id;
  if(await db.get(path))continue;
  const to=both?first.person:first.person==='her'?'him':'her';
  const label=type==='word'?'Little Word':type==='search'?'Word Search':'Mini crossword';
  await db.createMany([{path,fields:{day,createdAt:now}},{path:base+'/outbox/activity-'+id,fields:{to,title:both?'Both rounds are in':label+' · they finished',body:both?'You can peek at their process now.':'Your round is ready whenever you are.',kind:'activity-result',ref:'activities/'+id,url:'activities.html#'+(day.includes('-tie-')?'tiebreaker':type==='word'?'wordle':type),createdAt:now,sendAt:now}}]);
 }
 }
}
