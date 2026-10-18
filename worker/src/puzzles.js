import compiled from './compiled-crosswords.json' with {type:'json'};
import {timedPuzzle,random} from '../../daily-puzzles.js';
import {wordForDay} from '../../daily-words.js';
import {weekForDay,shiftDay} from '../../word-scores.js';
import {puzzleSeason} from '../../seasonal-puzzles.js';
// Board generation can exceed a free Worker's CPU allowance before it ever
// queues the morning ping. Daily layouts are compiled unchanged ahead of time.
// Hard tie templates are shuffled by set and theme, then saved immutably too.
export function workerTimedPuzzle(day,type,now=Date.now()){
 if(type==='crossword'&&day.includes('-tie-')&&day.slice(0,10)>='2026-10-19'){
  const season=puzzleSeason(day,now),pool=compiled.themedTies[season||'regular'];
  const board=pool[Math.floor(random(day+':themed-tie-v8')()*pool.length)];
  return {day,type,hard:true,difficulty:'hard',...board,opensAt:now,closesAt:4102444800000,durationMs:300000};
 }
 if(!day.includes('-tie-')&&day>=compiled.engineStart){
  if(!compiled.rounds[day]?.[type])throw Error('Compiled daily calendar needs extending before '+day);
  return compiled.rounds[day][type];
 }
 return timedPuzzle(day,type,now,({day,themeId})=>{
  if(!day.includes('-tie-')){
   if(!compiled.days[day])throw Error('Compiled crossword calendar needs extending before '+day);
   return compiled.days[day];
  }
  const pool=compiled.ties[themeId];
  if(!pool?.length)throw Error('Missing compiled hard crossword theme');
  return pool[Math.floor(random(day+':'+themeId+':compiled')()*pool.length)];
 });
}
export function workerWordPuzzle(day){
 if(day>=compiled.engineStart){if(!compiled.rounds[day]?.word)throw Error('Compiled word calendar needs extending before '+day);return compiled.rounds[day].word;}
 return wordForDay(day);
}
export async function savedDailyRounds(db,base,day){
 if(day<compiled.engineStart)return null;
 const week=weekForDay(day).start,path=base+'/gamePlans/'+week;
 let plan=await db.get(path);
 if(!plan){
  const days={};for(let i=0;i<7;i++){const d=shiftDay(week,i);days[d]=compiled.rounds[d];if(!days[d])throw Error('Compiled weekly calendar needs extending before '+d);}
  await db.create(path,{week,days,createdAt:Date.now()});
  plan=await db.get(path); // concurrent first-open must use the saved winner
 }
 if(!plan?.days?.[day])throw Error('Saved weekly game calendar is incomplete.');
 return plan.days[day];
}
