import compiled from './compiled-crosswords.json' with {type:'json'};
import {timedPuzzle,random} from '../../daily-puzzles.js';
// Board generation can exceed a free Worker's CPU allowance before it ever
// queues the morning ping. Daily layouts are compiled unchanged ahead of time.
// Hard tie templates are shuffled by set and theme, then saved immutably too.
export function workerTimedPuzzle(day,type,now=Date.now()){
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
