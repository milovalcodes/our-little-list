import { escapeHtml, setButtonBusy, settleQuickly, showFailure, toast } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import { openEmojiPicker } from './emoji-picker.js';
import { hereLine, STATE_LABELS, focusActive, arrivalActive, statusShows } from './availability.js';
import { quickStatusButtons, saveQuickStatus } from './status-presets.js';
import { startTrip, tripActive } from './trip.js';
import { profileRoute, profileUrl } from './profile-route.js';
import { timeAgo } from './time-format.js';

const $=id=>document.getElementById(id);
const stateLabels=STATE_LABELS;
let statuses=[];let reactions=[];let presence=[];let state='online';let emoji='🎧';
// Every write here is a merge onto the existing status doc, and several of them
// fill in "keep what is already there" values. Before the first snapshot lands
// that list is empty, so "keep" silently meant "erase" — tapping an arrival
// preset on a freshly opened page wiped the status you had set. Nothing writes
// until we have actually seen the stored document.
let loaded=false;let settleLoaded;const firstSnapshot=new Promise(resolve=>{settleLoaded=resolve;});
// ...but a phone with no signal never gets that snapshot, and a button that
// waits forever is worse than one that says it could not reach anything.
async function ready(){
  if(loaded)return true;
  await Promise.race([firstSnapshot,new Promise(resolve=>window.setTimeout(resolve,6000))]);
  if(!loaded)showFailure('we could not reach your status yet.','check the internet, then try again — nothing was changed.');
  return loaded;
}
// The expiry select cannot be restored from a stored timestamp, so an untouched
// one must not be written at all — otherwise saving a typo into your status
// quietly removed the "in 4 hours" you set earlier.
let expiryTouched=false;
let editorDirty=false;

const { data, viewer, other } = await bootPage();
let selected = profileRoute(location.hash, viewer).person;
let profileNotes = [];
const editor = document.querySelector('.status-editor-disclosure');
$('profile-editor-slot').append(editor);
function openStatusEditor(){if(selected!==viewer)return;if(!editorDirty){delete $('status-form').dataset.hydrated;hydrateEditor();}editor.open=true;editor.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
$('status-form').addEventListener('input',()=>{editorDirty=true;});
$('status-form').addEventListener('change',()=>{editorDirty=true;});
$('status-pair').addEventListener('click',event=>{if(event.target.closest('.is-me')&&!event.target.closest('button'))openStatusEditor();});
$('status-pair').addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.classList.contains('is-me')){event.preventDefault();openStatusEditor();}});
document.getElementById('expand-map')?.addEventListener('click', event => {
  const card = document.querySelector('.now-location-card');
  const expanded = card.classList.toggle('is-expanded');
  event.currentTarget.textContent = expanded ? 'shrink' : 'expand';
  event.currentTarget.setAttribute('aria-expanded', String(expanded));
  window.dispatchEvent(new Event('resize'));
});

data.listenTo('statuses',items=>{statuses=items;loaded=true;settleLoaded();render();hydrateEditor();});
data.listenTo('reactions',items=>{reactions=items;render();});
// Being here and being around are one line now: "here now · busy".
data.listenTo('presence',items=>{presence=items;render();});
data.listenToQuery('notes', { orderBy:{field:'createdAt',direction:'desc'}, limit:30 }, items => { profileNotes=items; renderProfileNotes(); });
let stopSectionWatch=()=>{};
window.addEventListener('hashchange', () => { selected=profileRoute(location.hash,viewer).person; render(); revealSection(); });
function revealSection(){
  stopSectionWatch();
  const {section}=profileRoute(location.hash,viewer);
  const target=section==='map'?document.querySelector('.now-location-card'):section==='focus'?$('status-pair'):null;
  if(!target)return;
  const reveal=()=>requestAnimationFrame(()=>{target.scrollIntoView({block:'center'});target.classList.add('is-deep-linked');setTimeout(()=>target.classList.remove('is-deep-linked'),4000);});
  if(section==='map'&&!target.classList.contains('has-map')){
    const observer=new MutationObserver(()=>{if(target.classList.contains('has-map')){stopSectionWatch();reveal();}});
    observer.observe(target,{attributes:true,attributeFilter:['class']});
    const timer=setTimeout(()=>observer.disconnect(),15000);
    stopSectionWatch=()=>{observer.disconnect();clearTimeout(timer);};
  }else reveal();
}
revealSection();
window.setInterval(render,30000);

