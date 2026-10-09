import {activityClock} from './activity-clock.js';
import {normalizeWeekRecord} from './word-scores.js';
export function validMemoryDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00Z'))&&new Date(value+'T12:00Z').toISOString().slice(0,10)===value;}
export function memoryDate(item){
 if(validMemoryDate(item.memoryDate))return item.memoryDate;
 if(item.question&&validMemoryDate(item.day))return item.day;
 return Number.isFinite(item.createdAt)&&item.createdAt>0?activityClock(new Date(item.createdAt)).calendarDay:'';
}
export function memoryDateLabel(item){
 const day=memoryDate(item);
 return day?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00Z')):item.crown?'Week of '+item.week:'date not recorded';
}
export function memoryCategory(item){return item.question||item.crown||item.dateId?'app':'yours';}
export function crownMemories(weeks,name){
 const seen=new Set();
 return weeks.filter(w=>validMemoryDate(w.week)&&!seen.has(w.week)&&(seen.add(w.week),true)).flatMap(raw=>{
  const w=normalizeWeekRecord(raw),winner=w.winners.length===1?w.winners[0]:null;
  if(!winner)return [];
  const display=name(winner),title=display===winner?(winner==='her'?'Sun':'Moon'):display;
  return [{id:'crown-'+w.week,crown:true,week:w.week,winner,text:title+' was crowned '+(winner==='her'?'queen':'king'),scores:w.scores,createdAt:Number.isFinite(w.settledAt)?w.settledAt:0}];
 });
}
export function sortMemories(items){return [...items].sort((a,b)=>memoryDate(b).localeCompare(memoryDate(a))||(b.createdAt||0)-(a.createdAt||0));}
