export const ACTIVITY_TIME_ZONE='America/New_York';
export const ACTIVITY_HOUR=9;
export function activityClock(now=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:ACTIVITY_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const calendarDay=`${parts.year}-${parts.month}-${parts.day}`;
  const day=Number(parts.hour)<ACTIVITY_HOUR?new Date(Date.parse(calendarDay+'T12:00:00Z')-86400000).toISOString().slice(0,10):calendarDay;
  return {day,calendarDay,open:true,hour:Number(parts.hour),minute:Number(parts.minute)};
}
export function activityWindow(day) {
  const instant=Date.parse(day+'T14:00:00Z');
  if(!Number.isFinite(instant)||new Date(instant).toISOString().slice(0,10)!==day)throw Error('invalid activity day');
  const opening=date=>{
    const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:ACTIVITY_TIME_ZONE,hour:'2-digit',hourCycle:'h23'}).format(date));
    return date.getTime()+(ACTIVITY_HOUR-hour)*3600000;
  };
  return {opensAt:opening(new Date(instant)),closesAt:opening(new Date(instant+86400000))};
}
