import {activityClock,activityWindow} from './activity-clock.js';
import {wordPoints} from './word-scores.js';
import {timedOver,timedPoints} from './timed-game.js';
export const DAILY_GAMES=[{type:'word',name:'Little Word',hash:'wordle'},{type:'search',name:'Word Search',hash:'search'},{type:'crossword',name:'Crossword',hash:'crossword'}];
export const gameDone=r=>Boolean(r&&(r.type?timedOver(r):r.done));
export const gamePoints=r=>r?.type?timedPoints(r):wordPoints(r);
export function dailyStates(words,timed,viewer,day=activityClock().day){
 return DAILY_GAMES.map(game=>{
  const rows=(game.type==='word'?words:timed.filter(r=>r.type===game.type)).filter(r=>r.day===day);
  const mine=rows.find(r=>r.person===viewer),other=rows.find(r=>r.person!==viewer);
  const done=gameDone(mine),partnerDone=gameDone(other);
  const label=done?(partnerDone?'both done ✦':`played · ${gamePoints(mine)} pts`):partnerDone?'your turn · partner done':mine?'in progress':'not played';
  return {...game,done,partnerDone,label,href:'activities.html#'+game.hash};
 });
}
export function nextPuzzleTime(now=Date.now()){
 const end=activityWindow(activityClock(new Date(now)).day).closesAt;
 const seconds=Math.max(0,Math.ceil((end-now)/1000));
 return [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export const countdownMarkup=()=>'<p class="next-puzzle">next puzzle in <time data-next-puzzle>'+nextPuzzleTime()+'</time></p>';
export function startCountdowns(root=document){
 const tick=()=>root.querySelectorAll('[data-next-puzzle]').forEach(n=>{n.textContent=nextPuzzleTime();});
 const timer=setInterval(tick,1000);tick();return ()=>clearInterval(timer);
}
// Subscribe to today's public summaries only. Never fetch partner boards here.
export function watchDailyStates(data,viewer,receive){
 let words=[],timed=[],day='',stops=[],seen=new Set(),last='';
 const render=()=>{if(seen.size!==2)return;const states=dailyStates(words,timed,viewer,day),key=day+JSON.stringify(states);if(key===last)return;last=key;receive(states,{wordResults:words,timedResults:timed});};
 const refresh=()=>{
  const next=activityClock().day;if(next===day){render();return;}day=next;seen=new Set();words=[];timed=[];stops.forEach(f=>f());
  stops=['wordResults','timedResults'].map(name=>data.listenToQuery(name,{where:{field:'day',value:day}},rows=>{if(name==='wordResults')words=rows;else timed=rows;seen.add(name);render();},{onError:()=>{}}));
 };
 refresh();const timer=setInterval(refresh,1000);return ()=>{stops.forEach(f=>f());clearInterval(timer);};
}
