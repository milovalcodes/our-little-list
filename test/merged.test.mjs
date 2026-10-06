// The pieces that used to exist twice and now exist once.
import assert from 'node:assert/strict';
import { pickMoment } from '../moment-picker.js';
import { fridgeNote } from '../fridge.js';
import { hereLine, statusShows, focusActive } from '../availability.js';
import { normalizeNotificationPreferences, notificationKindEnabled, reminderSourcePath, reminderStillWanted, quietHoursEndUtc } from '../notification-policy.js';
import { QUESTIONS, LEGACY_QUESTIONS, QUESTION_START_DAY, NEW_BANK_DAY, promptFor, questionClock, questionForDay, questionPhase } from '../question-prompts.js';
import { newActivityCount } from '../activity-summary.js';
import { readFileSync } from 'node:fs';

assert.equal(QUESTIONS.length, 150);
assert.equal(new Set(QUESTIONS.map(question => question.prompt)).size, QUESTIONS.length, 'no duplicate daily prompts');
assert.equal(LEGACY_QUESTIONS.length, 150, 'old days keep the bank they were asked from');
// Days already asked must keep their words, or old answers would sit under a new question.
assert.equal(questionForDay('2026-10-02').prompt, LEGACY_QUESTIONS[questionForDay('2026-10-02').promptId].prompt);
assert.equal(promptFor('2026-10-06', 9), 'Which fictional world would be the funniest place for us to live?');
assert.equal(promptFor(NEW_BANK_DAY, questionForDay(NEW_BANK_DAY).promptId), questionForDay(NEW_BANK_DAY).prompt);
assert.ok(QUESTIONS.every(question => question.prompt.length < 200));
const start = Date.parse(`${NEW_BANK_DAY}T00:00:00Z`);
const dayAt = index => new Date(start + index * 86400000).toISOString().slice(0, 10);
const dailyIds = Array.from({ length: QUESTIONS.length }, (_, index) => questionForDay(dayAt(index)).promptId);
assert.equal(new Set(dailyIds).size, QUESTIONS.length, 'each question appears exactly once');
assert.equal(questionForDay(dayAt(QUESTIONS.length)), null, 'the bank stops instead of repeating');
assert.equal(questionPhase({ day:'2026-10-01', open:true }), 'upcoming', 'before launch is not an exhausted bank');
assert.equal(questionPhase({ day:'2026-10-02', open:false }), 'waiting');
assert.equal(questionPhase({ day:'2026-10-02', open:true }), 'open');
assert.equal(questionPhase({ day:dayAt(QUESTIONS.length), open:true }), 'exhausted');
assert.equal(questionClock(new Date('2026-10-02T11:59:00Z')).open, false);
assert.equal(questionClock(new Date('2026-10-02T12:00:00Z')).open, true);
assert.equal(questionClock(new Date('2026-11-01T12:00:00Z')).open, false, '8 a.m. follows daylight saving time');
assert.equal(questionClock(new Date('2026-11-01T13:00:00Z')).open, true);
console.log(' ok  one shared question opens at 8 a.m. Eastern and never repeats');

// Asks with a time use the reminder page's old day/time chips.
const saturdayMorning = new Date(2026, 9, 3, 8, 0);
const saturdayNight = new Date(2026, 9, 3, 22, 0);
const wednesday = new Date(2026, 8, 30, 8, 0);
const at = (now, day, time) => pickMoment({ day, time, now });
assert.equal(at(saturdayMorning, 'weekend', '19:00').getDate(), 3, '"weekend" on a Saturday morning is tonight');
assert.equal(at(saturdayNight, 'weekend', '09:00').getDate(), 4, 'and on a Saturday night it is Sunday, not next Saturday');
assert.equal(at(wednesday, 'weekend', '09:00').getDate(), 3, 'on a weekday it is the coming Saturday');
assert.equal(at(wednesday, 'tomorrow', '13:00').getHours(), 13);
assert.equal(pickMoment({ day: 'custom', time: '09:00', customDay: '', now: wednesday }), null, 'no date picked yet');
assert.equal(pickMoment({ day: 'today', time: 'custom', customTime: '', now: wednesday }), null, 'no time picked yet');
assert.equal(pickMoment({ day: 'custom', time: 'custom', customDay: '2026-12-24', customTime: '18:30', now: wednesday }).toDateString(), new Date(2026, 11, 24).toDateString());
console.log(' ok  asks with a time pick the moment the reminder page used to');

