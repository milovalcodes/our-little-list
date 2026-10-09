import { activityClock, activityWindow } from '../../activity-clock.js';
import { WORD_START_DAY, wordForTie } from '../../daily-words.js';
import { weekForDay, shiftDay, scoreWeek, duelOutcome } from '../../word-scores.js';

export async function settleWordWeeks(db,household,now,{before='9999-12-31'}={}){
  const today=activityClock(now).day,latest=weekForDay(today);
  const finals=await db.list(household+'/wordWeeks'),finished=new Set(finals.map(w=>w.week));
  const duels=await db.list(household+'/wordDuels');
  const makePing=(id,person,title,body,url)=>({path:household+'/outbox/'+id+'-'+person,fields:{to:person,title,body,url,kind:'word-week',ref:'wordWeeks/'+id,createdAt:now,sendAt:now}});
  async function award(score,winner='',round=0,ending=null){
    const fields={...score,scoreVersion:2,winners:winner?[winner]:score.winners,settledAt:now,tieRound:round};
    const title=fields.winners.length?'The weekly crown has a home ♛':'This week is wrapped up';
    const names=fields.winners[0]==='her'?'Sun':'Moon';
    const body=fields.winners.length?names+' wins this week’s Little Word. See the scores.':'No words played this week. Fresh start at 9.';
    const writes=[{path:household+'/wordWeeks/'+score.week,fields}];
    if(ending)writes.push(ending);
    if(fields.winners.length)for(const p of ['her','him'])writes.push(makePing('word-winner-'+score.week,p,title,body,'activities.html#scoreboard-'+score.week));
    await db.createMany(writes);
  }
  async function openDuel(score,round,ending=null){
    const puzzle=wordForTie(score.week,round,now),id=puzzle.day;
    const writes=[
      {path:household+'/wordPuzzles/'+id,fields:puzzle},
      {path:household+'/wordDuels/'+id,fields:{week:score.week,round,puzzleId:id,scores:score.scores,scoreVersion:2,createdAt:now}}
    ];
    if(ending)writes.push(ending);
    for(const p of ['her','him'])writes.push(makePing(id,p,round===1?'A tie. Settle it?':'Still tied. Next word!', 'Same hard word. Five tries each. Winner takes the crown.', 'activities.html#tiebreaker'));
    await db.createMany(writes);
  }
  for(let start=weekForDay(WORD_START_DAY).start;start<=latest.start;start=shiftDay(start,7)){
    if(finished.has(start))continue;
    const week=weekForDay(start);
    if(today<week.end)continue;
    const active=duels.filter(d=>d.week===start).sort((a,b)=>b.round-a.round)[0];
    if(start>=before&&(!active||active.format==='trio'))continue;
    if(active){
      const [her,him]=await Promise.all(['her','him'].map(p=>db.get(household+'/wordResults/'+active.puzzleId+'-'+p)));
      const outcome=duelOutcome(her,him);
      if(!outcome)continue;
      const ending={path:household+'/wordDuelEnds/'+active.puzzleId,fields:{week:start,outcome,closedAt:now}};
      const scale=active.scoreVersion===2?1:10;
      const score={week:start,end:week.end,scores:{her:active.scores.her*scale,him:active.scores.him*scale},winners:[]};
      if(outcome==='tie')await openDuel(score,active.round+1,ending);
      else await award(score,outcome,active.round,ending);
      continue;
    }
    const sunday=await Promise.all(['her','him'].map(p=>db.get(household+'/wordResults/'+week.end+'-'+p)));
    if(now<activityWindow(week.end).closesAt&&!sunday.every(r=>r?.done))continue;
    const results=(await Promise.all(week.days.flatMap(day=>['her','him'].map(p=>db.get(household+'/wordResults/'+day+'-'+p))))).filter(Boolean);
    const score=scoreWeek(start,results);
    if(score.scores.her===score.scores.him&&results.length)await openDuel(score,1);
    else await award(score);
  }
}
