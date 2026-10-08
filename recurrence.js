// Shared by the List, Home and Today. Keep a monthly anchor on the record:
// February's shorter date is a clamp, not a new schedule.
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export function recurrenceAnchor(item, now = new Date()) {
  const saved = Number(item.recurrenceDay);
  if (Number.isInteger(saved) && saved >= 1 && saved <= 31) return saved;
  const due = new Date(`${item.due || ''}T12:00:00`);
  return Number.isNaN(due.getTime()) ? now.getDate() : due.getDate();
}

export function nextDue(value, repeat, anchorDay, now = new Date()) {
  const today = new Date(now); today.setHours(12,0,0,0);
  let next = value ? new Date(`${value}T12:00:00`) : new Date(today);
  if (Number.isNaN(next.getTime())) next = new Date(today);
  const anchor = recurrenceAnchor({ due:dateKey(next), recurrenceDay:anchorDay }, today);
  const step = () => {
    if (repeat === 'daily') next.setDate(next.getDate()+1);
    else if (repeat === 'weekly') next.setDate(next.getDate()+7);
    else if (repeat === 'monthly') {
      next.setDate(1); next.setMonth(next.getMonth()+1);
      next.setDate(Math.min(anchor, new Date(next.getFullYear(),next.getMonth()+1,0).getDate()));
    }
  };
  if (!['daily','weekly','monthly'].includes(repeat)) return dateKey(next);
  let guard=0; do { step(); guard++; } while (next<=today && guard<4000);
  if (next<=today) { next=new Date(today); step(); }
  return dateKey(next);
}

export function repeatCompletion(item, viewer, now = new Date()) {
  const recurrenceDay = recurrenceAnchor(item, now);
  return { done:false, due:nextDue(item.due,item.recurrence,recurrenceDay,now), recurrenceDay,
    previousDue:item.due||'', lastDoneBy:viewer, lastDoneAt:now.getTime() };
}

export function groceryListFinished(items, completed) {
  // Repeating groceries stay on the list with their next date. Do not claim
  // the list is empty while they (or any other unchecked item) remain there.
  return completed.type === 'grocery' && (!completed.recurrence || completed.recurrence === 'once')
    && !items.some(item => item.id !== completed.id && item.type === 'grocery' && !item.done);
}
