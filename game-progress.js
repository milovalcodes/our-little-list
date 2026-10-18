import {shiftDay,weekForDay} from './word-scores.js';
import {gameDone,DAILY_GAMES,dailyStates} from './daily-habit.js';
import {wordStats,timedStats,timedTaken} from './daily-results.js';
export const FREEZE_START='2026-10-19';
// Recompute cosmetic progress from saved results: no second balance to race
// between devices, no effect on scores, and no edits to historical results.
export function trioStreak(words,timed,person,today){
 const rows=[...words,...timed].filter(r=>r.person===person&&/^\d{4}-\d{2}-\d{2}$/.test(r.day)&&r.day>=FREEZE_START&&r.day<=today&&gameDone(r));
 const days=new Map();for(const r of rows){if(!days.has(r.day))days.set(r.day,new Set());days.get(r.day).add(r.type||'word');}
 const full=new Set([...days].filter(([,types])=>DAILY_GAMES.every(g=>types.has(g.type))).map(([day])=>day));
 let current=0,best=0,freezes=0,earned=0;const used=[],weeks=new Map();
 const start=[...full].sort()[0];if(!start)return {current,best,freezes,earned,used};
 for(let day=start;day<=today;day=shiftDay(day,1)){
  if(full.has(day)){
   current++;const week=weekForDay(day).start,n=(weeks.get(week)||0)+1;weeks.set(week,n);
   if(n===5){freezes++;earned++;}
  }else if(day===today)break; // Today's opportunity remains open until 9 ET.
  else if(freezes&&current){freezes--;used.push(day);/* preserve the run, without counting a missed day as played */}
  else current=0;
  best=Math.max(best,current);
 }
 return {current,best,freezes,earned,used};
}
export function personalBadges(words,timed,person,today){
 const ownWords=words.filter(r=>r.person===person),ownTimed=timed.filter(r=>r.person===person),w=wordStats(ownWords,today),s=timedStats(ownTimed,'search',today),c=timedStats(ownTimed,'crossword',today);
 const badges=[];
 if(ownWords.some(r=>r.done&&r.won&&r.attempts<=2))badges.push('✦ two guesses or fewer');
 if(Math.max(w.best,s.best,c.best)>=7)badges.push('🔥 7-day streak');
 if(Math.max(w.best,s.best,c.best)>=30)badges.push('✧ 30-day streak');
 if(ownTimed.some(r=>r.type==='crossword'&&timedTaken(r)!==null&&timedTaken(r)<60000))badges.push('⚡ crossword under a minute');
 if(ownTimed.some(r=>r.type==='search'&&r.complete))badges.push('⌕ every word found');
 return badges;
}
export function streakAtRisk(words,timed,person,today){
 const ownWords=words.filter(r=>r.person===person),ownTimed=timed.filter(r=>r.person===person),states=dailyStates(words,timed,person,today);
 const candidates=states.filter(g=>!g.done).map(g=>({type:g.type,name:g.name,current:g.type==='word'?wordStats(ownWords,today).current:timedStats(ownTimed,g.type,today).current}));
 const trio=trioStreak(words,timed,person,today);
 if(!trio.freezes&&states.some(g=>!g.done))candidates.push({type:'trio',name:'all-three-games',current:trio.current});
 return candidates.filter(r=>r.current>=2).sort((a,b)=>b.current-a.current)[0]||null;
}
