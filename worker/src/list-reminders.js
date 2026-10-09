import {reminderCandidates,isRoutine,checkId,listInstant,routineDue} from '../../list-schedule.js';
// A persisted marker plus both outbox rows in one atomic commit prevents a
// restart, retry or overlapping cron pass from ringing twice.
export async function scheduleListReminders(db,household,now) {
  const items=await (db.withReminders?db.withReminders(`${household}/items`):db.list(`${household}/items`));
  for(const item of items) {
    for(const p of reminderCandidates(item,now)) {
      if(isRoutine(item)&&(await db.get(`${household}/routineChecks/${checkId(item.id,p.day)}`))?.done)continue;
      const key=`list-${item.id}-${p.at}-${p.offset}`;
      if(await db.get(`${household}/listReminderEvents/${key}`))continue;
      const targets=item.reminderTo==='her'||item.reminderTo==='him'?[item.reminderTo]:['her','him'];
      await db.createMany([
        {path:`${household}/listReminderEvents/${key}`,fields:{createdAt:now}},
        ...targets.map(to=>({path:`${household}/outbox/${key}-${to}`,fields:{to,title:p.offset?`In ${p.offset===60?'1 hour':p.offset+' minutes'} · ${item.title}`.slice(0,120):`Time for ${item.title}`.slice(0,120),body:isRoutine(item)?'On our routine today':'On our list',url:`tasks.html#item-${item.id}`,kind:'list-reminder',ref:`items/${item.id}`,day:p.day,at:p.at,offset:p.offset,sendAt:now,createdAt:now}}))
      ]);
    }
  }
}
export async function listReminderWanted(db,household,message) {
  if(!/^items\/[A-Za-z0-9_-]+$/.test(message.ref||''))return false;
  const item=await db.get(`${household}/${message.ref}`);
  if(!item||item.done||!item.reminderOffsets?.includes(message.offset))return false;
  if(['her','him'].includes(item.reminderTo)&&item.reminderTo!==message.to)return false;
  if(listInstant(message.day,item.reminderTime)!==message.at)return false;
  if(isRoutine(item)) {
    if(!routineDue(item,message.day))return false;
    if((await db.get(`${household}/routineChecks/${checkId(item.id,message.day)}`))?.done)return false;
  } else if(item.due!==message.day)return false;
  // A stale heads-up must not ring after the task itself was due.
  return Date.now() < message.at+(message.offset===0?15*60000:0);
}
