import { escapeHtml, setButtonBusy, settleQuickly, showFailure, toast, keepInlineEdits } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import { addDateIdea, addTask } from './records.js';
import { deleteWithUndo, isPendingDelete } from './undo-delete.js';

const $=id=>document.getElementById(id);let ideas=[];let vibe='go out';let viewLimit=8;let editingDateId='';

const { data, viewer, other } = await bootPage();
document.querySelector('.date-list-card').after(document.querySelector('.date-roulette'));
const rouletteFiltersNode=document.querySelector('.roulette-filters');rouletteFiltersNode.hidden=true;
document.querySelector('.roulette-head').insertAdjacentHTML('beforeend','<button id="date-filter-toggle" type="button" aria-expanded="false">filters</button>');
document.getElementById('date-filter-toggle').addEventListener('click',event=>{rouletteFiltersNode.hidden=!rouletteFiltersNode.hidden;event.currentTarget.setAttribute('aria-expanded',String(!rouletteFiltersNode.hidden));});
document.getElementById('random-date').hidden=true;

data.listenTo('dates',items=>{
  const flag=value=>value?1:0;
  ideas=items.sort((a,b)=>(flag(a.done)-flag(b.done))||(flag(b.favorite)-flag(a.favorite))||((b.createdAt||0)-(a.createdAt||0)));
  render();
});

document.querySelectorAll('.date-vibe').forEach(button=>button.addEventListener('click',()=>{vibe=button.dataset.vibe;document.querySelectorAll('.date-vibe').forEach(item=>item.classList.toggle('active',item===button));}));
$('date-form').addEventListener('submit',async event=>{event.preventDefault();const title=$('date-title').value.trim();const note=$('date-note').value.trim();const button=$('date-submit');const details={cost:$('date-cost').value,energy:$('date-energy').value,weather:$('date-weather').value,distance:$('date-distance').value,duration:$('date-duration').value};setButtonBusy(button,true,'saving…');try{await addDateIdea(data,{viewer,other,title,note,vibe,details});event.target.reset();$('date-more-details').open=false;$('sheet-date-form')?.querySelector('[data-close-sheet]')?.click();toast('saved for later ✦');}catch(_){showFailure('the idea escaped.','check the internet and save it again.');}finally{setButtonBusy(button,false);}});
const rouletteFilters={vibe:'any',cost:'any'};
let chosenDateIdea = null;
document.querySelector('.roulette-filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter-vibe],[data-filter-cost]');if(!button)return;const key=button.hasAttribute('data-filter-vibe')?'vibe':'cost';rouletteFilters[key]=button.dataset[`filter${key[0].toUpperCase()}${key.slice(1)}`];button.parentElement.querySelectorAll('button').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});});
$('pick-random').addEventListener('click',event=>{$('random-date').hidden=false;const chosen=Object.entries(rouletteFilters).filter(([,value])=>value!=='any');
// Old imported dates have a vibe but no budget. Prefer exact matches; let an
// untagged budget act as a fallback rather than making those ideas disappear.
const compatible=ideas.filter(idea=>!idea.done&&chosen.every(([key,value])=>!idea[key]||idea[key]===value));
const exact=compatible.filter(idea=>chosen.every(([key])=>Boolean(idea[key])));
const available=exact.length?exact:compatible;
if(!available.length){$('random-date').textContent='nothing matches that exact mood.';$('date-plan').hidden=true;chosenDateIdea=null;return;}event.currentTarget.classList.remove('is-picking');void event.currentTarget.offsetWidth;event.currentTarget.classList.add('is-picking');const idea=available[Math.floor(Math.random()*available.length)];chosenDateIdea=idea;$('random-date').innerHTML=`<strong>${escapeHtml(idea.title)}</strong>${idea.note?`<span>${escapeHtml(idea.note)}</span>`:''}`;$('date-plan').hidden=false;});
$('date-plan').addEventListener('submit', async event => {
  event.preventDefault();
  if (!chosenDateIdea) return;
  const due = $('date-plan-day').value;
  if (!due) return;
  const button = event.currentTarget.querySelector('[type="submit"]');
  setButtonBusy(button, true, 'adding…');
  try {
    await settleQuickly(addTask(data, { viewer, other, title:`date: ${chosenDateIdea.title}`, due }), 'that plan did not save.');
    toast('on the list ✓');
    $('date-plan').hidden = true;
  } catch (_) { showFailure('that plan did not save.', 'check the internet and try again.'); }
  finally { setButtonBusy(button, false); }
});
$('date-more').addEventListener('click',()=>{viewLimit+=8;render();});
// A date you did goes in the memory jar, so there is one place to look back on
// things you did together instead of a done pile here and a jar over there.
// Undoing it takes that memory back out.
async function toggleDone(idea){
  if(idea.done){
    await data.updateIn('dates',idea.id,{done:false,doneAt:0,memoryId:''});
    if(idea.memoryId)await data.removeFrom('memories',idea.memoryId).catch(()=>{});
    toast('back in the pile');return;
  }
  const memory=await data.addTo('memories',{text:`✦ we did: ${idea.title}`,thumb:'',hasPhoto:false,addedBy:viewer,dateId:idea.id,createdAt:Date.now()});
  await data.updateIn('dates',idea.id,{done:true,doneAt:Date.now(),memoryId:memory?.id||''});
  toast('date completed. it is in the memory jar ◒');
}
$('date-list').addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button)return;const idea=ideas.find(item=>item.id===button.closest('[data-id]')?.dataset.id);if(!idea)return;
  if(button.dataset.action==='edit'){editingDateId=idea.id;render();$('date-list').querySelector('[data-edit-date] [name="title"]')?.focus();return;}
  if(button.dataset.action==='more'){const menu=button.parentElement.querySelector('.date-menu');menu.hidden=!menu.hidden;return;}
  if(button.dataset.action==='cancel-edit'){editingDateId='';render();return;}
  if(button.dataset.action==='delete'){deleteWithUndo(data,'dates',idea.id,{label:`deleted “${String(idea.title||'').slice(0,28)}”`,onChange:render});return;}
  button.disabled=true;try{if(button.dataset.action==='favorite')await data.updateIn('dates',idea.id,{favorite:!idea.favorite});else if(button.dataset.action==='complete'){await toggleDone(idea);}}catch(_){showFailure('that edit did not stick.','check the internet and tap it again.');button.disabled=false;}
});
$('date-list').addEventListener('submit',async event=>{
  const form=event.target.closest('[data-edit-date]');if(!form)return;event.preventDefault();
  const title=form.querySelector('[name="title"]').value.trim();if(!title)return;
  const button=form.querySelector('[type="submit"]');setButtonBusy(button,true,'saving…');
  try{await data.updateIn('dates',form.dataset.editDate,{title,note:form.querySelector('[name="note"]').value.trim(),vibe:form.querySelector('[name="vibe"]').value});editingDateId='';render();toast('fixed it');}
  catch(_){showFailure('that edit did not stick.','check the internet and try again.');}
  finally{if(button.isConnected)setButtonBusy(button,false);}
});
$('date-list').addEventListener('keydown',event=>{if(event.key==='Escape'&&event.target.closest('[data-edit-date]')){editingDateId='';render();}});

