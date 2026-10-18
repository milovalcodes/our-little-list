import {activityClock,activityWindow} from '../../activity-clock.js';
import {streakAtRisk,FREEZE_START} from '../../game-progress.js';
import {dailyStates} from '../../daily-habit.js';
import {normalizeNotificationPreferences,notificationKindEnabled} from '../../notification-policy.js';
export function localEvening(now,subscription){
 try{if(subscription.timeZone){const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:subscription.timeZone,hour:'2-digit',hourCycle:'h23'}).format(now));return hour===20;}}catch(_){}
 if(!Number.isFinite(subscription.utcOffsetMinutes))return false;
 return new Date(now+subscription.utcOffsetMinutes*60000).getUTCHours()===20;
}
export async function scheduleStreakReminders(db,base,now){
 const today=activityClock(new Date(now)).day;if(today<FREEZE_START)return;
 const candidates=(await db.list(base+'/pushSubs')).filter(s=>['her','him'].includes(s.id)&&localEvening(now,s)&&notificationKindEnabled('game-streak',normalizeNotificationPreferences(s.preferences)));
 // Once assessed, skip history reads for the rest of the evening. Finished
 // games only remove reasons to remind; a reset must not add another ping.
 const subscribers=(await Promise.all(candidates.map(async s=>await db.get(`${base}/activityEvents/${today}-streak-${s.id}`)?null:s))).filter(Boolean);
 if(!subscribers.length)return;
 const [words,timed]=await Promise.all(['wordResults','timedResults'].map(name=>db.dayRange(base+'/'+name,'2026-10-01',today)));
 for(const sub of subscribers){
  const id=today+'-streak-'+sub.id,marker=base+'/activityEvents/'+id;
  const progress=streakAtRisk(words,timed,sub.id,today);
  if(!progress){await db.createMany([{path:marker,fields:{day:today,createdAt:now}}]);continue;}
  const closesAt=activityWindow(today).closesAt;
  let deadline;
  try{if(sub.timeZone)deadline=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:sub.timeZone}).format(closesAt);}catch(_){}
  if(!deadline)deadline=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(closesAt+sub.utcOffsetMinutes*60000);
  await db.createMany([{path:marker,fields:{day:today,createdAt:now}},{path:base+'/outbox/'+id,fields:{to:sub.id,title:'A little time to play ✦',body:`Your ${progress.current}-day ${progress.name} streak is still open until ${deadline}.`,kind:'game-streak',ref:'streak/'+today+'/'+progress.type,url:'activities.html#'+(progress.type==='word'?'wordle':progress.type==='trio'?'daily':progress.type),createdAt:now,sendAt:now}}]);
 }
}
export async function streakReminderWanted(db,base,message,now){
 const match=/^streak\/(\d{4}-\d{2}-\d{2})\/(word|search|crossword|trio)$/.exec(message.ref||'');
 if(!match||match[1]!==activityClock(new Date(now)).day)return false;
 const [,day,type]=match;
 const [words,timed]=await Promise.all(['wordResults','timedResults'].map(name=>db.dayRange(base+'/'+name,day,day)));
 return dailyStates(words,timed,message.to,day).some(g=>(type==='trio'||g.type===type)&&!g.done);
}
