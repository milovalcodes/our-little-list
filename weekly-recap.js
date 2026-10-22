import {uiIcon} from './interface-icons.js';
import {activityClock} from './activity-clock.js';
import {weekForDay,shiftDay,normalizeWeekRecord} from './word-scores.js';
import {timedTaken,clock} from './daily-results.js';
import {personName} from './profile-store.js';
import {escapeHtml as esc} from './ui-helpers.js';
// Only settled, closed weeks belong on Home. An unfinished Sunday never
// discloses a partner result through the recap.
export function startWeeklyRecap({data,viewer},host){
 let stopWords=()=>{},stopTimed=()=>{},words=[],timed=[],record=null,weeks=[];
 function paint(){
  if(!record){host.hidden=true;return;}
  host.hidden=false;
  const mine=timed.filter(r=>r.person===viewer&&timedTaken(r)!==null).sort((a,b)=>timedTaken(a)-timedTaken(b))[0];
  const played=words.filter(r=>r.done).length+timed.filter(r=>r.done).length;
  host.innerHTML=`<h2>Our week together ✦</h2><p>${record.winners.length===1?`${uiIcon('crown')} ${esc(personName(record.winners[0]))} has this week’s crown`:'A quiet week together'}</p><small>${played} rounds played between us${mine?` · your fastest ${mine.type==='crossword'?'crossword':'search'}: ${clock(timedTaken(mine))}`:''}${record.decidedBy==='time'?' · total solve time settled the week':''}</small><a href="activities.html#scoreboard-${record.week}">Open the weekly recap →</a>`;
 }
 const refresh=()=>{
  const current=weekForDay(activityClock().day).start,next=weeks.find(w=>w.week===shiftDay(current,-7));
  if(next?.week===record?.week)return;
  stopWords();stopTimed();words=[];timed=[];record=next?normalizeWeekRecord(next):null;paint();if(!record)return;
  const {start,end}=weekForDay(record.week),query={where:[{field:'day',op:'>=',value:start},{field:'day',op:'<=',value:end}]};
  stopWords=data.listenToQuery('wordResults',query,rows=>{words=rows;paint();});stopTimed=data.listenToQuery('timedResults',query,rows=>{timed=rows;paint();});
 };
 const stop=data.listenTo('wordWeeks',rows=>{weeks=rows;refresh();});
 const timer=setInterval(refresh,30000);addEventListener('littlelist:profile',paint);
 return ()=>{stop();stopWords();stopTimed();clearInterval(timer);removeEventListener('littlelist:profile',paint);};
}
