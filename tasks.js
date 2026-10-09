import { escapeHtml, toast, dateKey, setButtonBusy, settleQuickly, showFailure, keepInlineEdits } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { recurrenceAnchor, repeatCompletion, groceryListFinished } from './recurrence.js';
import { personName } from './profile-store.js';
import {isRoutine,routineDue,checkedToday,listDay,dayLabel,checkId,listInstant} from './list-schedule.js';
import {watchRoutineChecks,completeRoutine} from './routine-checks.js';
import {daysFields,reminderFields,readReminderFields} from './list-fields.js';
import { addTask } from './records.js';
import { deleteWithUndo, isPendingDelete } from './undo-delete.js';
import { prettyDue } from './time-format.js';

const byId = id => document.getElementById(id);
let items = [];
let tab = 'tasks';
let when = 'whenever';
let recurrence = 'once';
let editingTaskId = '';
let recentGroceryOptions = [];
let checks=[],legacy=[];
const pending=new Set();

const { data, viewer, other } = await bootPage();
byId('task-list-card').querySelector('.list-heading').after(byId('recent-groceries'));
byId('routine-days').querySelector('.routine-days').innerHTML=daysFields();
byId('task-reminders').innerHTML=reminderFields();
watchRoutineChecks(data,next=>{checks=next;render();});
// Old asks stay in their original records, but are now ordinary checklist
// rows. No copying, lost history, or duplicate scheduled notifications.
data.listenTo('help',next=>{legacy=next;if(location.hash.startsWith('#ask-')&&tab!==tabFromHash())selectTab(tabFromHash());else render();});
function legacyItem(entry){return {...entry,id:'legacy-'+entry.id,legacyId:entry.id,type:'task',addedBy:entry.from,done:['done','cant'].includes(entry.state),due:entry.dueAt?listDay(entry.dueAt):'',recurrence:'once'};}
function allItems(){return [...items,...legacy.map(legacyItem)];}

data.listenTo('items', nextItems => {
  items = nextItems;
  // A grocery uses the same #item-id link as a to-do. Once its record lands,
  // choose the right tab so search and notification links can reveal it.
  if (/^#(?:item|done)-/.test(location.hash)&&tab!==tabFromHash()) selectTab(tabFromHash());
  else render();
});

document.querySelectorAll('.soft-chip').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.soft-chip').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    when = button.dataset.when;
  });
});
document.querySelectorAll('.repeat-chip').forEach(button=>button.addEventListener('click',()=>{recurrence=button.dataset.repeat;document.querySelectorAll('.repeat-chip').forEach(item=>item.classList.toggle('active',item===button));}));

document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => selectTab(button.dataset.tab, true));
});

byId('shared-task-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submit=event.submitter||event.currentTarget.querySelector('[type="submit"]');
  const title = byId('shared-task-title').value.trim();
  if (!title) return;
  const grocery = tab === 'grocery';
  // Groceries can repeat too (weekly milk); the repeat chips show on that tab.
  const routine=tab==='routines';
  const repeat = routine?'once':recurrence;

  // The when-chips are hidden on the grocery tab, so whatever was last picked on
  // the to-do tab must not follow the groceries over and set a due date nobody
  // can see or change.
  let due = '';
  const chosenDate = new Date();
  if (!grocery) {
    if (when === 'today') due = dateKey(chosenDate);
    if (when === 'tomorrow') {
      chosenDate.setDate(chosenDate.getDate() + 1);
      due = dateKey(chosenDate);
    }
  }

  setButtonBusy(submit,true,'…');
  try{
    const schedule=grocery?{}:readReminderFields(event.target);
    if(routine){schedule.routineDays=[...byId('routine-days').querySelectorAll(':checked')].map(i=>Number(i.value));if(!schedule.routineDays.length)throw Error('Choose at least one day.');due='';}
    else if(!grocery)due=event.target.querySelector('[name=exactDue]').value||due;
    if(repeat!=='once'&&!due)due=dateKey(new Date());
    if(schedule.reminderTime&&!routine&&(!due||listInstant(due,schedule.reminderTime)<=Date.now()))throw Error('Choose a future day and time for the reminder.');
    await settleQuickly(addTask(data,{viewer,other,title,type:grocery?'grocery':'task',due,recurrence:repeat,schedule,aisle:grocery?byId('grocery-aisle').value:''}),`“${title.slice(0,40)}” did not get added.`);
    event.target.reset();toast(tab==='grocery'?'on the grocery list 🛒':'added 🫡');
    byId('task-composer').querySelector('[data-close-sheet]')?.click();
  }catch(error){showFailure('that did not get added.',/Choose/.test(error.message)?error.message:'check the internet, then try again. Your text is still here.');}
  finally{setButtonBusy(submit,false);}
});

