// One answer to "what needs me?", shared by Home (Next up) and Today (Due &
// waiting). They used to keep two slightly different copies of these rules, so
// the two lists disagreed: Today showed groceries and timed asks, Home did not,
// and Home counted "today" in New York time while Today used the phone's clock.
import { dateKey } from './ui-helpers.js';
import { friendlyWhen } from './time-format.js';
import {isRoutine,routineDue,checkedToday,listDay} from './list-schedule.js';

// Things due today or overdue, and asks waiting on you. An ask with a time (what
// reminders are now) belongs to its day: "Friday" does not crowd Monday, and it
// stays until it is done even once answered. Asks without a time wait here until
// they are answered.
export function dueRows({ items = [], help = [], routineChecks = [], routinesReady = true }, viewer, now = new Date()) {
  const today = dateKey(now);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const due = items
    .filter(item => isRoutine(item)?routinesReady&&routineDue(item,listDay(now))&&!checkedToday(item,routineChecks,listDay(now)):!item.done && item.due && item.due <= today)
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''))
    .map(item => ({ id: item.id, kind: 'item', icon: item.type === 'grocery' ? '🛒' : '✓', title: item.title, meta: isRoutine(item)?'routine · today':item.due < today ? 'overdue' : 'today', href: `tasks.html#item-${item.id}` }));
  const asks = help
    .filter(item => {
      if (['done','cant'].includes(item.state)) return false;
      const at = Number(item.dueAt);
      if (at > 0) return at > now.getTime() - 3 * 3600000 && at <= end.getTime() && !['done', 'cant'].includes(item.state);
      return true;
    })
    .sort((a, b) => (Number(a.dueAt) || Infinity) - (Number(b.dueAt) || Infinity))
    .map(item => ({ id: item.id, kind: 'ask', icon: item.emoji || (Number(item.dueAt) > 0 ? '⏰' : '🙋'), title: item.title, meta: Number(item.dueAt) > 0 ? `⏰ ${friendlyWhen(Number(item.dueAt))}` : 'waiting on you', href: `tasks.html#ask-${item.id}` }));
  return [...due, ...asks];
}

// Keep each kind represented rather than letting one long list crowd the other
// out of the rows there is room for: take one of each kind in turn.
export function fairShare(rows, limit) {
  if (rows.length <= limit) return rows;
  const kinds = new Map();
  rows.forEach(row => { if (!kinds.has(row.kind)) kinds.set(row.kind, []); kinds.get(row.kind).push(row); });
  const picked = [];
  while (picked.length < limit) {
    let took = false;
    for (const queue of kinds.values()) {
      if (picked.length >= limit) break;
      if (queue.length) { picked.push(queue.shift()); took = true; }
    }
    if (!took) break;
  }
  return rows.filter(row => picked.includes(row));
}
