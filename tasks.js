import { escapeHtml, toast, dateKey, setButtonBusy, showFailure, keepInlineEdits } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import { initHelpPanel } from './help-panel.js';
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

const { data, viewer, other } = await bootPage();
initHelpPanel({ data, viewer, other, openGroceries: () => { selectTab('grocery', true); byId('page-add').click(); byId('shared-task-title').focus(); } });

data.listenTo('items', nextItems => {
  items = nextItems;
  render();
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
  const repeat = recurrence;

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
    if(repeat!=='once'&&!due)due=dateKey(new Date());
    await addTask(data,{viewer,other,title,type:grocery?'grocery':'task',due,recurrence:repeat,aisle:grocery?byId('grocery-aisle').value:''});
    event.target.reset();toast(tab==='grocery'?'on the grocery list 🛒':'added 🫡');
    byId('task-composer').querySelector('[data-close-sheet]')?.click();
  }catch(_){showFailure('that did not get added.','check the internet, then try again. Your text is still here.');}
  finally{setButtonBusy(submit,false);}
});

byId('task-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const row = button.closest('[data-id]');
  const item = items.find(entry => entry.id === row?.dataset.id);
  if (!item) return;
  if (button.dataset.action === 'edit') {
    editingTaskId = item.id;
    render();
    byId('task-list').querySelector('[data-edit-task] [name="title"]')?.focus();
    return;
  }
  if (button.dataset.action === 'cancel-edit') { editingTaskId = ''; render(); return; }
  if (button.dataset.action === 'delete') { deleteWithUndo(data, 'items', item.id, { label: `deleted “${item.title.slice(0, 28)}”`, onChange: render }); return; }

  button.disabled=true;button.classList.add('is-busy');
  try{
    if(button.dataset.action==='toggle'){
      const finishing = !item.done;
      if(finishing&&item.recurrence&&item.recurrence!=='once'){
        const rolled=nextDue(item.due,item.recurrence);
        await data.updateIn('items',item.id,{done:false,due:rolled,previousDue:item.due||'',lastDoneBy:viewer,lastDoneAt:Date.now()});
        toast(`done · back on ${prettyDue(rolled)}`);
      }
      else await data.updateIn('items',item.id,{done:!item.done,doneBy:!item.done?viewer:'',doneAt:!item.done?Date.now():0});
      // Ticking off a whole shop used to send one ping per item. Groceries say
      // something once, when the list is empty; tasks still ping each time.
      const groceriesLeft = item.type === 'grocery' ? items.filter(entry => entry.type === 'grocery' && !entry.done && entry.id !== item.id && (!entry.recurrence || entry.recurrence === 'once')).length : 0;
      if (finishing && item.type !== 'grocery') void data.notify(other, { title:`${personName(viewer)} finished something ✓`, body:item.title, url:`tasks.html#done-${item.id}`, kind:'item-finished' });
      else if (finishing && groceriesLeft === 0) void data.notify(other, { title:`${personName(viewer)} got all the groceries 🛒`, body:'the grocery list is empty', url:'tasks.html#grocery', kind:'item-finished' });
    }
    // A repeat has no Done tab to undo from, so "undo" puts the old date back.
    if(button.dataset.action==='undo-roll')await data.updateIn('items',item.id,{due:item.previousDue||'',previousDue:'',lastDoneBy:'',lastDoneAt:0});
    if(button.dataset.action==='readd')await data.updateIn('items',item.id,{done:false,doneBy:'',doneAt:0});
  }catch(_){showFailure('the list edit did not stick.','check the internet and try the button again.');button.disabled=false;button.classList.remove('is-busy');}
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
    await data.updateIn('items', item.id, {
      title,
      // A grocery has no day field in the form: keep the day its repeat runs on.
      due: item.type === 'grocery' ? (item.due || '') : form.querySelector('[name="due"]').value,
      aisle: item.type === 'grocery' ? form.querySelector('[name="aisle"]').value : '',
      recurrence: form.querySelector('[name="recurrence"]').value
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
  if (tab === 'asks') return [];
  const wantedType = tab === 'tasks' ? 'task' : tab;
  return items
    .filter(item => !isPendingDelete('items', item.id))
    .filter(item => tab === 'done' ? item.done : item.type === wantedType && !item.done)
    .sort((a, b) => {
      const dueOrder = (a.due || '9999').localeCompare(b.due || '9999');
      return dueOrder || (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function render() {
  if (tab === 'asks') return;
  const list = visibleItems();
  byId('item-count').textContent = tab === 'done' ? `${list.length} done` : `${list.length} left`;
  byId('empty-state').hidden = list.length > 0;

  const labels = {
    tasks: ['our things', 'To do', '✦', 'Nothing here'],
    grocery: ['to pick up', 'Groceries', '🛒', 'No groceries'],
    done: ['finished', 'Done', '✨', 'Nothing done yet']
  }[tab];

  byId('list-kicker').textContent = labels[0];
  byId('list-title').textContent = labels[1];
  const empty = byId('empty-state');
  empty.querySelector('span').textContent = labels[2];
  empty.querySelector('strong').textContent = labels[3];
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
  tab = ['tasks', 'grocery', 'asks', 'done'].includes(next) ? next : 'tasks';
  // A repeat picked on one tab must not follow you to the other and quietly
  // make the next grocery (or task) repeat.
  if (previous !== tab) {
    recurrence = 'once';
    document.querySelectorAll('.repeat-chip').forEach(item => item.classList.toggle('active', item.dataset.repeat === 'once'));
  }
  document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
  const asks = tab === 'asks';
  const grocery = tab === 'grocery';
  byId('recent-groceries').hidden = !grocery;
  byId('task-list-card').hidden = asks;
  byId('asks-workspace').hidden = !asks;
  byId('task-prompt').textContent = grocery ? 'What should we grab?' : 'What needs doing?';
  byId('shared-task-title').placeholder = grocery ? 'oat milk, batteries, tiny treats…' : 'type it before it leaves your brain';
  byId('task-options').hidden = grocery || tab === 'done';
  byId('grocery-aisle-wrap').hidden = !grocery;
  byId('repeat-options').hidden = tab === 'done';
  byId('page-add').hidden = tab === 'done';
  byId('page-add').dataset.openSheet = asks ? 'ask-form' : 'task-form';
  byId('page-add').textContent = asks ? '＋ ask' : grocery ? '＋ grocery' : '＋ add';
  byId('task-composer').querySelector('.compose-more').open = grocery;
  if (updateHash) history.replaceState(null, '', asks ? '#asks' : location.pathname + location.search);
  if (!asks) render();
}

function taskMarkup(item) {
  const doneClass = item.done ? ' done' : '';
  const check = item.done ? '✓' : '';
  const due = item.due ? prettyDue(item.due) : 'whenever';
  const addedBy = escapeHtml(personName(item.addedBy === 'her' ? 'her' : 'him'));
  const finished = item.doneBy ? `<span>done by ${escapeHtml(personName(item.doneBy))}</span>` : '';
  const repeat=item.recurrence&&item.recurrence!=='once'?`<span>↻ ${escapeHtml(item.recurrence)}</span>`:'';
  const rolledBack=item.recurrence&&item.recurrence!=='once'&&item.lastDoneAt&&Date.now()-Number(item.lastDoneAt)<10*60000
    ?'<button class="readd-task" data-action="undo-roll" type="button">undo</button>':'';
  const aisle=item.type==='grocery'&&item.aisle?`<span>${escapeHtml(item.aisle)}</span>`:'';
  const title = editingTaskId === item.id ? `<form class="inline-edit" data-edit-task="${escapeHtml(item.id)}">
    <input name="title" aria-label="Task title" maxlength="180" required value="${escapeHtml(item.title)}">
    ${item.type === 'grocery'
      ? `<label>aisle<select name="aisle">${['produce','fridge','pantry','frozen','home','other'].map(value => `<option value="${value}"${item.aisle === value ? ' selected' : ''}>${value === 'home' ? 'home stuff' : value}</option>`).join('')}</select></label>`
      : `<label>day<input type="date" name="due" value="${escapeHtml(item.due || '')}"></label>`}<label>repeat<select name="recurrence">${['once','daily','weekly','monthly'].map(value => `<option value="${value}"${(item.recurrence || 'once') === value ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
    <div class="inline-edit-actions"><button type="submit">save</button><button type="button" data-action="cancel-edit">cancel</button></div>
  </form>` : `<button class="task-title" data-action="edit" type="button" aria-label="Edit ${escapeHtml(item.title)}">${escapeHtml(item.title)}</button>`;
  return `<li class="task-row${doneClass}" data-id="${escapeHtml(item.id)}">
    <button class="task-check" data-action="toggle" aria-label="Mark ${escapeHtml(item.title)} ${item.done ? 'not done' : 'done'}">${check}</button>
    <div>${title}<div class="task-meta"><span>${escapeHtml(due)}</span>${aisle}${repeat}<span>added by ${addedBy}</span>${finished}</div>${item.done&&item.type==='grocery'?'<button class="readd-task" data-action="readd" type="button">put back</button>':''}${rolledBack}</div>
    <button class="delete-task" data-action="delete" aria-label="Delete ${escapeHtml(item.title)}">×</button>
  </li>`;
}

function groceryMarkup(list){const groups=new Map();list.forEach(item=>{const aisle=item.aisle||'other';if(!groups.has(aisle))groups.set(aisle,[]);groups.get(aisle).push(item);});return [...groups].map(([aisle,entries])=>`<li class="aisle-label">${escapeHtml(aisle)}</li>${entries.map(taskMarkup).join('')}`).join('');}

window.addEventListener('littlelist:profile',render);
const tabFromHash = () => location.hash === '#asks' || location.hash.startsWith('#ask-') ? 'asks' : location.hash === '#grocery' ? 'grocery' : location.hash.startsWith('#done-') ? 'done' : 'tasks';
window.addEventListener('hashchange', () => selectTab(tabFromHash()));
selectTab(tabFromHash());

function nextDue(value,repeat){
  const today=new Date();today.setHours(12,0,0,0);
  let next=value?new Date(`${value}T12:00:00`):new Date(today);
  if(Number.isNaN(next.getTime()))next=new Date(today);
  // A daily chore last ticked three days ago should come back tomorrow, not
  // three days ago plus one. Step until it is genuinely in the future.
  // Monthly keeps the day the user originally picked. Without an anchor, one
  // pass through February would permanently drag a "31st" chore to the 28th.
  const anchorDay=next.getDate();
  const step=()=>{
    if(repeat==='daily')next.setDate(next.getDate()+1);
    else if(repeat==='weekly')next.setDate(next.getDate()+7);
    else if(repeat==='monthly')addMonth(next,anchorDay);
  };
  if(repeat!=='daily'&&repeat!=='weekly'&&repeat!=='monthly')return dateKey(next);
  let guard=0;
  do{ step(); guard+=1; }while(next<=today&&guard<4000);
  // Years of neglect should still produce a usable date rather than today's.
  if(next<=today){ next=new Date(today); step(); }
  return dateKey(next);
}
// setMonth overflows: the 31st of January becomes the 3rd of March. Clamp to the
// last day of the month the user actually meant.
function addMonth(date,anchorDay){
  date.setDate(1);
  date.setMonth(date.getMonth()+1);
  const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
  date.setDate(Math.min(anchorDay,lastDay));
}
