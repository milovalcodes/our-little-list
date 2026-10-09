import {weekForDay,wordPoints,normalizeWeekRecord} from './word-scores.js';
import {timedPoints,timedOver} from './timed-game.js';
import {LEAGUE_START_DAY,isHardDay} from './daily-puzzles.js';
import {activityWindow} from './activity-clock.js';
export const SCORE_GAMES=[{id:'word',name:'Little Word',icon:'W',max:100},{id:'search',name:'Word Search',icon:'⌕',max:50},{id:'crossword',name:'Mini crossword',icon:'▦',max:50}];
const people=['her','him'];
export function weeklyReport(day,words=[],timed=[],raw=null,now=Date.now()){
 const week=weekForDay(day),record=raw?normalizeWeekRecord(raw):null;
 // Freeze partial timers at the actual clinch, not the time a recap is read.
 const cutoff=record&&Number.isFinite(record.settledAt)?Math.min(now,record.settledAt):now;
 const tieRound=date=>{const m=date?.match(new RegExp('^'+week.start+'-tie-([1-9][0-9]*)$'));return m?Number(m[1]):0;};
 const eligible=date=>week.days.includes(date)||Boolean(tieRound(date)&&(!record||tieRound(date)<=(record.round||record.tieRound||0)));
 const rows=[...words.filter(r=>eligible(r.day)).map(r=>({...r,type:'word'})),...timed.filter(r=>eligible(r.day)&&SCORE_GAMES.some(g=>g.id===r.type)&&(r.day>=LEAGUE_START_DAY||tieRound(r.day)))];
 const byKey=new Map();
 for(const r of rows)if(people.includes(r.person)){
  const key=r.day+':'+r.type+':'+r.person,previous=byKey.get(key);
  if(!previous||(r.updatedAt||r.finishedAt||0)>=(previous.updatedAt||previous.finishedAt||0))byKey.set(key,r);
 }
 const days=[...week.days,...[...new Set(rows.map(r=>r.day).filter(tieRound))].sort((a,b)=>tieRound(a)-tieRound(b))];
 const stats=Object.fromEntries(people.map(p=>[p,Object.fromEntries(SCORE_GAMES.map(g=>[g.id,{points:0,finished:0,max:0,best:null}]))]));
 const entries=days.map(date=>({day:date,tie:tieRound(date),hard:isHardDay(date),games:SCORE_GAMES.map(g=>({type:g.id,people:Object.fromEntries(people.map(person=>{
  const r=byKey.get(date+':'+g.id+':'+person),ended=g.id==='word'?Boolean(r?.done):timedOver(r,cutoff);
  const points=g.id==='word'?wordPoints(r):timedPoints(r,cutoff);
  const closed=r&&!ended&&(Boolean(record)||(!tieRound(date)&&cutoff>=activityWindow(date).closesAt));
  const detail=!r?'not played':!ended?(closed?'unfinished · closed':'in progress'):g.id==='word'?(r.won?`${r.attempts} ${r.attempts===1?'guess':'guesses'}`:'5 tries · missed'):`${r.count} / ${r.total} words`;
  const s=stats[person][g.id];s.points+=points;
  if(ended){s.finished++;s.max+=g.max*(isHardDay(date)?2:1);if(!s.best||points>s.best.points)s.best={points,day:date,detail};}
  return [person,{points,detail,played:Boolean(r),ended}];
 }))}))}));
 const sums=Object.fromEntries(people.map(p=>[p,SCORE_GAMES.reduce((n,g)=>n+stats[p][g.id].points,0)]));
 const totals=record?record.scores:sums;
 const complete=people.every(p=>sums[p]===totals[p]);
 const winner=record?.winners.length===1?record.winners[0]:null;
 let edge=null;
 if(winner&&complete){const other=winner==='her'?'him':'her';const edges=SCORE_GAMES.map(g=>({...g,margin:stats[winner][g.id].points-stats[other][g.id].points}));const max=Math.max(...edges.map(e=>e.margin));edge=max>0?edges.filter(e=>e.margin===max):null;}
 const highlights=Object.fromEntries(people.map(p=>{
  const scored=SCORE_GAMES.filter(g=>stats[p][g.id].points>0);
  const most=Math.max(0,...scored.map(g=>stats[p][g.id].points));
  const rate=Math.max(0,...scored.map(g=>stats[p][g.id].points/stats[p][g.id].max));
  return [p,{sources:scored.filter(g=>stats[p][g.id].points===most),best:scored.filter(g=>stats[p][g.id].points/stats[p][g.id].max===rate),rate:Math.round(rate*100)}];
 }));
 return {...week,record,totals,sums,complete,stats,entries,winner,edge,highlights};
}