document.querySelectorAll('.status-choice').forEach(button=>button.addEventListener('click',()=>{
  state=button.dataset.state;document.querySelectorAll('.status-choice').forEach(item=>item.classList.toggle('active',item===button));
}));
$('status-emoji-pick').addEventListener('click',()=>openEmojiPicker({current:emoji,label:'emoji',
  onSelect:value=>{emoji=value;$('status-emoji-pick').textContent=`${value} pick an emoji`;},
  onRemove:()=>{emoji='🎧';$('status-emoji-pick').textContent='🎧 pick an emoji';}
}));
document.querySelectorAll('.energy-choice').forEach(button=>button.addEventListener('click',()=>{
  $('status-text').value=button.dataset.energy;
  $('status-category').value='feeling';$('custom-category-wrap').hidden=true;
  syncQuickWords();$('status-text').focus();
}));
$('status-text').addEventListener('input',syncQuickWords);
function syncQuickWords(){const words=$('status-text').value.trim();document.querySelectorAll('.energy-choice').forEach(item=>item.classList.toggle('active',item.dataset.energy===words));}
$('status-category').addEventListener('change',event=>{$('custom-category-wrap').hidden=event.target.value!=='custom';});
$('status-expiry').addEventListener('change',()=>{expiryTouched=true;});

$('arrival-presets').innerHTML=quickStatusButtons();
$('arrival-presets').addEventListener('click',async event=>{const button=event.target.closest('[data-quick-status]');if(!button)return;setButtonBusy(button,true,'…');
  // "leaving now" means a trip: keep the screen awake so the pings can follow.
  if(button.dataset.quickStatus==='leaving now'&&!tripActive())void startTrip({quiet:true});
  if(!await ready()){setButtonBusy(button,false);return;}
  try{await settleQuickly(saveQuickStatus({data,viewer,other,exists:Boolean(mine())},button.dataset.quickStatus),'that update did not send.');toast(button.textContent.replace(/^\S+\s/,''));}catch(_){showFailure('that update did not send.','check the internet and try again.');}finally{setButtonBusy(button,false);}});
$('status-pair').addEventListener('click',event=>{const picker=event.target.closest('[data-status-picker]');if(picker){const targetId=picker.dataset.statusPicker;const current=findStatusReaction(targetId);openEmojiPicker({current:current?.emoji,onSelect:value=>saveStatusReaction(targetId,value,picker),onRemove:()=>saveStatusReaction(targetId,'',picker)});return;}const button=event.target.closest('[data-react-status]');if(button)void saveStatusReaction(button.dataset.reactStatus,button.dataset.emoji,button);});

function findStatusReaction(targetId){return reactions.find(item=>item.id===`status-${targetId}-${viewer}`||(item.targetType==='status'&&item.targetId===targetId&&item.by===viewer));}
async function saveStatusReaction(targetId,value,button){const id=`status-${targetId}-${viewer}`;const existing=findStatusReaction(targetId);if(button)button.disabled=true;try{if(!value||existing?.emoji===value){if(existing)await data.removeFrom('reactions',existing.id||id);toast('reaction removed');}else{await data.setTo('reactions',id,{targetType:'status',targetId,by:viewer,to:other,emoji:value,createdAt:Date.now()});void data.notify(other,{title:`${personName(viewer)} reacted ${value}`,body:'to your status',url:profileUrl(targetId),kind:'reaction'});toast(`reacted ${value}`);}}catch(_){showFailure('that reaction did not stick.','check the internet and try again.');}finally{if(button?.isConnected)button.disabled=false;}}

