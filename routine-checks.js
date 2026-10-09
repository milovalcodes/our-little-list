import {listDay,checkId} from './list-schedule.js';
// Listen to only today's checks, not an ever-growing history. A page left open
// overnight and a phone coming back from sleep both switch to the new day.
export function watchRoutineChecks(data, receive) {
  let day='',stop=()=>{};
  const refresh=()=>{const next=listDay();if(next===day)return;day=next;stop();receive([]);stop=data.listenToQuery('routineChecks',{where:{field:'day',value:day}},receive);};
  const timer=setInterval(refresh,30000);
  document.addEventListener('visibilitychange',refresh);
  refresh();
  return ()=>{clearInterval(timer);stop();document.removeEventListener('visibilitychange',refresh);};
}
export async function completeRoutine(data,item,viewer,done,day=listDay()) {
  if(day!==listDay())throw Error('The day changed. Try again on today’s list.');
  return data.setTo('routineChecks',checkId(item.id,day),{itemId:item.id,day,done,by:viewer,updatedAt:Date.now()});
}
