import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, toast, dateKey, setButtonBusy, showFailure } from './ui-helpers.js';
import { personName } from './profile-store.js';

const byId = id => document.getElementById(id);
let items = [];
let tab = 'tasks';
let when = 'whenever';
let recurrence = 'once';

const data = await sharedLayer();
onAuthChange(user => setupAuthUI(data, user));
if (data.mode === 'local') setupAuthUI(data, { local: true });

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const viewer = await awaitViewer();
if (!viewer) { showNotAMember(); await new Promise(() => {}); }
const other = partnerOf(viewer);

applyViewerTheme(viewer);
document.querySelector('.back-to-side').href = `${viewer}.html`;

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
  button.addEventListener('click', () => {
    tab = button.dataset.tab;
    document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === button));
    const grocery = tab === 'grocery';
    byId('task-prompt').textContent = grocery ? 'What should we grab?' : 'What needs doing?';
    byId('shared-task-title').placeholder = grocery
      ? 'oat milk, batteries, tiny treats…'
      : 'type it before it leaves your brain';
    byId('task-options').hidden = grocery || tab === 'done';
    byId('grocery-aisle-wrap').hidden = !grocery;
    byId('repeat-options').hidden = tab === 'done';
    document.querySelector('.compact-composer').hidden = tab === 'done';
    render();
  });
});

byId('shared-task-form').addEventListener('submit', async event => {
  event.preventDefault();
  const submit=event.submitter||event.currentTarget.querySelector('[type="submit"]');
  const title = byId('shared-task-title').value.trim();
  if (!title) return;

  let due = '';
  const chosenDate = new Date();
  if (when === 'today') due = dateKey(chosenDate);
  if (when === 'tomorrow') {
    chosenDate.setDate(chosenDate.getDate() + 1);
    due = dateKey(chosenDate);
  }

  setButtonBusy(submit,true,'…');
  try{
    if(recurrence!=='once'&&!due)due=dateKey(new Date());
    await data.addTo('items',{title,type:tab==='grocery'?'grocery':'task',due,recurrence,aisle:tab==='grocery'?byId('grocery-aisle').value:'',addedBy:viewer,done:false,createdAt:Date.now()});
    const recipient=other;
    void data.notify(recipient,{title:tab==='grocery'?'grocery list update 🛒':'new thing on the list ✓',body:title,url:`tasks.html`,kind:'item'});
    event.target.reset();toast(tab==='grocery'?'on the grocery list 🛒':'added 🫡');
  }catch(_){showFailure('that did not get added.','check the internet, then try again. Your text is still here.');}
  finally{setButtonBusy(submit,false);}
});

byId('task-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const row = button.closest('[data-id]');
  const item = items.find(entry => entry.id === row?.dataset.id);
  if (!item) return;

  button.disabled=true;button.classList.add('is-busy');
  try{
    if(button.dataset.action==='toggle'){
      if(!item.done&&item.recurrence&&item.recurrence!=='once')await data.updateIn('items',item.id,{done:false,due:nextDue(item.due,item.recurrence),lastDoneBy:viewer,lastDoneAt:Date.now()});
      else await data.updateIn('items',item.id,{done:!item.done,doneBy:!item.done?viewer:'',doneAt:!item.done?Date.now():0});
    }
    if(button.dataset.action==='readd')await data.updateIn('items',item.id,{done:false,doneBy:'',doneAt:0});
    if(button.dataset.action==='delete')await data.removeFrom('items',item.id);
  }catch(_){showFailure('the list edit did not stick.','check the internet and try the button again.');button.disabled=false;button.classList.remove('is-busy');}
});

function visibleItems() {
  const wantedType = tab === 'tasks' ? 'task' : tab;
  return items
    .filter(item => tab === 'done' ? item.done : item.type === wantedType && !item.done)
    .sort((a, b) => {
      const dueOrder = (a.due || '9999').localeCompare(b.due || '9999');
      return dueOrder || (b.createdAt || 0) - (a.createdAt || 0);
    });
}

function render() {
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
  byId('task-list').innerHTML = tab==='grocery'?groceryMarkup(list):list.map(taskMarkup).join('');
}

function taskMarkup(item) {
  const doneClass = item.done ? ' done' : '';
  const check = item.done ? '✓' : '';
  const due = item.due ? prettyDue(item.due) : 'whenever';
  const addedBy = escapeHtml(personName(item.addedBy === 'her' ? 'her' : 'him'));
  const finished = item.doneBy ? `<span>done by ${escapeHtml(personName(item.doneBy))}</span>` : '';
  const repeat=item.recurrence&&item.recurrence!=='once'?`<span>↻ ${escapeHtml(item.recurrence)}</span>`:'';
  const aisle=item.type==='grocery'&&item.aisle?`<span>${escapeHtml(item.aisle)}</span>`:'';
  return `<li class="task-row${doneClass}" data-id="${escapeHtml(item.id)}">
    <button class="task-check" data-action="toggle" aria-label="Mark ${escapeHtml(item.title)} ${item.done ? 'not done' : 'done'}">${check}</button>
    <div><span class="task-title">${escapeHtml(item.title)}</span><div class="task-meta"><span>${due}</span>${aisle}${repeat}<span>added by ${addedBy}</span>${finished}</div>${item.done&&item.type==='grocery'?'<button class="readd-task" data-action="readd" type="button">put back</button>':''}</div>
    <button class="delete-task" data-action="delete" aria-label="Delete ${escapeHtml(item.title)}">×</button>
  </li>`;
}

function groceryMarkup(list){const groups=new Map();list.forEach(item=>{const aisle=item.aisle||'other';if(!groups.has(aisle))groups.set(aisle,[]);groups.get(aisle).push(item);});return [...groups].map(([aisle,entries])=>`<li class="aisle-label">${escapeHtml(aisle)}</li>${entries.map(taskMarkup).join('')}`).join('');}

window.addEventListener('littlelist:profile',render);

function prettyDue(value) {
  const today = dateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === today) return 'today-ish';
  if (value === dateKey(tomorrow)) return 'tomorrow';
  return value;
}
function nextDue(value,repeat){const next=value?new Date(`${value}T12:00:00`):new Date();if(Number.isNaN(next.getTime()))next.setTime(Date.now());if(repeat==='daily')next.setDate(next.getDate()+1);if(repeat==='weekly')next.setDate(next.getDate()+7);if(repeat==='monthly')next.setMonth(next.getMonth()+1);return dateKey(next);}