$('status-form').addEventListener('submit',async event=>{
  event.preventDefault();const text=$('status-text').value.trim();const rawCategory=$('status-category').value;const category=rawCategory==='custom'?$('status-custom-category').value.trim():rawCategory;
  if(text&&!category){$('status-custom-category').focus();return;}
  const button=$('status-save');setButtonBusy(button,true,'saving…');
  if(!await ready()){setButtonBusy(button,false);return;}
  const expiry=expiryTouched?{expiresAt:expiryTime($('status-expiry').value)}:(mine()?{}:{expiresAt:0});
  try{
    await data.setTo('statuses',viewer,{person:viewer,state,text,category,emoji,energy:'',arrival:'',arrivalAt:0,...expiry,updateKind:'manual',updatedAt:Date.now()});
    const display=text?`${emoji} ${category} ${text}`:stateLabels[state];
    void data.notify(other,{title:`${personName(viewer)} updated their status`,body:display,url:profileUrl(viewer),kind:'status'});
    editorDirty=false;
    toast('status saved. lore updated.');
  }catch(_){showFailure('the status did not save.','check the internet, then try it once more.');}
  finally{setButtonBusy(button,false);}
});

$('status-clear').addEventListener('click',async event=>{
  setButtonBusy(event.currentTarget,true,'clearing…');
  if(!await ready()){setButtonBusy(event.currentTarget,false);return;}
  try{await data.setTo('statuses',viewer,{person:viewer,text:'',category:'',emoji:'',energy:'',arrival:'',arrivalAt:0,expiresAt:0,updateKind:'manual',updatedAt:Date.now(),...(mine()?{}:{state})});$('status-text').value='';syncQuickWords();expiryTouched=false;$('status-expiry').value='0';toast('custom bit cleared');}
  catch(_){showFailure('that did not clear.','check the internet and try again.');}
  finally{setButtonBusy(event.currentTarget,false);}
});

function hydrateEditor(){
  if($('status-form').dataset.hydrated)return;const mine=statuses.find(item=>item.id===viewer||item.person===viewer);if(!mine)return;
  $('status-form').dataset.hydrated='true';state=mine.state||'online';emoji=mine.emoji||'🎧';
  const typing=$('status-text').value.trim()!=='';
  document.querySelectorAll('.status-choice').forEach(item=>item.classList.toggle('active',item.dataset.state===state));
  $('status-emoji-pick').textContent=`${emoji} pick an emoji`;
  const presets=[...$('status-category').options].map(option=>option.value);const category=mine.category||'listening to';
  $('status-category').value=presets.includes(category)?category:'custom';$('custom-category-wrap').hidden=$('status-category').value!=='custom';$('status-custom-category').value=presets.includes(category)?'':category;
  if(!typing)$('status-text').value=isExpired(mine)?'':mine.text||'';
  syncQuickWords();
}

function mine(){return statuses.find(item=>item.id===viewer||item.person===viewer)||null;}
// The rules require text, category and emoji to be strings on every write, so a
// first-ever status has to supply them even when it is only recording an arrival.
function blankStatus(){return {state,text:'',category:'',emoji:'',expiresAt:0};}

