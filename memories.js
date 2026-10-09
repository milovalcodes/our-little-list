import { activityClock, activityWindow } from './activity-clock.js';
import { promptFor } from './question-prompts.js';
import { escapeHtml, toast, setButtonBusy, showFailure } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import {crownMemories,memoryCategory,memoryDateLabel,sortMemories,validMemoryDate} from './memory-catalog.js';
import { deleteWithUndo, isPendingDelete } from './undo-delete.js';

const $ = id => document.getElementById(id);
let memories = [];
let weeks=[],category=location.hash==='#app-memories'?'app':'yours',routedHash='';
let pastQuestions=[];
const archivedAnswers=new Map();
const answerReads=new Set();
let archiveDay=activityClock().day;
let photo = null;
let photoPending = Promise.resolve();
let photoVersion = 0;
let featuredId = '';
let migrating = false;
const fullPhotos = new Map();
const loadingPhotos = new Set();

const { data, viewer, other } = await bootPage();
const resetMemoryDate=()=>{$('memory-date').value=activityClock().calendarDay;$('memory-date').max=activityClock().calendarDay;};
resetMemoryDate();
data.listenTo('wordWeeks',items=>{weeks=items;render();});
window.addEventListener('littlelist:profile',render);
document.querySelectorAll('[data-memory-category]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.memoryCategory;history.replaceState(null,'',location.pathname+location.search+(category==='app'?'#app-memories':'#your-memories'));featuredId='';document.body.classList.remove('memory-open');render();}));
addEventListener('hashchange',()=>{if(location.hash==='#app-memories')category='app';if(location.hash==='#your-memories')category='yours';render();});

data.listenTo('questions',items=>{pastQuestions=items;render();if(featuredId.startsWith('question-'))void loadArchivedAnswers(featuredId);});
setInterval(()=>{if(activityClock().day!==archiveDay){archiveDay=activityClock().day;render();}},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){archiveDay=activityClock().day;$('memory-date').max=activityClock().calendarDay;render();if(featuredId.startsWith('question-'))void loadArchivedAnswers(featuredId);}});
data.listenTo('memories', items => {
  memories = items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  render();
  void migrateOldPhotos();
});

$('memory-photo').addEventListener('change', event => {
  const version = ++photoVersion;
  const file = event.target.files?.[0];
  photo = null;
  $('photo-name').textContent = '';
  if (!file) { photoPending=Promise.resolve(); return; }
  $('photo-name').textContent = 'shrinking…';
  photoPending = makePhotoPair(file).then(result => {
    if (version !== photoVersion) return;
    photo = result;
    $('photo-name').textContent = file.name;
  }).catch(() => {
    if (version !== photoVersion) return;
    photo = null;
    event.target.value = '';
    $('photo-name').textContent = '';
    showFailure('that photo is too mighty.', 'try a smaller photo or a screenshot.');
  });
});

$('memory-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('memory-text').value.trim();
  const button = $('memory-save');
  if (button.disabled) return;
  const memoryDate=$('memory-date').value;
  if(!validMemoryDate(memoryDate)||memoryDate>activityClock().calendarDay){showFailure('that date needs a second look.', 'choose today or a date in the past.');return;}
  setButtonBusy(button, true, 'jarring…');
  $('memory-photo').disabled = true;
  await photoPending;
  try {
    const createdAt = Date.now();
    const saved = await data.addTo('memories', {
      text, memoryDate, thumb: photo?.thumb || '', hasPhoto: false, addedBy: viewer, createdAt
    });
    if (photo) {
      try {
        await data.setTo('memoryPhotos', saved.id, { photo: photo.full, addedBy: viewer, createdAt });
        await data.updateIn('memories', saved.id, { hasPhoto: true });
        fullPhotos.set(saved.id, photo.full);
      } catch (_) {
        showFailure('the words saved, but the photo did not.', 'check the internet, then add it again if you want the photo.');
      }
    }
    void data.notify(other, { title: `${personName(viewer)} added to the memory jar`, body: text.slice(0, 120), url: `memories.html#memory-${saved.id}`, kind: 'memory' });
    event.target.reset();
    resetMemoryDate();category='yours';history.replaceState(null,'',location.pathname+location.search+'#your-memories');render();
    photo = null;
    photoVersion++;
    photoPending = Promise.resolve();
    $('photo-name').textContent = '';
    toast('secured for the historians');
    document.querySelector('#sheet-memory-form [data-close-sheet]')?.click();
  } catch (_) {
    showFailure('the jar did not take it.', 'check the internet and try again.');
  } finally { setButtonBusy(button, false); $('memory-photo').disabled=false; }
});