function allIdeas(){return ideas.filter(idea=>!isPendingDelete('dates',idea.id));}
function render(){
  const ideas=allIdeas();
  const finished=ideas.filter(idea=>idea.done).length;const left=ideas.length-finished;
  $('date-count').textContent=finished?`${left} left · ${finished} done`:`${ideas.length} saved`;
  $('date-empty').hidden=ideas.length>0;
  document.querySelector('.date-roulette').hidden=left===0;
  const linked=/^#date-([A-Za-z0-9_-]+)$/.exec(location.hash)?.[1];
  if(linked){const index=ideas.findIndex(idea=>idea.id===linked);if(index>=0)viewLimit=Math.max(viewLimit,index+1);}
  const visible=ideas.slice(0,viewLimit);
  keepInlineEdits($('date-list'),()=>{$('date-list').innerHTML=visible.map(dateCardMarkup).join('');});
  $('date-more').hidden=visible.length>=ideas.length;
  $('date-more').textContent=`show ${Math.min(8,ideas.length-visible.length)} more`;
}
window.addEventListener('hashchange',render);
function dateCardMarkup(idea){
  const editing=editingDateId===idea.id;
  const title=editing?`<form class="inline-edit" data-edit-date="${escapeHtml(idea.id)}">
    <input name="title" aria-label="Date idea title" maxlength="180" required value="${escapeHtml(idea.title)}">
    <textarea name="note" aria-label="Extra detail" maxlength="500" placeholder="extra detail, if any">${escapeHtml(idea.note||'')}</textarea>
    <select name="vibe" aria-label="Vibe">${['go out','stay in','food','little trip'].map(value=>`<option value="${value}"${idea.vibe===value?' selected':''}>${value}</option>`).join('')}</select>
    <div class="inline-edit-actions"><button type="submit">save</button><button type="button" data-action="cancel-edit">cancel</button></div>
  </form>`:`<h3><button class="date-title-button" type="button" data-action="edit" aria-label="Edit ${escapeHtml(idea.title)}">${escapeHtml(idea.title)}</button></h3>`;
  return `<article class="date-idea-card${idea.favorite?' favorite':''}${idea.done?' done':''}" data-id="${escapeHtml(idea.id)}"><div class="date-idea-top"><span>${escapeHtml(idea.vibe||'idea')}</span><div class="date-actions"><button data-action="favorite" aria-label="${idea.favorite?'Unfavorite':'Favorite'}">${idea.favorite?'★':'☆'}</button><button data-action="more" aria-label="More options">⋯</button><div class="date-menu" hidden><button data-action="delete" type="button">delete idea</button></div></div></div>${title}${!editing&&idea.note?`<p>${escapeHtml(idea.note)}</p>`:''}<div class="date-tags">${[idea.cost,idea.energy,idea.weather,idea.distance,idea.duration].filter(Boolean).map(value=>`<span>${escapeHtml(value)}</span>`).join('')}</div><div class="date-idea-foot">${idea.addedBy===other?`<small>from ${escapeHtml(personName(other))}</small>`:''}<button class="date-done-toggle" data-action="complete" type="button">${idea.done?'undo':'did it ✓'}</button></div>${idea.done?'<span class="date-complete-badge">we did this</span>':''}</article>`;
}
window.addEventListener('littlelist:profile',render);
