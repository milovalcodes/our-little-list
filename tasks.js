import { createDataLayer } from './firebase-data.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, toast, dateKey } from './ui-helpers.js';

const params = new URLSearchParams(window.location.search);
const viewer = params.get('as') === 'him' ? 'him' : 'her';
const byId = id => document.getElementById(id);
let items = [];
let tab = 'tasks';
let when = 'whenever';
let data;

applyViewerTheme(viewer);
document.querySelector('.back-to-side').href = `${viewer}.html`;

data = await createDataLayer({
  collectionName: 'items',
  onItems(nextItems) {
    items = nextItems;
    render();
  },
  onAuth(user) {
    setupAuthUI(data, user);
  }
});

if (data.mode === 'local') setupAuthUI(data, { local: true });

document.querySelectorAll('.soft-chip').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.soft-chip').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    when = button.dataset.when;
  });
});

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
    document.querySelector('.compact-composer').hidden = tab === 'done';
    render();
  });
});

byId('shared-task-form').addEventListener('submit', async event => {
  event.preventDefault();
  const title = byId('shared-task-title').value.trim();
  if (!title) return;

  let due = '';
  const chosenDate = new Date();
  if (when === 'today') due = dateKey(chosenDate);
  if (when === 'tomorrow') {
    chosenDate.setDate(chosenDate.getDate() + 1);
    due = dateKey(chosenDate);
  }

  await data.add({
    title,
    type: tab === 'grocery' ? 'grocery' : 'task',
    due,
    addedBy: viewer,
    done: false,
    createdAt: Date.now()
  });
  const recipient = viewer === 'her' ? 'him' : 'her';
  void data.push(recipient,{
    title:tab==='grocery'?'grocery list update 🛒':'new thing on the list ✓',
    body:title,
    sound:'twinkle.wav',
    channelId:'our-twinkles',
    priority:'high',
    data:{kind:'item',title,from:viewer,url:'tasks'}
  }).catch(()=>{});
  event.target.reset();
  toast(tab === 'grocery' ? 'on the grocery list 🛒' : 'added 🫡');
});

byId('task-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const row = button.closest('[data-id]');
  const item = items.find(entry => entry.id === row?.dataset.id);
  if (!item) return;

  if (button.dataset.action === 'toggle') {
    await data.update(item.id, { done: !item.done, doneBy: !item.done ? viewer : '' });
  }
  if (button.dataset.action === 'delete') await data.remove(item.id);
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
    tasks: ['the stuff', 'To do', '✦', 'Nothing here', 'suspicious.'],
    grocery: ['food, probably', 'Groceries', '🛒', 'No groceries', 'we will remember eventually.'],
    done: ['the evidence', 'Done', '✨', 'Nothing done yet', 'okay then.']
  }[tab];

  byId('list-kicker').textContent = labels[0];
  byId('list-title').textContent = labels[1];
  const empty = byId('empty-state');
  empty.querySelector('span').textContent = labels[2];
  empty.querySelector('strong').textContent = labels[3];
  empty.querySelector('p').textContent = labels[4];
  byId('task-list').innerHTML = list.map(taskMarkup).join('');
}

function taskMarkup(item) {
  const doneClass = item.done ? ' done' : '';
  const check = item.done ? '✓' : '';
  const due = item.due ? prettyDue(item.due) : 'whenever';
  const addedBy = item.addedBy === 'her' ? 'her' : 'him';
  const finished = item.doneBy ? `<span>done by ${escapeHtml(item.doneBy)}</span>` : '';
  return `<li class="task-row${doneClass}" data-id="${escapeHtml(item.id)}">
    <button class="task-check" data-action="toggle" aria-label="Mark ${escapeHtml(item.title)} ${item.done ? 'not done' : 'done'}">${check}</button>
    <div><span class="task-title">${escapeHtml(item.title)}</span><div class="task-meta"><span>${due}</span><span>added by ${addedBy}</span>${finished}</div></div>
    <button class="delete-task" data-action="delete" aria-label="Delete ${escapeHtml(item.title)}">×</button>
  </li>`;
}

function prettyDue(value) {
  const today = dateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === today) return 'today-ish';
  if (value === dateKey(tomorrow)) return 'tomorrow';
  return value;
}

