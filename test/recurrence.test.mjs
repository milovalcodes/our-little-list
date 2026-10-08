// A repeating chore that rolls to a date already in the past is worse than no
// repeat at all: it sits in "overdue" forever and needs one tap per missed day.
// These pin the arithmetic down, including the month-end case that used to send
// a task due the 31st of January to the 3rd of March.

import assert from 'node:assert/strict';
import { nextDue, repeatCompletion, groceryListFinished } from '../recurrence.js';
function dateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

const today = new Date();
today.setHours(12, 0, 0, 0);
const key = offsetDays => dateKey(new Date(today.getTime() + offsetDays * 86400000));

for (const repeat of ['daily', 'weekly', 'monthly']) {
  for (const offset of [0, -1, -3, -40, -400]) {
    const rolled = nextDue(key(offset), repeat);
    assert.ok(rolled > dateKey(today), `${repeat} from ${offset}d ago rolled to ${rolled}, which is not in the future`);
  }
}
console.log(' ok  every repeat lands in the future, however far behind it was');

assert.equal(nextDue(key(-3), 'daily'), key(1), 'a daily chore three days behind comes back tomorrow, not three days ago');
console.log(' ok  a missed daily catches up instead of needing a tap per day');

// Worked out from today rather than hardcoded: the old fixed answers
// ("the 30th", "2026-10-15") were only true during September 2026.
function expectedMonthly(anchorDay) {
  for (let step = 0; step < 3; step++) {
    const month = new Date(today.getFullYear(), today.getMonth() + step, 1, 12);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const candidate = dateKey(new Date(month.getFullYear(), month.getMonth(), Math.min(anchorDay, last), 12));
    if (candidate > dateKey(today)) return candidate;
  }
  throw new Error('no monthly date within three months');
}
assert.equal(nextDue('2026-01-31', 'monthly'), expectedMonthly(31), 'monthly keeps the day it was given, clamped to the month');
assert.equal(nextDue('2026-01-15', 'monthly'), expectedMonthly(15), 'monthly keeps the 15th while catching up');
console.log(' ok  monthly keeps its day of the month across a February');

assert.ok(nextDue('', 'daily') > dateKey(today));
assert.ok(nextDue('not-a-date', 'weekly') > dateKey(today));
assert.equal(nextDue(key(0), 'once'), key(0), 'a one-off is never rolled');
console.log(' ok  a missing, broken or non-repeating date is handled');

console.log('\nRECURRENCE CLEAN');

for (const year of [2027, 2028]) {
  let task = { due:`${year}-01-31`, recurrence:'monthly' };
  task = { ...task, ...repeatCompletion(task,'her',new Date(year,0,31,12)) };
  assert.equal(task.due, `${year}-02-${year === 2028 ? 29 : 28}`);
  task = { ...task, ...repeatCompletion(task,'him',new Date(year,1,28,12)) };
  assert.equal(task.due, `${year}-03-31`, 'a separate completion after February remembers the 31st');
}
const grocery = { id:'milk',type:'grocery',done:false };
const repeating = { id:'eggs',type:'grocery',done:false,recurrence:'weekly' };
assert.equal(groceryListFinished([grocery,repeating],grocery),false);
assert.equal(groceryListFinished([repeating],repeating),false);
assert.equal(groceryListFinished([grocery,{...repeating,done:true}],grocery),true);
console.log(' ok  month-end dates survive separate completions; unfinished repeats never mean an empty grocery list');