byId('task-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const row = button.closest('[data-id]');
  const item = allItems().find(entry => entry.id === row?.dataset.id);
  if (!item || pending.has(item.id)) return;
  const routine=isRoutine(item),day=row.dataset.day||listDay();
  const done=routine?checkedToday(item,checks,day):item.done;
  if (button.dataset.action === 'edit') {
    editingTaskId = item.id;
    render();
    byId('task-list').querySelector('[data-edit-task] [name="title"]')?.focus();
    return;
  }
  if (button.dataset.action === 'cancel-edit') { editingTaskId = ''; render(); return; }
  if (button.dataset.action === 'delete') { deleteWithUndo(data, item.legacyId?'help':'items', item.legacyId||item.id, { label: `deleted “${item.title.slice(0, 28)}”`, onChange: render }); return; }

  button.disabled=true;
  pending.add(item.id);
  try{
    if(['nudge','help'].includes(button.dataset.action)){
      const result=await data.notify(other,{title:button.dataset.action==='help'?`${personName(viewer)} could use a hand`:`A little nudge from ${personName(viewer)}`,body:item.title,url:`tasks.html#${item.legacyId?'ask-'+item.legacyId:'item-'+item.id}`,kind:'list-nudge'});
      if(!result.queued)throw Error('not queued');toast(`queued for ${personName(other)}`);return;
    }
    if(button.dataset.action==='toggle'){
      const finishing = !done;
      if(routine)await completeRoutine(data,item,viewer,finishing,day);
      else if(item.legacyId)await data.updateIn('help',item.legacyId,{state:finishing?'done':'open',closedAt:finishing?Date.now():0});
      else if(finishing&&item.recurrence&&item.recurrence!=='once'){
        const update=repeatCompletion(item,viewer);
        await data.updateIn('items',item.id,update);
        toast(`done · back on ${prettyDue(update.due)}`);
      }
      else await data.updateIn('items',item.id,{done:!item.done,doneBy:!item.done?viewer:'',doneAt:!item.done?Date.now():0});
      // Ticking off a whole shop used to send one ping per item. Groceries say
      // something once, when the list is empty; tasks still ping each time.
      if (finishing && item.type !== 'grocery') void data.notify(other, { title:`${personName(viewer)} finished something ✓`, body:item.title, url:item.legacyId?`tasks.html#ask-${item.legacyId}`:`tasks.html#done-${item.id}`, kind:'item-finished' });
      else if (finishing && groceryListFinished(items,item)) void data.notify(other, { title:`${personName(viewer)} got all the groceries 🛒`, body:'the grocery list is empty', url:'tasks.html#grocery', kind:'item-finished' });
    }
    // A repeat has no Done tab to undo from, so "undo" puts the old date back.
    if(button.dataset.action==='undo-roll')await data.updateIn('items',item.id,{due:item.previousDue||'',previousDue:'',lastDoneBy:'',lastDoneAt:0});
    if(button.dataset.action==='readd')await data.updateIn('items',item.id,{done:false,doneBy:'',doneAt:0});
  }catch(_){showFailure('the list edit did not stick.','check the internet and try the button again.');}
  finally{pending.delete(item.id);render();}
});

