import {activityClock} from './activity-clock.js';
import {freshRounds,weeklyRounds,weekDays,roundWords,ROUND_TYPES} from './round-engine.js';
import {revisionOf} from './round-revision.js';

export function prepareReset({day,scope,puzzles,history=[],planned,requestId,now=Date.now()}){
 if(day!==activityClock(new Date(now)).day)throw Error('The day changed. Reopen Activities before resetting.');
 const types=scope==='all'?ROUND_TYPES:[scope];
 if(types.some(t=>!ROUND_TYPES.includes(t))||!requestId)throw Error('Choose a game to reset.');
 const reserved=Object.values(planned||weeklyRounds(day)).flatMap(Object.values);
 const used=[...puzzles,...reserved].flatMap(roundWords).concat(history);
 const rounds=freshRounds({day,types,used,seed:day+':reset:'+requestId,now});
 for(const type of types){
  const old=puzzles.find(p=>p.day===day&&(type==='word'?Boolean(p.word):p.type===type));
  if(!old)throw Error('Today’s games are still loading. Try again in a moment.');
  if(now<old.opensAt||now>=old.closesAt)throw Error('This day has closed. Nothing was reset.');
  rounds[type]={...rounds[type],opensAt:old.opensAt,closesAt:old.closesAt,revision:revisionOf(old)+1};
 }
 return {rounds,used:[...new Set([...history,...puzzles.flatMap(roundWords),...Object.values(rounds).flatMap(roundWords)])],week:weekDays(day)[0],types};
}

export function startGameReset({data}){
 const host=document.getElementById('admin-games');
 if(!host||!data.isGameAdmin?.())return;
 host.hidden=false;
 let busy=false,requestId=null;
 const choice=host.querySelector('select'),button=host.querySelector('button'),message=host.querySelector('[role="status"]');
 button.addEventListener('click',async()=>{
  if(busy)return;
  const scope=choice.value,label={all:'all three games',word:'Little Word',search:'Word Search',crossword:'Crossword'}[scope];
  if(!confirm(`Reset ${label} for BOTH of you?\n\nToday’s attempts and points for ${scope==='all'?'these games':'this game'} will be removed. You’ll get new answers and fresh attempts. Other days and the daily question stay as they are.`))return;
  busy=true;button.disabled=true;choice.disabled=true;button.setAttribute('aria-busy','true');message.textContent='making fresh boards…';
  requestId??=crypto.randomUUID();
  try{
   // Let the loading state paint before doing the local layout work.
   await new Promise(resolve=>setTimeout(resolve,40));
   await data.resetDailyGames({day:activityClock().day,scope,requestId});
   message.textContent='Fresh rounds for both of you. Today’s points were cleared for the selected games.';requestId=null;
  }catch(problem){message.textContent=problem.message||'Could not confirm the reset. Reconnect and retry; the same request won’t reset twice.';}
  finally{busy=false;button.disabled=false;choice.disabled=false;button.removeAttribute('aria-busy');}
 });
 choice.addEventListener('change',()=>{requestId=null;message.textContent='';});
}
