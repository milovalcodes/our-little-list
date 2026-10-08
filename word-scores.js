export function shiftDay(day,offset){return new Date(Date.parse(day+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);}
export function weekForDay(day){
  const weekday=new Date(day+'T12:00:00Z').getUTCDay();
  const start=shiftDay(day,-((weekday+6)%7));
  return {start,end:shiftDay(start,6),days:Array.from({length:7},(_,i)=>shiftDay(start,i))};
}
export function wordPoints(result){
  if(!result?.done||!result.won||!Number.isInteger(result.attempts)||result.attempts<1||result.attempts>5)return 0;
  return (6-result.attempts)*((result.day.includes('-tie-')||new Date(result.day+'T12:00:00Z').getUTCDay()===0)?2:1);
}
export function scoreWeek(day,results){
  const week=weekForDay(day),scores={her:0,him:0};
  for(const person of ['her','him'])for(const date of week.days){
    const result=results.find(r=>r.day===date&&r.person===person);
    scores[person]+=wordPoints(result);
  }
  const high=Math.max(scores.her,scores.him);
  return {week:week.start,end:week.end,scores,winners:high>0?['her','him'].filter(p=>scores[p]===high):[]};
}
export function reigningCrowns(weeks){
  const sorted=[...weeks].sort((a,b)=>b.week.localeCompare(a.week)),latest=sorted[0];
  if(!latest)return {week:'',her:0,him:0};
  const result={week:latest.week,her:0,him:0};
  for(const person of ['her','him']){
    let expected=latest.week;
    for(const week of sorted){
      if(week.week!==expected||!week.winners.includes(person))break;
      result[person]++;expected=shiftDay(expected,-7);
    }
  }
  return result;
}

export function duelOutcome(her,him){
  const a=wordPoints(her),b=wordPoints(him);
  const potential=r=>r?.done?wordPoints(r):(5-(r?.attempts||0))*2;
  if(her?.done&&a>potential(him))return 'her';
  if(him?.done&&b>potential(her))return 'him';
  if(her?.done&&him?.done)return a===b?'tie':a>b?'her':'him';
  return '';
}