// On a phone: right finishes, left deletes with the same undo path as the ×.
// Vertical scrolling is left alone, and the visible buttons remain for mouse,
// keyboard and anyone who would rather tap.
let swipeStart = null;
byId('task-list').addEventListener('touchstart', event => {
  const row = event.target.closest('.task-row');
  if (!row || event.target.closest('input,select,textarea,form')) return;
  const touch = event.changedTouches[0];
  swipeStart = { row, x:touch.clientX, y:touch.clientY };
}, { passive:true });
byId('task-list').addEventListener('touchend', event => {
  if (!swipeStart) return;
  const { row, x, y } = swipeStart;
  swipeStart = null;
  if (!row.isConnected) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - x;
  const dy = touch.clientY - y;
  if (Math.abs(dx) < 78 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
  event.preventDefault();
  row.classList.add(dx > 0 ? 'swiped-done' : 'swiped-delete');
  window.setTimeout(() => row.classList.remove('swiped-done', 'swiped-delete'), 350);
  row.querySelector(dx > 0 ? '[data-action="toggle"]' : '[data-action="delete"]')?.click();
}, { passive:false });
byId('task-list').addEventListener('touchcancel', () => { swipeStart = null; });

byId('recent-grocery-chips').addEventListener('click', async event => {
  const button = event.target.closest('[data-recent-index]');
  if (!button) return;
  const grocery = recentGroceryOptions[Number(button.dataset.recentIndex)];
  if (!grocery) return;
  setButtonBusy(button, true, '…');
  try {
    await addTask(data, { viewer, other, title: grocery.title, type: 'grocery', aisle: grocery.aisle });
    toast('back on the grocery list 🛒');
  } catch (_) {
    showFailure('that did not get added.', 'check the internet and tap it again.');
  } finally { if (button.isConnected) setButtonBusy(button, false); }
});

byId('task-list').addEventListener('submit', async event => {
  const form = event.target.closest('[data-edit-task]');
  if (!form) return;
  event.preventDefault();
  const item = items.find(entry => entry.id === form.dataset.editTask);
  if (!item) return;
  const title = form.querySelector('[name="title"]').value.trim();
  if (!title) return;
  const save = form.querySelector('[type="submit"]');
  setButtonBusy(save, true, 'saving…');
  try {
    const due = item.type === 'grocery' ? (item.due || '') : form.querySelector('[name="due"]').value;
    const routine=isRoutine(item);
    const repeat = routine?'once':form.querySelector('[name="recurrence"]').value;
    const schedule=item.type==='grocery'?{}:readReminderFields(form);
    if(routine){schedule.routineDays=[...form.querySelectorAll('[name=routineDay]:checked')].map(i=>Number(i.value));if(!schedule.routineDays.length)throw Error('Pick a day');}
    await data.updateIn('items', item.id, {
      title,
      ...schedule,
      // A grocery has no day field in the form: keep the day its repeat runs on.
      due,
      recurrenceDay: recurrenceAnchor(due === (item.due || '') && repeat === item.recurrence ? item : { due }),
      aisle: item.type === 'grocery' ? form.querySelector('[name="aisle"]').value : '',
      recurrence: repeat
    });
    editingTaskId = '';
    render();
    toast('fixed it');
  } catch (_) { showFailure('that edit did not stick.', 'check the internet and try again.'); }
  finally { if (save.isConnected) setButtonBusy(save, false); }
});
byId('task-list').addEventListener('keydown', event => {
  if (event.key === 'Escape' && event.target.closest('[data-edit-task]')) { editingTaskId = ''; render(); }
});

function visibleItems() {
  const wantedType = tab === 'tasks' ? 'task' : tab;
  return allItems()
    .filter(item => !isPendingDelete(item.legacyId?'help':'items', item.legacyId||item.id))
    .filter(item => tab === 'routines'?isRoutine(item):!isRoutine(item)&&(tab === 'done' ? item.done : item.type === wantedType && !item.done))
    .sort((a, b) => {
      if(tab==='routines'){
        const rank=item=>routineDue(item)?(checkedToday(item,checks)?1:0):2;
        const order=rank(a)-rank(b);if(order)return order;
      }
      const dueOrder = (a.due || '9999').localeCompare(b.due || '9999');
      return dueOrder || (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function render() {
  const list = visibleItems();
  byId('item-count').textContent = tab === 'routines'?`${list.filter(i=>routineDue(i)&&!checkedToday(i,checks)).length} left today`:tab === 'done' ? `${list.length} done` : `${list.length} left`;
  byId('empty-state').hidden = list.length > 0;
  // "0 left" next to "Nothing here" said the same thing twice.
  byId('item-count').hidden = list.length === 0;

  const labels = {
    tasks: ['our things', 'To do', '✦', 'Nothing here', 'tap ＋ add to put something on it'],
    routines: ['', 'Our routine', '↻', 'A little rhythm', 'add something we do regularly'],
    grocery: ['to pick up', 'Groceries', '🛒', 'No groceries', 'tap ＋ add when something runs out'],
    done: ['finished', 'Done', '✨', 'Nothing done yet', '']
  }[tab];

  byId('list-kicker').textContent = labels[0];
  byId('list-title').textContent = labels[1];
  const empty = byId('empty-state');
  empty.querySelector('span').textContent = labels[2];
  empty.querySelector('strong').textContent = labels[3];
  const hint = empty.querySelector('p'); if (hint) { hint.textContent = labels[4]; hint.hidden = !labels[4]; }
  keepInlineEdits(byId('task-list'), () => { byId('task-list').innerHTML = tab==='grocery'?groceryMarkup(list):list.map(taskMarkup).join(''); });
  renderRecentGroceries();
}

function renderRecentGroceries() {
  const panel = byId('recent-groceries');
  recentGroceryOptions = [];
  if (tab !== 'grocery') { panel.hidden = true; return; }
  const active = new Set(items.filter(item => item.type === 'grocery' && !item.done)
    .map(item => item.title?.trim().toLocaleLowerCase()).filter(Boolean));
  const seen = new Set();
  for (const item of items.filter(item => item.type === 'grocery' && item.done)
    .sort((a, b) => (b.doneAt || b.createdAt || 0) - (a.doneAt || a.createdAt || 0))) {
    const key = item.title?.trim().toLocaleLowerCase();
    if (!key || seen.has(key) || active.has(key)) continue;
    seen.add(key);
    recentGroceryOptions.push({ title: item.title.trim(), aisle: item.aisle || 'other' });
    if (recentGroceryOptions.length === 12) break;
  }
  panel.hidden = recentGroceryOptions.length === 0;
  byId('recent-grocery-chips').innerHTML = recentGroceryOptions.map((item, index) =>
    `<button type="button" data-recent-index="${index}" aria-label="Add ${escapeHtml(item.title)} again">+ ${escapeHtml(item.title)}</button>`).join('');
}

function selectTab(next, updateHash = false) {
  const previous = tab;
  tab = ['tasks', 'grocery', 'routines', 'done'].includes(next) ? next : 'tasks';
  // A repeat picked on one tab must not follow you to the other and quietly
  // make the next grocery (or task) repeat.
  if (previous !== tab) {
    recurrence = 'once';
    document.querySelectorAll('.repeat-chip').forEach(item => item.classList.toggle('active', item.dataset.repeat === 'once'));
  }
  document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
  const routine = tab === 'routines';
  const grocery = tab === 'grocery';
  byId('recent-groceries').hidden = !grocery;
  byId('task-list-card').hidden = false;
  byId('routine-days').hidden = !routine;
  byId('task-reminders').hidden = grocery;
  byId('task-reminders').innerHTML=reminderFields({},routine);
  byId('task-prompt').textContent = grocery ? 'What should we grab?' : 'What needs doing?';
  byId('shared-task-title').placeholder = grocery ? 'oat milk, batteries, tiny treats…' : 'type it before it leaves your brain';
  byId('task-options').hidden = grocery || routine || tab === 'done';
  byId('grocery-aisle-wrap').hidden = !grocery;
  // Groceries have no day, only an aisle and a repeat.
  if (byId('task-more-summary')) byId('task-more-summary').textContent = routine?'⋯ reminders':grocery ? '⋯ aisle / repeat' : '⋯ when / repeat / reminders';
  byId('repeat-options').hidden = routine || tab === 'done';
  byId('page-add').hidden = tab === 'done';
  byId('page-add').dataset.openSheet = 'task-form';
  byId('page-add').textContent = routine?'＋ routine':grocery ? '＋ grocery' : '＋ add';
  byId('task-composer').querySelector('.compose-more').open = grocery;
  if (updateHash) history.replaceState(null, '', '#'+tab);
  render();
}

function taskMarkup(item) {
  const routine=isRoutine(item),scheduled=!routine||routineDue(item),day=listDay();
  if(routine)item={...item,done:checkedToday(item,checks),doneBy:checks.find(c=>c.id===checkId(item.id))?.by};
  const doneClass = item.done ? ' done' : '';
  const check = item.done ? '✓' : '';
  const due = item.due ? `<span>${escapeHtml(prettyDue(item.due))}</span>` : '';
  const addedBy = item.addedBy===other ? `<span>from ${escapeHtml(personName(other))}</span>` : '';
  const finished = item.doneBy===other ? `<span>done by ${escapeHtml(personName(other))}</span>` : '';
  const repeat=routine?`<span>${scheduled?'today · ':''}${dayLabel(item.routineDays)}</span>`:item.recurrence&&item.recurrence!=='once'?`<span>↻ ${escapeHtml(item.recurrence)}</span>`:'';
  const rolledBack=item.recurrence&&item.recurrence!=='once'&&item.lastDoneAt&&Date.now()-Number(item.lastDoneAt)<10*60000
    ?'<button class="readd-task" data-action="undo-roll" type="button">undo</button>':'';
  const aisle=item.type==='grocery'&&item.aisle&&tab!=='grocery'?`<span>${escapeHtml(item.aisle)}</span>`:'';
  const title = editingTaskId === item.id ? `<form class="inline-edit" data-edit-task="${escapeHtml(item.id)}">
    <input name="title" aria-label="Task title" maxlength="180" required value="${escapeHtml(item.title)}">
    ${item.type === 'grocery'
      ? `<label>aisle<select name="aisle">${['produce','fridge','pantry','frozen','home','other'].map(value => `<option value="${value}"${item.aisle === value ? ' selected' : ''}>${value === 'home' ? 'home stuff' : value}</option>`).join('')}</select></label>`
      : routine?`<fieldset><legend>Days</legend><div class="routine-days">${daysFields(item.routineDays)}</div></fieldset><input type="hidden" name="due" value="">`:`<label>day<input type="date" name="due" value="${escapeHtml(item.due || '')}"></label>`}${routine?'':`<label>repeat<select name="recurrence">${['once','daily','weekly','monthly'].map(value => `<option value="${value}"${(item.recurrence || 'once') === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>`}${item.type==='grocery'?'':reminderFields(item,true)}
    <div class="inline-edit-actions"><button type="submit">save</button><button type="button" data-action="cancel-edit">cancel</button></div>
  </form>` : item.legacyId?`<strong>${escapeHtml(item.title)}</strong>`:`<button class="task-title" data-action="edit" type="button" aria-label="Edit ${escapeHtml(item.title)}">${escapeHtml(item.title)}</button>`;
  return `<li class="task-row${doneClass}" data-id="${escapeHtml(item.id)}" data-day="${day}" ${item.legacyId?`data-legacy-id="${escapeHtml(item.legacyId)}"`:''}>
    <button class="task-check" data-action="toggle" ${!scheduled||pending.has(item.id)?'disabled':''} aria-label="Mark ${escapeHtml(item.title)} ${item.done ? 'not done' : 'done'}">${check}</button>
    <div>${title}${due||aisle||repeat||addedBy||finished?`<div class="task-meta">${due}${aisle}${repeat}${addedBy}${finished}</div>`:''}${item.done&&item.type==='grocery'?'<button class="readd-task" data-action="readd" type="button">put back</button>':''}${rolledBack}</div>
    <button class="delete-task" data-action="delete" aria-label="Delete ${escapeHtml(item.title)}">×</button>
    ${!item.done&&scheduled?`<div class="routine-actions"><button type="button" data-action="nudge" ${pending.has(item.id)?'disabled':''}>nudge</button><button type="button" data-action="help" ${pending.has(item.id)?'disabled':''}>need a hand?</button>${item.reminderTime?`<small>◷ ${escapeHtml(item.reminderTime)} ET</small>`:''}</div>`:''}
  </li>`;
}

function groceryMarkup(list){const groups=new Map();list.forEach(item=>{const aisle=item.aisle||'other';if(!groups.has(aisle))groups.set(aisle,[]);groups.get(aisle).push(item);});return [...groups].map(([aisle,entries])=>`<li class="aisle-label">${escapeHtml(aisle)}</li>${entries.map(taskMarkup).join('')}`).join('');}

window.addEventListener('littlelist:profile',render);
function tabFromHash() {
  if (location.hash === '#routines') return 'routines';
  if(location.hash.startsWith('#ask-'))return ['done','cant'].includes(legacy.find(i=>i.id===location.hash.slice(5))?.state)?'done':'tasks';
  if(location.hash==='#done')return 'done';
  if (location.hash === '#grocery') return 'grocery';
  const id = /^#(?:item|done)-([A-Za-z0-9_-]+)$/.exec(location.hash)?.[1];
  const item=items.find(item=>item.id===id);
  if(isRoutine(item))return 'routines';
  if(item?.done)return 'done';
  if(!item&&location.hash.startsWith('#done-'))return 'done';
  return item?.type === 'grocery' ? 'grocery' : 'tasks';
}
window.addEventListener('hashchange', () => selectTab(tabFromHash()));
selectTab(tabFromHash());
