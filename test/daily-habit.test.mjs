import assert from 'node:assert/strict';
import {dailyStates,nextPuzzleTime} from '../daily-habit.js';
import {dueRows} from '../needs-you.js';
import {trioStreak,personalBadges,streakAtRisk} from '../game-progress.js';
import {shiftDay} from '../word-scores.js';
import {localEvening,scheduleStreakReminders,streakReminderWanted} from '../worker/src/streak-reminders.js';
import {normalizeNotificationPreferences,notificationKindEnabled} from '../notification-policy.js';
for(const [instant,expected] of [['2026-11-01T12:59:59Z','01:00:01'],['2026-11-01T13:59:59Z','00:00:01'],['2026-11-01T14:00:00Z','24:00:00'],['2027-03-14T12:59:59Z','00:00:01'],['2027-03-13T14:00:00Z','23:00:00']])assert.equal(nextPuzzleTime(Date.parse(instant)),expected);
const day='2026-10-21',partner={day,person:'him',done:true,won:true,attempts:1};
let states=dailyStates([partner],[],'her',day);
assert.equal(states[0].label,'your turn · partner done');assert.ok(!JSON.stringify(states).includes('60'));
assert.equal(dailyStates([partner,{...partner,person:'her'}],[],'her',day)[0].label,'both done ✦');
assert.equal(dueRows({gamesReady:true,wordResults:[partner]},'her',new Date(day+'T18:00Z')).filter(r=>r.kind==='game').length,3);
assert.equal(dueRows({},'her',new Date(day+'T18:00Z')).length,0,'unknown is not unplayed');
const words=[],timed=[];
function add(date,person='her'){
 words.push({day:date,person,done:true,won:true,attempts:2});
 for(const type of ['search','crossword'])timed.push({day:date,type,person,done:true,complete:true,count:6,total:6,durationMs:120000,startedAt:Date.parse(date+'T14:00Z'),finishedAt:Date.parse(date+'T14:00:40Z')});
}
for(let i=0;i<5;i++)add(shiftDay('2026-10-19',i));
assert.equal(trioStreak(words,timed,'her','2026-10-23').freezes,1);
assert.equal(trioStreak(words,timed,'her','2026-10-24').freezes,1,'today is not frozen before reset');
let progress=trioStreak(words,timed,'her','2026-10-25');assert.equal(progress.freezes,0);assert.deepEqual(progress.used,['2026-10-24']);assert.equal(progress.current,5);
assert.equal(trioStreak(words,timed,'her','2026-10-26').current,0,'a freeze covers exactly one day');
assert.equal(trioStreak([...words,...words],timed,'her','2026-10-23').earned,1,'duplicate snapshots cannot earn twice');
assert.equal(trioStreak(words,timed,'him','2026-10-23').earned,0);
assert.equal(streakAtRisk(words.filter(r=>r.day<day),[],'her',day).type,'word','a word streak can receive a reminder without playing the other games');
assert.ok(personalBadges(words,timed,'her','2026-10-23').includes('⚡ crossword under a minute'));
assert.equal(notificationKindEnabled('game-streak',normalizeNotificationPreferences()),false);
assert.equal(notificationKindEnabled('game-turn',normalizeNotificationPreferences({categories:{questions:false}})),false);
const now=Date.parse('2026-10-22T00:05Z');
assert.equal(localEvening(now,{timeZone:'America/New_York'}),true);assert.equal(localEvening(now,{timeZone:'Asia/Tokyo'}),false);
assert.equal(localEvening(now,{utcOffsetMinutes:-240}),true);
const base='households/test',docs=new Map();
const db={async get(p){return docs.get(p)||null;},async list(p){return [...docs].filter(([k])=>k.startsWith(p+'/')).map(([k,v])=>({id:k.split('/').at(-1),...v}));},async dayRange(p,a,b){return (await this.list(p)).filter(r=>r.day>=a&&r.day<=b);},async createMany(rows){if(rows.some(r=>docs.has(r.path)))return false;rows.forEach(r=>docs.set(r.path,r.fields));return true;}};
docs.set(base+'/pushSubs/her',{timeZone:'America/New_York',preferences:{categories:{gameStreaks:true}}});
for(const r of [...words,...timed].filter(r=>r.day<day))docs.set(`${base}/${r.type?'timedResults':'wordResults'}/${r.day}-${r.type||'word'}-${r.person}`,r);
await scheduleStreakReminders(db,base,now);await scheduleStreakReminders(db,base,now);
const pings=await db.list(base+'/outbox');assert.equal(pings.length,1);assert.match(pings[0].body,/2-day/);
assert.equal(await streakReminderWanted(db,base,pings[0],now),true);
for(const r of [...words,...timed].filter(r=>r.day===day))docs.set(`${base}/${r.type?'timedResults':'wordResults'}/${r.day}-${r.type||'word'}-${r.person}`,r);
assert.equal(await streakReminderWanted(db,base,pings[0],now),false,'a queued reminder is dropped after play');
console.log('Daily habit: DST reset, private statuses, cosmetic freezes, badges, opt-in reminders and deduplication pass');

// Quiet hours follow local civil time even if the phone last registered before
// a clock change. A skipped ending hour releases at the jump, not an hour late.
{
 const {quietHoursEndUtc}=await import('../notification-policy.js');
 const quiet={enabled:true,from:'22:00',to:'08:00'},zone='America/New_York';
 const end=(at,q=quiet,offset=-240,z=zone)=>new Date(quietHoursEndUtc(Date.parse(at),q,offset,z)).toISOString();
 assert.equal(end('2026-11-01T04:30Z'),'2026-11-01T13:00:00.000Z');
 assert.equal(end('2026-03-08T05:30Z',quiet,-300),'2026-03-08T12:00:00.000Z');
 assert.equal(end('2026-03-08T05:30Z',{...quiet,to:'02:30'},-300),'2026-03-08T07:00:00.000Z');
 assert.equal(end('2026-11-01T05:40Z',{enabled:true,from:'01:30',to:'02:30'}),'2026-11-01T06:00:00.000Z');
 assert.equal(end('2026-10-20T01:00Z',quiet,540,'Asia/Tokyo'),'1970-01-01T00:00:00.000Z');
 assert.equal(end('2026-10-20T03:00Z',quiet,-240,'invalid-zone'),'2026-10-20T12:00:00.000Z');
 console.log('Quiet hours: DST spring/fall, skipped/repeated times, IANA zones and legacy fallback pass');
}
