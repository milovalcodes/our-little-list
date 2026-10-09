// The two phones share a calendar even when one is travelling.
export const LIST_ZONE = 'America/New_York';
export const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function listDay(now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone:LIST_ZONE, year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(new Date(now)).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function isRoutine(item) { return Array.isArray(item?.routineDays) && item.routineDays.length > 0; }
export function routineDue(item, day = listDay()) { return isRoutine(item) && item.routineDays.includes(new Date(day+'T12:00Z').getUTCDay()); }
export function checkId(id, day = listDay()) { return `${id}_${day}`; }
export function checkedToday(item, checks, day = listDay()) { return checks.some(check=>check.id===checkId(item.id,day) && check.done===true); }
export function dayLabel(days) { return days.length===7?'every day':days.map(day=>WEEKDAYS[day]).join(' · '); }
// Iterate the offset, not the date, so daylight saving changes are respected.
// Nonexistent spring-forward wall times are skipped rather than ringing early.
export function listInstant(day, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day||'') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time||'')) return 0;
  const target = Date.parse(`${day}T${time}:00Z`);
  if (!Number.isFinite(target)||new Date(target).toISOString().slice(0,10)!==day) return 0;
  let instant = target;
  const format = new Intl.DateTimeFormat('sv-SE',{timeZone:LIST_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for(let i=0;i<4;i++) {
    const wall = format.format(new Date(instant)).replace(' ','T');
    const delta = target - Date.parse(wall+'Z');
    if (!delta) return instant;
    instant += delta;
  }
  return 0;
}
export function reminderCandidates(item, now = Date.now()) {
  if (!item.reminderTime || item.done || !item.reminderOffsets?.length) return [];
  // Tomorrow covers midnight routines whose first nudge is tonight.
  const today = listDay(now), tomorrow = new Date(Date.parse(today+'T12:00Z')+86400000).toISOString().slice(0,10);
  const days = isRoutine(item)?[today,tomorrow].filter(day=>routineDue(item,day)):[item.due];
  return days.flatMap(day=>{
    const at = listInstant(day,item.reminderTime);
    if (!at) return [];
    return [...new Set(item.reminderOffsets)].filter(n=>[0,15,30,60].includes(n)).map(offset=>({day,at,offset,sendAt:at-offset*60000}));
  }).filter(p=>p.sendAt<=now && now-p.sendAt<5*60000 && p.sendAt>=Number(item.reminderUpdatedAt||item.createdAt||0));
}
