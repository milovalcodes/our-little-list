import { escapeHtml, toast, showFailure } from './ui-helpers.js';
import { repeatCompletion, groceryListFinished } from './recurrence.js';
import { personName } from './profile-store.js';
import { prettyDue } from './time-format.js';

const ANSWERS = { 'on-it':['on it ✓','on it'], later:['in a bit ⏳','in a bit'], cant:["can't rn ✗","can't right now"] };

export function inlineActionMarkup(row, className='today-row') {
  const href = escapeHtml(row.href);
  const title = escapeHtml(row.title);
  const meta = row.meta ? `<small>${escapeHtml(row.meta)}</small>` : '';
  if (row.kind === 'item') return `<div class="${className} inline-action-row" data-inline-kind="item" data-id="${escapeHtml(row.id)}"><button class="inline-check" type="button" data-inline-action="finish" aria-label="Finish ${title}">✓</button><a href="${href}"><strong>${title}</strong>${meta}</a></div>`;
  if (row.kind === 'ask') return `<div class="${className} inline-action-row" data-inline-kind="ask" data-id="${escapeHtml(row.id)}"><span class="inline-ask-icon" aria-hidden="true">${escapeHtml(row.icon || '🙋')}</span><a href="${href}"><strong>${title}</strong>${meta}</a><div class="inline-answers">${Object.entries(ANSWERS).map(([value,[label]])=>`<button type="button" data-inline-action="${value}" aria-label="${escapeHtml(label)}: ${title}">${escapeHtml(label)}</button>`).join('')}</div></div>`;
  return `<a class="${className}" href="${href}"><span>${escapeHtml(row.icon || '✦')}</span><strong>${title}</strong><i>›</i></a>`;
}
export async function handleInlineAction(event, { data, viewer, other, items, help }) {
  const button = event.target.closest('[data-inline-action]');
  if (!button || button.disabled) return;
  const row = button.closest('[data-inline-kind][data-id]');
  if (!row || row.dataset.inlinePending) return;
  row.dataset.inlinePending = 'true';
  const controls = [...row.querySelectorAll('[data-inline-action]')];
  controls.forEach(control => { control.disabled = true; });
  let saved = false;
  try {
    if (row.dataset.inlineKind === 'item') {
      const item = items.find(entry => entry.id === row.dataset.id);
      if (!item || item.done) return;
      if (item.recurrence && item.recurrence !== 'once') {
        const update = repeatCompletion(item, viewer);
        await data.updateIn('items', item.id, update);
        toast(`done · back on ${prettyDue(update.due)}`);
      } else {
        await data.updateIn('items', item.id, { done:true, doneBy:viewer, doneAt:Date.now() });
      }
      saved = true;
      if (item.type !== 'grocery') void data.notify(other, { title:`${personName(viewer)} finished something ✓`, body:item.title, url:`tasks.html#done-${item.id}`, kind:'item-finished' });
      else if (groceryListFinished(items,item)) void data.notify(other, { title:`${personName(viewer)} got all the groceries 🛒`, body:'the grocery list is empty', url:'tasks.html#grocery', kind:'item-finished' });
      return;
    }
    const request = help.find(entry => entry.id === row.dataset.id);
    const answer = button.dataset.inlineAction;
    if (!request || !ANSWERS[answer] || request.state === answer) return;
    await data.updateIn('help', request.id, { state:answer, answeredAt:Date.now() });
    saved = true;
    if (request.from !== viewer) void data.notify(request.from, { title:`${personName(viewer)}: ${ANSWERS[answer][1]}`, body:request.title, url:`tasks.html#ask-${request.id}`, kind:'help-answer' });
    toast(ANSWERS[answer][0]);
  } catch (_) {
    showFailure('that did not stick.', 'check the internet and try again.');
  } finally {
    if (!saved && row.isConnected) {
      delete row.dataset.inlinePending;
      controls.forEach(control => { control.disabled = false; });
    }
  }
}