$('memory-list').addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) {
    const id = deleteButton.dataset.delete;
    deleteWithUndo(data, 'memories', id, {
      label: 'memory deleted', onChange: render,
      onCommitted: () => data.removeFrom('memoryPhotos', id).catch(() => {
        showFailure('the memory is gone, but its photo may still be stored.', 'try again when the internet is back.');
      })
    });
    return;
  }
  const openButton = event.target.closest('[data-open]');
  if (openButton) feature(openButton.dataset.open);
});

$('memory-pick').addEventListener('click', () => {
  const visible = visibleMemories();
  if (visible.length) feature(visible[Math.floor(Math.random() * visible.length)].id);
});

function feature(id) {
  const item=allMemories().find(item=>item.id===id);if(item)category=memoryCategory(item);
  featuredId = id;
  render();
  document.body.classList.add('memory-open');
  if(id.startsWith('question-'))void loadArchivedAnswers(id);else void loadFullPhoto(id);
}
$('memory-random').addEventListener('click', event => {
  if(event.target.closest('[data-retry-answers]'))void loadArchivedAnswers(featuredId);
  if (event.target === event.currentTarget || event.target.closest('[data-close-memory]')) closeMemory();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && featuredId) closeMemory(); });
function closeMemory() { featuredId=''; document.body.classList.remove('memory-open'); render(); }

function allMemories() {
  const questions=pastQuestions.filter(q=>q.day<archiveDay&&(q.answers?.her?.at||q.answers?.him?.at)).map(q=>({
    ...q,id:'question-'+q.day,question:true,text:promptFor(q.day,q.promptId),createdAt:activityWindow(q.day).closesAt
  }));
  return sortMemories([...memories.filter(item=>!isPendingDelete('memories',item.id)),...questions,...crownMemories(weeks,personName)]);
}
function visibleMemories(){return allMemories().filter(item=>memoryCategory(item)===category);}

function render() {
  if(location.hash!==routedHash){const id=/^#memory-([A-Za-z0-9_-]+)$/.exec(location.hash)?.[1],item=id&&allMemories().find(m=>m.id===id);if(item){category=memoryCategory(item);routedHash=location.hash;}}
  document.querySelectorAll('[data-memory-category]').forEach(button=>{const active=button.dataset.memoryCategory===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  const visible = visibleMemories();
  $('memory-empty').querySelector('strong').textContent=category==='app'?'No app memories yet':'No memories here yet';
  $('memory-empty').hidden = visible.length > 0;
  $('memory-pick').hidden = visible.length === 0;
  $('memory-list').innerHTML = visible.map(item => memoryMarkup(item)).join('');
  const featured = featuredId && visible.find(item => item.id === featuredId);
  $('memory-random').hidden = !featured;
  $('memory-random').innerHTML = featured ? `<div class="memory-full"><button type="button" data-close-memory aria-label="Close memory">×</button>${memoryMarkup(featured, true)}</div>` : '';
  if (featuredId && !featured) { featuredId = ''; document.body.classList.remove('memory-open'); }
}

function memoryMarkup(item, featured = false) {
  if(item.question)return questionMemoryMarkup(item,featured);
  if(item.crown)return `<article class="memory-card crown-memory text-only${featured?' featured':''}" data-id="${escapeHtml(item.id)}">${featured?'':`<button class="memory-open" type="button" data-open="${escapeHtml(item.id)}" aria-label="Open crown memory">`}<div><span class="memory-crown" aria-hidden="true">♛</span><small>${escapeHtml(memoryDateLabel(item))}</small><p>${escapeHtml(item.text)}</p><small>☀ ${item.scores.her} · ☾ ${item.scores.him}</small>${featured?`<p><a href="activities.html#scoreboard-${item.week}">see the week →</a></p>`:''}</div>${featured?'':'</button>'}</article>`;
  const image = safePhoto(featured ? fullPhotos.get(item.id) || item.thumb || item.photo : item.thumb || item.photo);
  return `<article class="memory-card${featured ? ' featured' : ''}${image ? ' has-photo' : ' text-only'}" data-id="${escapeHtml(item.id)}">
    ${featured ? '' : `<button class="memory-open" type="button" data-open="${escapeHtml(item.id)}" aria-label="Open memory">`}
    ${image ? `<img src="${image}" alt="">` : ''}
    <div><p>${escapeHtml(item.text || '')}</p><small>${escapeHtml(memoryDateLabel(item))} · ${escapeHtml(personName(item.addedBy))}</small></div>
    ${featured ? '' : '</button>'}
    ${featured ? '' : `<button class="memory-delete" type="button" data-delete="${escapeHtml(item.id)}" aria-label="Delete memory">×</button>`}
  </article>`;
}

async function loadFullPhoto(id) {
  const item = memories.find(memory => memory.id === id);
  if (!item?.hasPhoto || fullPhotos.has(id) || loadingPhotos.has(id)) return;
  loadingPhotos.add(id);
  try {
    const record = await data.readDoc('memoryPhotos', id);
    const image = safePhoto(record?.photo);
    if (image) { fullPhotos.set(id, image); if (featuredId === id) render(); }
  } catch (_) { /* The thumbnail still works offline. */ }
  finally { loadingPhotos.delete(id); }
}

async function migrateOldPhotos() {
  if (migrating) return;
  migrating = true;
  try {
    for (const item of memories.filter(value => value.addedBy === viewer && safePhoto(value.photo))) {
      const existing = await data.readDoc('memoryPhotos', item.id);
      if (!existing) await data.setTo('memoryPhotos', item.id, { photo: item.photo, addedBy: viewer, createdAt: item.createdAt });
      const thumb = await thumbnailFromData(item.photo);
      await data.updateIn('memories', item.id, { photo: '', thumb, hasPhoto: true });
    }
  } catch (_) { /* Keep the old photo until this phone can finish moving it. */ }
  finally { migrating = false; }
}

function safePhoto(value) { return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value || '') ? value : ''; }

async function makePhotoPair(file) {
  if (!file.type.startsWith('image/')) throw new Error('not an image');
  const bitmap = await loadPhoto(file);
  try { return { full: jpeg(bitmap, 1200, 620000, .78), thumb: jpeg(bitmap, 240, 30000, .6) }; }
  finally { bitmap.close?.(); }
}

async function thumbnailFromData(dataUrl) {
  const image = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image failed'));
    image.src = dataUrl;
  });
  return jpeg(image, 240, 30000, .6);
}