function render(){
  const own=selected===viewer;
  document.body.dataset.profileOwner=String(own);
  $('profile-title').textContent=own?'Your profile':`${personName(selected)}’s profile`;
  document.title=`${personName(selected)} · Our Little App`;
  $('profile-tabs').innerHTML=[viewer,other].map(person=>`<a href="${profileUrl(person).slice('status.html'.length)}" ${person===selected?'aria-current="page"':''}><img src="${person==='her'?'sun':'moon'}-profile.png" alt=""><span>${escapeHtml(personName(person))}${person===viewer?' <small>you</small>':''}</span></a>`).join('');
  $('status-pair').innerHTML=statusCard(selected,statuses.find(item=>item.id===selected||item.person===selected));
  document.querySelectorAll('[data-owner-control]').forEach(node=>{node.hidden=!own;});
  $('profile-actions').innerHTML=own
    ? '<a href="phone-check.html#names">name & settings</a>'
    : '<button type="button" data-open-quick="note">leave a note</button><button type="button" data-open-quick="ask">ask for a hand</button>';
  renderProfileNotes();
}
function renderProfileNotes(){
  const notes=profileNotes.filter(note=>(note.sender||note.from)===selected).slice(0,3);
  $('profile-notes').hidden=!notes.length;
  $('profile-notes-title').textContent=selected===viewer?'From you':`From ${personName(selected)}`;
  $('profile-note-list').innerHTML=notes.map(note=>`<a class="profile-note-link" href="notes.html#note-${encodeURIComponent(note.id)}"><span>${escapeHtml(note.body||note.message||'')}</span><small>${escapeHtml(timeAgo(note.createdAt))} <span aria-hidden="true">→</span></small></a>`).join('');
}
function statusCard(person,item={}){
  const focus=focusActive(item);const custom=item.text&&!isExpired(item);const name=personName(person);const image=person==='her'?'sun-profile.png':'moon-profile.png';
  const arrival=arrivalActive(item)?`<p class="status-arrival">↗ ${escapeHtml(item.arrival)}</p>`:'';const location=item.locationText?`<p class="status-location place-${escapeHtml(item.locationPreset||'custom')}"><b>${escapeHtml(item.locationEmoji||'📍')}</b><span>${escapeHtml(item.locationText)}</span></p>`:'';const received=person===other?findStatusReaction(person):reactions.find(reaction=>reaction.targetType==='status'&&reaction.targetId===person&&reaction.by===other);const reactionDisplay=received?(person===other?`<button class="reaction-display" type="button" data-react-status="${escapeHtml(person)}" data-emoji="${escapeHtml(received.emoji)}" aria-label="Remove your ${escapeHtml(received.emoji)} reaction"><b>${escapeHtml(received.emoji)}</b><span>yours · tap to undo</span></button>`:`<div class="reaction-display is-readonly"><b>${escapeHtml(received.emoji)}</b><span>from ${escapeHtml(personName(other))}</span></div>`):'';const reactionButton=person===other?`<button class="reaction-trigger" type="button" data-status-picker="${escapeHtml(person)}">react</button>`:'';
  const legacy=!custom&&!location&&!focus&&!arrival?statusShows(item):null;
  return `<article class="person-status-card ${person===viewer?'is-me':''} ${item.locationPreset?`has-place place-${escapeHtml(item.locationPreset)}`:''}"${person===viewer?' tabindex="0" role="button" aria-label="Edit your status"':''}><div class="status-avatar"><img src="${image}" alt=""><i class="status-dot state-${escapeHtml(item.state||'invisible')}"></i></div><div class="status-person-copy"><div class="status-person-top"><strong>${escapeHtml(name)}</strong>${person===viewer?'<span>you · tap to edit</span>':''}</div><p class="status-presence">${escapeHtml(hereLine({presence:presence.find(entry=>entry.id===person||entry.person===person),status:item}).text)}</p>${location}${arrival}${focus?`<p class="status-custom"><b>⏱</b><span><small>locking in</small>${escapeHtml(item.focusLabel||'doing the thing')}</span></p>`:''}${custom?`<p class="status-custom"><b>${escapeHtml(item.emoji||'✦')}</b><span><small>${escapeHtml(item.category||'currently')}</small>${escapeHtml(item.text)}</span></p>`:legacy?.text?`<p class="status-custom"><b>✦</b><span><small>feeling</small>${escapeHtml(legacy.text)}</span></p>`:location||focus||arrival?'':`<p class="status-blank">${person===viewer?'a little status goes here':'no status right now'}</p>`}<div class="reaction-controls">${reactionDisplay}${reactionButton}</div></div></article>`;
}
function expiryTime(value){if(value==='today'){const date=new Date();date.setHours(23,59,59,999);return date.getTime();}const hours=Number(value)||0;return hours?Date.now()+hours*3600000:0;}
function isExpired(item){return Boolean(item.expiresAt&&item.expiresAt<Date.now());}
window.addEventListener('littlelist:profile',render);
