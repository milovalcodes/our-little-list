export function shiftDay(day,offset){return new Date(Date.parse(day+'T12:00:00Z')+offset*86400000).toISOString().slice(0,10);}
export function weekForDay(day){
  const weekday=new Date(day+'T12:00:00Z').getUTCDay();
  const start=shiftDay(day,-((weekday+6)%7));
  return {start,end:shiftDay(start,6),days:Array.from({length:7},(_,i)=>shiftDay(start,i))};
}
// Scores apply by game day so finished history never changes. From this day
// Little Word has six guesses and every daily game tops out near 60.
// Tie rounds (`<week>-tie-n`) follow the week they settle.
export const SCORING_V3_DAY='2026-10-19';
export const LEGACY_WORD_POINTS=[100,40,30,20,10];
export const WORD_POINTS=[60,50,40,30,20,10];
export const newScoring=day=>typeof day==='string'&&day>=SCORING_V3_DAY;
export const wordTable=day=>newScoring(day)?WORD_POINTS:LEGACY_WORD_POINTS;
export const wordAttempts=day=>wordTable(day).length;
export const doubledDay=day=>day.includes('-tie-')||new Date(day.slice(0,10)+'T12:00:00Z').getUTCDay()===0;
export function wordPoints(result){
  if(!result?.done||!result.won||!Number.isInteger(result.attempts)||result.attempts<1||result.attempts>wordAttempts(result.day))return 0;
  return wordTable(result.day)[result.attempts-1]*(doubledDay(result.day)?2:1);
}
// The most an unfinished word can still earn: solving on the next guess.
export function wordCeiling(result,day=result?.day){
  if(result?.done)return wordPoints(result);
  return (wordTable(day)[result?.attempts||0]||0)*(doubledDay(day)?2:1);
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
// Older or partial records must not crash the whole Activities page.
export function normalizeWeekRecord(record,fallback={}){
  const max=record?.format==='trio'&&Number.isInteger(record.round)&&record.round>=0&&record.round<=1000000?1600+400*record.round:800;
  const scale=record?.scoreVersion===2?1:10;
  const points=p=>Number.isInteger(record?.scores?.[p])&&record.scores[p]>=0&&record.scores[p]*scale<=max?record.scores[p]*scale:(fallback.scores?.[p]||0);
  return {...fallback,...record,scoreVersion:2,scores:{her:points('her'),him:points('him')},winners:Array.isArray(record?.winners)?[...new Set(record.winners.filter(p=>p==='her'||p==='him'))]:[]};
}
export function reigningCrowns(weeks){
  const sorted=weeks.filter(w=>/^\d{4}-\d{2}-\d{2}$/.test(w?.week)).map(w=>normalizeWeekRecord(w)).sort((a,b)=>b.week.localeCompare(a.week)),latest=sorted[0];
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
  const day=her?.day||him?.day,potential=r=>wordCeiling(r,day);
  if(her?.done&&a>potential(him))return 'her';
  if(him?.done&&b>potential(her))return 'him';
  if(her?.done&&him?.done)return a===b?'tie':a>b?'her':'him';
  return '';
}