function jpeg(image, maxDimension, maxLength, startQuality) {
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = startQuality;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > maxLength && quality > .3) {
    quality -= .08;
    result = canvas.toDataURL('image/jpeg', quality);
  }
  if (result.length > maxLength) throw new Error('too large');
  return result;
}

async function loadPhoto(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image failed')); };
    image.src = url;
  });
}

window.addEventListener('littlelist:profile', render);

function questionMemoryMarkup(item,featured){
  const both=Boolean(item.answers?.her?.at&&item.answers?.him?.at);
  const cached=archivedAnswers.get(item.day)||{};
  const label=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(item.day+'T12:00:00Z'));
  const content=featured?['her','him'].map(person=>{
    if(!item.answers?.[person]?.at)return '<p class="question-waiting">'+escapeHtml(personName(person))+' didn’t answer this one.</p>';
    if(person!==viewer&&!both)return '<p class="question-waiting">Their answer is still sealed.</p>';
    const answer=cached[person];
    return answer&&Number(answer.at)===Number(item.answers[person].at)?'<div class="question-answer"><small>'+escapeHtml(person===viewer?'you':personName(person))+'</small><p>'+escapeHtml(answer.text)+'</p></div>':'<p role="status">opening the answer…</p>';
  }).join('')+(cached.failed?'<button type="button" data-retry-answers>couldn’t load · retry</button>':''):'';
  return '<article class="memory-card question-memory text-only'+(featured?' featured':'')+'" data-id="'+item.id+'">'+(featured?'':'<button class="memory-open" type="button" data-open="'+item.id+'" aria-label="Open question memory">')+'<div><span aria-hidden="true">☀︎ ☾</span><small>our question · '+label+'</small><p>'+escapeHtml(item.text||'Our question')+'</p>'+(featured?content:'<small>'+(both?'two answers, kept here ♡':'an answer, kept safe')+'</small>')+'</div>'+(featured?'':'</button>')+'</article>';
}
async function loadArchivedAnswers(id){
  const item=visibleMemories().find(q=>q.id===id&&q.question);
  if(!item||answerReads.has(id))return;
  answerReads.add(id);
  const next={...(archivedAnswers.get(item.day)||{}),failed:false};
  const both=Boolean(item.answers?.her?.at&&item.answers?.him?.at);
  // Never request a partner answer before both markers exist. The database
  // enforces the same boundary; archiving does not copy it into shared data.
  for(const person of ['her','him']){
    if(!item.answers?.[person]?.at||(person!==viewer&&!both))continue;
    if(Number(next[person]?.at)===Number(item.answers[person].at))continue;
    try{
      const answer=await data.readDoc('questionAnswers',item.day+'-'+person);
      if(answer&&Number(answer.at)===Number(item.answers[person].at))next[person]=answer;else next.failed=true;
    }catch(_){next.failed=true;}
  }
  archivedAnswers.set(item.day,next);answerReads.delete(id);
  if(featuredId===id)render();
}