// One switch for asks and reminders; arrivals get their own.
assert.equal(notificationKindEnabled('reminder', { categories: { asks: false } }), false);
assert.equal(notificationKindEnabled('item', { categories: { listsAdded: false, listsFinished: true } }), false);
assert.equal(notificationKindEnabled('item-finished', { categories: { listsAdded: false, listsFinished: true } }), true);
assert.equal(normalizeNotificationPreferences({ categories: { lists: false } }).categories.listsAdded, false);
assert.equal(normalizeNotificationPreferences({ categories: { lists: false } }).categories.listsFinished, false);
assert.equal(notificationKindEnabled('help', { categories: { asks: false } }), false);
assert.equal(notificationKindEnabled('arrival', { categories: { arrivals: false } }), false);
assert.equal(notificationKindEnabled('status', { categories: { arrivals: false } }), true, 'muting arrivals leaves status alone');
assert.equal(normalizeNotificationPreferences({ categories: { help: false } }).categories.asks, true, 'one old switch off is not both');
assert.equal(normalizeNotificationPreferences({ categories: { help: false, reminders: false } }).categories.asks, false, 'both old switches off stays off');
assert.equal(normalizeNotificationPreferences({ categories: { status: false } }).categories.arrivals, false, 'arrivals were part of the old status switch');
console.log(' ok  notification switches merged without flipping anyone\'s choice');
const quiet = { enabled:true, from:'22:00', to:'08:00' };
const lateUtc = Date.UTC(2026, 8, 30, 2, 30); // 10:30 pm on a UTC-4 phone
assert.equal(quietHoursEndUtc(lateUtc, quiet, -240), Date.UTC(2026, 8, 30, 12));
assert.equal(quietHoursEndUtc(Date.UTC(2026, 8, 30, 13), quiet, -240), 0);
assert.equal(quietHoursEndUtc(lateUtc, { ...quiet, enabled:false }, -240), 0);
assert.equal(quietHoursEndUtc(lateUtc, quiet, NaN), 0, 'an old subscription without an offset does not guess a timezone');
console.log(' ok  quiet hours end at the phone’s local morning');

// Nudges for asks look up the ask; nothing else can be reached.
assert.equal(reminderSourcePath('help/abc'), 'help/abc');
assert.equal(reminderSourcePath('R1'), 'reminders/R1', 'old reminders carried a bare id');
assert.equal(reminderSourcePath('../pushSubs/her'), '');
assert.equal(reminderSourcePath('help/a/b'), '');
assert.equal(reminderStillWanted({ state: 'open' }), true);
assert.equal(reminderStillWanted({ state: 'on-it' }), true, 'saying "on it" early still wants the nudge');
assert.equal(reminderStillWanted({ state: 'done' }), false);
assert.equal(reminderStillWanted(null), false);
console.log(' ok  a timed ask can only look itself up');

// One "are they around" line instead of three that could disagree.
const now = Date.now();
assert.deepEqual(hereLine({ presence: { lastSeenAt: now - 5000 }, status: { state: 'dnd' }, now }), { here: true, text: 'here now · busy', state: 'dnd' });
assert.equal(hereLine({ presence: { lastSeenAt: now - 5000 }, status: { state: 'online' }, now }).text, 'here now');
assert.deepEqual(hereLine({ presence: { lastSeenAt: now - 5000 }, status: { state: 'invisible' }, now }), { here: false, text: 'lurking', state: 'invisible' }, 'lurking means not showing as here');
assert.equal(hereLine({ now }).text, 'not here rn');
console.log(' ok  being here and being around read as one line');

// What a status says: focus, a short trip update, your own words, then place.
// None of the temporary bits overwrite the words underneath.
const both = { text: 'humming', category: 'listening to', emoji: '🎧', expiresAt: 0, focusLabel: 'laundry', focusUntil: now + 60000, locationText: 'vibing at home' };
assert.equal(statusShows(both, now).kind, 'focus');
assert.equal(statusShows({ ...both, focusUntil: 0, arrival: 'almost there', arrivalAt: now - 44*60000 }, now).text, 'almost there');
assert.equal(statusShows({ ...both, focusUntil: 0, arrival: 'almost there', arrivalAt: now - 46*60000 }, now).text, 'humming', 'the trip update expires after 45 minutes');
assert.equal(statusShows({ energy: 'low battery' }, now).text, 'low battery', 'older energy-only statuses stay readable');
assert.equal(statusShows({ ...both, focusUntil: now - 1 }, now).text, 'humming', 'when focus ends your status is back');
assert.equal(statusShows({ ...both, focusUntil: 0, expiresAt: now - 1 }, now).kind, 'location', 'an expired status falls back to where you are');
assert.equal(statusShows(null, now).kind, 'none');
assert.equal(focusActive({ focusUntil: now + 1 }, now), true);
console.log(' ok  focus, your words and your spot share one status without overwriting each other');

// The fridge is the newest pinned note.
const notes = [
  { id: 'a', body: 'old', pinned: true, pinnedAt: 10 },
  { id: 'b', body: 'new', pinned: true, pinnedAt: 20 },
  { id: 'c', body: 'not pinned', createdAt: 30 }
];
assert.equal(fridgeNote(notes).id, 'b');
assert.equal(fridgeNote([{ id: 'c' }]), null);
console.log(' ok  the fridge shows the pinned note');

const recent=Date.now();
assert.equal(newActivityCount({
  items:[{addedBy:'her',createdAt:recent}],
  help:[{from:'him',to:'him',createdAt:recent},{from:'her',to:'him',createdAt:recent}],
  statuses:[{id:'her',updateKind:'location',updatedAt:recent},{id:'her',updateKind:'custom',updatedAt:recent}]
},'him','her',recent-1),3,'home and Today count one list item, one partner ask, one status, not self or auto-location');
for(const name of ['dashboard.js','today.js','live-notes.js','activity-feed.js','app-chrome.js']){
  const source=readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
  assert.doesNotMatch(source,/listenTo\(['"]reminders['"]|buckets\.reminders|listenTo\(['"]pins['"]/,`${name} must not revive old listeners`);
}
console.log(' ok  Home and Today count the same things, with no old listeners');

console.log('\nMERGED PIECES CLEAN');
