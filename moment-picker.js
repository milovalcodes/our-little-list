// "Which day, what time" as chips: today / tomorrow / weekend / a date, and
// morning-ish / after lunch / evening / an exact time. Pure, so it can be
// tested with a pinned clock; the asks composer and nothing else uses it now
// that reminders are asks with a time.

export function pickMoment({ day = 'today', time = '09:00', customDay = '', customTime = '', now = new Date() } = {}) {
  const value = new Date(now.getTime());
  value.setSeconds(0, 0);
  if (day === 'tomorrow') value.setDate(value.getDate() + 1);
  if (day === 'custom') {
    if (!customDay) return null;
    const [y, m, d] = String(customDay).split('-').map(Number);
    if (![y, m, d].every(Number.isFinite)) return null;
    value.setFullYear(y, m - 1, d);
  }
  const chosenTime = time === 'custom' ? customTime : time;
  if (!chosenTime) return null;
  const [h, min] = String(chosenTime).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  value.setHours(h, min, 0, 0);
  if (day === 'weekend') {
    // On a weekday this is the coming Saturday. On a Saturday or Sunday it is
    // today while the time is still ahead, and otherwise the next weekend day —
    // not the Saturday after, which is what this used to do.
    const weekday = value.getDay();
    if (weekday !== 0 && weekday !== 6) value.setDate(value.getDate() + (6 - weekday));
    else if (value.getTime() <= now.getTime()) value.setDate(value.getDate() + (weekday === 6 ? 1 : 6));
  }
  return value;
}
