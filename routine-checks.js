import {listDay,checkId} from './list-schedule.js';
// Listen to only today's checks, not an ever-growing history. A page left open
// overnight and a phone coming back from sleep both switch to the new day.
export function watchRoutineChecks(data, receive, {onError}={}) {
  let day='',stop=()=>{},version=0,failed=false;
  const refresh=()=>{
    const next=listDay();if(next===day&&!failed)return;day=next;failed=false;stop();const current=++version;
    receive([],{ready:false,day});
    stop=data.listenToQuery('routineChecks',{where:{field:'day',value:day}},rows=>{
      if(current===version)receive(rows,{ready:true,day});
    },{onError:problem=>{if(current!==version)return;failed=true;receive([],{ready:false,day});onError?.(problem);}});
  };
  const timer=setInterval(refresh,30000);
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('online',refresh);
  refresh();
  return ()=>{version++;clearInterval(timer);stop();document.removeEventListener('visibilitychange',refresh);window.removeEventListener('online',refresh);};
}
export async function completeRoutine(data,item,viewer,done,day=listDay()) {
  if(day!==listDay())throw Error('The day changed. Try again on today’s list.');
  return data.setTo('routineChecks',checkId(item.id,day),{itemId:item.id,day,done,by:viewer,updatedAt:Date.now()});
}
