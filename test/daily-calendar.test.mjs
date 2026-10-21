import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import compiled from '../worker/src/compiled-crosswords.json' with {type:'json'};
import {auditDailyCalendar} from '../scripts/audit-daily-calendar.mjs';
import {ROUND_EXPANSION} from '../round-expansion.js';
import {CROSSWORD_THEMES} from '../crossword-themes.js';
import {NO_REPEAT_START,weeklyRounds,roundWords} from '../round-engine.js';
import {wordHint} from '../word-hints.js';
assert.equal(NO_REPEAT_START,'2026-10-21');
assert.equal(createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(compiled.rounds).filter(([day])=>day<NO_REPEAT_START)))).digest('hex'),'0c38d95f732529f290dbc168cb661b5d7bf77b59fd962e00ccd7853110e953af','published earlier boards stay fixed');
assert.equal(ROUND_EXPANSION.length,150);
assert.equal(new Set(ROUND_EXPANSION.map(e=>e.word)).size,150);
for(const e of ROUND_EXPANSION){assert.ok(e.clue.length>=20);if(e.word.length===5)assert.ok(wordHint(e.word),e.word);}
const result=auditDailyCalendar(compiled);
// Random-access and chronological building must select the identical boards.
for(const day of ['2026-10-21','2026-11-02','2026-12-08','2027-03-14','2027-11-07'])assert.deepEqual(compiled.rounds[day],weeklyRounds(day)[day]);
const seasons=new Map(CROSSWORD_THEMES.map(t=>[t.id,t.season]));
for(const month of ['2026-12','2027-10','2027-12']){
 const days=Object.entries(compiled.rounds).filter(([d])=>d.startsWith(month));
 for(const type of ['search','crossword']){
  const seasonal=days.filter(([,r])=>seasons.get(r[type].themeId.replace(/^(?:search|crossword)-v8-/,''))===(month.endsWith('10')?'october':'december'));
  assert.ok(seasonal.length>0,month+' keeps some seasonal '+type+' themes');
  assert.ok(seasonal.length<days.length,month+' also has everyday '+type+' themes');
 }
}
// Bad output must stop publication, rather than merely log a warning.
const fixture=()=>({rounds:structuredClone(Object.fromEntries(['2026-11-02','2026-11-09'].map(d=>[d,compiled.rounds[d]])))});
let bad=fixture();bad.rounds['2026-11-09'].word.word=bad.rounds['2026-11-02'].word.word;
assert.throws(()=>auditDailyCalendar(bad),/repeats/,'Monday boundaries cannot bypass the 30-day exclusion');
bad=fixture();bad.rounds['2026-11-02'].search.entries.pop();assert.throws(()=>auditDailyCalendar(bad),/incomplete/);
bad=fixture();bad.rounds['2026-11-02'].crossword.entries[0].clue='The answer is '+bad.rounds['2026-11-02'].crossword.entries[0].word;
assert.throws(()=>auditDailyCalendar(bad),/reveals/);
bad=fixture();bad.rounds['2026-11-02'].search.entries[0].start=-1;assert.throws(()=>auditDailyCalendar(bad),/out-of-grid/);
bad=fixture();bad.rounds['2026-11-02'].word.word='zzzzz';assert.throws(()=>auditDailyCalendar(bad),/accepted guess|hint/);
assert.ok(Object.values(compiled.rounds[NO_REPEAT_START]).flatMap(roundWords).length>=21);
console.log(`DAILY CALENDAR: ${result.days} days, 30-day cross-game exclusions, frozen past rounds, seasonal variety, ${result.reviewedWords} clue entries and rejection fixtures pass`);
