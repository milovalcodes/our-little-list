// Results, streaks and sharing for the daily games. Pure helpers: the game
// panels feed in saved result summaries (wordResults / timedResults rows).
import {shiftDay,wordAttempts} from './word-scores.js';
import {millis,timedLimit,timedPoints,timedOver} from './timed-game.js';
import {scoreGuess} from './word-game.js';
const daily=day=>/^\d{4}-\d{2}-\d{2}$/.test(day);
export const clock=ms=>`${Math.floor(Math.max(0,ms)/60000)}:${String(Math.floor(Math.max(0,ms)/1000)%60).padStart(2,'0')}`;
// Consecutive days ending today (or yesterday while today is still open).
function streaks(days,today){
 const set=new Set(days),sorted=[...set].sort();
 let best=0,run=0,prev='';
 for(const day of sorted){run=prev&&shiftDay(prev,1)===day?run+1:1;best=Math.max(best,run);prev=day;}
 let current=0,day=set.has(today)?today:shiftDay(today,-1);
 while(set.has(day)){current++;day=shiftDay(day,-1);}
 return {current,best};
}
const latest=rows=>{const map=new Map();for(const r of rows){const key=r.day+':'+(r.type||'word');const old=map.get(key);if(!old||(r.updatedAt||millis(r.finishedAt)||0)>=(old.updatedAt||millis(old.finishedAt)||0))map.set(key,r);}return [...map.values()];};
export function wordStats(rows,today){
 const finished=latest(rows.filter(r=>daily(r.day)&&r.done&&r.day<=today));
 const wins=finished.filter(r=>r.won&&Number.isInteger(r.attempts));
 const distribution=Array.from({length:6},(_,i)=>wins.filter(r=>r.attempts===i+1).length);
 const streak=streaks(wins.map(r=>r.day),today);
 return {played:finished.length,wins:wins.length,winRate:finished.length?Math.round(wins.length/finished.length*100):0,current:streak.current,best:streak.best,distribution};
}
export function timedTaken(r){return r?.complete&&millis(r.finishedAt)&&millis(r.startedAt)?Math.min(timedLimit(r.type,r),millis(r.finishedAt)-millis(r.startedAt)):null;}
export function timedStats(rows,type,today,now=Date.now()){
 const finished=latest(rows.filter(r=>r.type===type&&daily(r.day)&&r.day<=today&&timedOver(r,now)));
 const cleared=finished.filter(r=>r.complete),times=cleared.map(timedTaken).filter(Number.isFinite);
 const streak=streaks(cleared.map(r=>r.day),today);
 return {played:finished.length,cleared:cleared.length,current:streak.current,best:streak.best,bestTime:times.length?Math.min(...times):null};
}
const dateLabel=day=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day.slice(0,10)+'T12:00Z'));
const roundLabel=day=>day.includes('-tie-')?'tie-break '+day.split('-tie-')[1]:dateLabel(day);
const SQUARES={correct:'🟩',present:'🟨',absent:'⬛'};
// Spoiler-free: colours only, never letters.
export function wordShare(game,word){
 const rows=game.guesses.map(g=>scoreGuess(g,word).map(m=>SQUARES[m]).join(''));
 return `Little Word · ${roundLabel(game.day)} · ${game.won?game.guesses.length:'X'}/${wordAttempts(game.day)}\n${rows.join('\n')}`;
}
export function timedShare(result,name){
 const taken=timedTaken(result);
 return `${name} · ${roundLabel(result.day)} · ${result.count??result.solved?.length??0}/${result.total}${taken!==null?' in '+clock(taken):''} · ${timedPoints(result)} points`;
}
// Partner rows for a round the viewer hasn't finished stay hidden: they are
// replaced by a marker that keeps "played" without points or detail.
export function hidePartnerUntilPlayed(rows,viewer,isOpen,ended){
 const mine=new Set(rows.filter(r=>r.person===viewer&&ended(r)).map(r=>r.day+':'+(r.type||'word')));
 return rows.map(r=>r.person!==viewer&&isOpen(r.day)&&!mine.has(r.day+':'+(r.type||'word'))?{day:r.day,type:r.type,person:r.person,hidden:true,updatedAt:r.updatedAt}:r);
}
export const wordEnded=r=>Boolean(r?.done);
