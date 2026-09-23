// A repeating chore that rolls to a date already in the past is worse than no
// repeat at all: it sits in "overdue" forever and needs one tap per missed day.
// These pin the arithmetic down, including the month-end case that used to send
// a task due the 31st of January to the 3rd of March.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../tasks.js', import.meta.url), 'utf8');
function dateKey(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
const nextDue = new Function('dateKey', `${source.slice(source.indexOf('function nextDue'))}; return nextDue;`)(dateKey);

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

assert.equal(nextDue('2026-01-31', 'monthly').slice(-2), '30', 'monthly keeps the day it was given, clamped to the month');
assert.equal(nextDue('2026-01-15', 'monthly'), '2026-10-15', 'monthly keeps the 15th while catching up');
console.log(' ok  monthly keeps its day of the month across a February');

assert.ok(nextDue('', 'daily') > dateKey(today));
assert.ok(nextDue('not-a-date', 'weekly') > dateKey(today));
assert.equal(nextDue(key(0), 'once'), key(0), 'a one-off is never rolled');
console.log(' ok  a missing, broken or non-repeating date is handled');

console.log('\nRECURRENCE CLEAN');
