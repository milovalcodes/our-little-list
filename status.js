import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';

const $=id=>document.getElementById(id);
const stateLabels={online:'around',away:'afk-ish',dnd:'busy',invisible:'lurking'};
let statuses=[];let reactions=[];let state='online';let emoji='🎧';let energy='functioning';

const data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));
if(data.mode==='local')setupAuthUI(data,{local:true});

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const viewer=await awaitViewer();
if(!viewer){showNotAMember();await new Promise(()=>{});}
const other=partnerOf(viewer);
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;

data.listenTo('statuses',items=>{statuses=items;render();hydrateEditor();});
data.listenTo('reactions',items=>{reactions=items;render();});

document.querySelectorAll('.status-choice').forEach(button=>button.addEventListener('click',()=>{
  state=button.dataset.state;document.querySelectorAll('.status-choice').forEach(item=>item.classList.toggle('active',item===button));
}));
document.querySelectorAll('.status-emoji').forEach(button=>button.addEventListener('click',()=>{
  emoji=button.dataset.emoji;document.querySelectorAll('.status-emoji').forEach(item=>item.classList.toggle('active',item===button));
}));
document.querySelectorAll('.energy-choice').forEach(button=>button.addEventListener('click',()=>{energy=button.dataset.energy;document.querySelectorAll('.energy-choice').forEach(item=>item.classList.toggle('active',item===button));}));
$('status-category').addEventListener('change',event=>{$('custom-category-wrap').hidden=event.target.value!=='custom';});

$('arrival-presets').addEventListener('click',async event=>{const button=event.target.closest('[data-arrival]');if(!button)return;setButtonBusy(button,true,'…');const current=statuses.find(item=>item.id===viewer||item.person===viewer)||{};try{await data.setTo('statuses',viewer,{person:viewer,state:current.state||state,text:current.text||'',category:current.category||'',emoji:current.emoji||'',energy:current.energy||energy,arrival:button.dataset.arrival,arrivalAt:Date.now(),expiresAt:current.expiresAt||0,updatedAt:Date.now()});void data.notify(other,{title:`${personName(viewer)}: ${button.dataset.arrival}`,body:'',url:'status.html',kind:'arrival'});toast(button.dataset.arrival);}catch(_){showFailure('that update did not send.','check the internet and try again.');}finally{setButtonBusy(button,false);}});
$('status-pair').addEventListener('click',async event=>{const button=event.target.closest('[data-react-status]');if(!button)return;const targetId=button.dataset.reactStatus;const id=`status-${targetId}-${viewer}`;const existing=reactions.find(item=>item.id===id||(item.targetType==='status'&&item.targetId===targetId&&item.by===viewer));button.disabled=true;try{if(existing?.emoji===button.dataset.emoji){await data.removeFrom('reactions',existing.id||id);toast('reaction removed');}else{await data.setTo('reactions',id,{targetType:'status',targetId,by:viewer,to:other,emoji:button.dataset.emoji,createdAt:Date.now()});void data.notify(other,{title:`${personName(viewer)} reacted ${button.dataset.emoji}`,body:'to your status',url:'status.html',kind:'reaction'});toast(`reacted ${button.dataset.emoji}`);}}catch(_){showFailure('that reaction did not stick.','check the internet and try again.');button.disabled=false;}});

$('status-form').addEventListener('submit',async event=>{
  event.preventDefault();const text=$('status-text').value.trim();const rawCategory=$('status-category').value;const category=rawCategory==='custom'?$('status-custom-category').value.trim():rawCategory;
  if(text&&!category){$('status-custom-category').focus();return;}
  const expiresAt=expiryTime($('status-expiry').value);const button=$('status-save');setButtonBusy(button,true,'saving…');
  try{
    await data.setTo('statuses',viewer,{person:viewer,state,text,category,emoji,energy,expiresAt,updatedAt:Date.now()});
    const display=text?`${emoji} ${category} ${text}`:stateLabels[state];
    void data.notify(other,{title:`${personName(viewer)} updated their status`,body:display,url:`status.html`,kind:'status'});
    toast('status saved. lore updated.');
  }catch(_){showFailure('the status did not save.','check the internet, then try it once more.');}
  finally{setButtonBusy(button,false);}
});

$('status-clear').addEventListener('click',async event=>{
  setButtonBusy(event.currentTarget,true,'clearing…');
  try{await data.setTo('statuses',viewer,{person:viewer,state,text:'',category:'',emoji:'',expiresAt:0,updatedAt:Date.now()});$('status-text').value='';toast('custom bit cleared');}
  catch(_){showFailure('that did not clear.','check the internet and try again.');}
  finally{setButtonBusy(event.currentTarget,false);}
});

function hydrateEditor(){
  if($('status-form').dataset.hydrated)return;const mine=statuses.find(item=>item.id===viewer||item.person===viewer);if(!mine)return;
  $('status-form').dataset.hydrated='true';state=mine.state||'online';emoji=mine.emoji||'🎧';energy=mine.energy||'functioning';
  document.querySelectorAll('.status-choice').forEach(item=>item.classList.toggle('active',item.dataset.state===state));
  document.querySelectorAll('.status-emoji').forEach(item=>item.classList.toggle('active',item.dataset.emoji===emoji));
  document.querySelectorAll('.energy-choice').forEach(item=>item.classList.toggle('active',item.dataset.energy===energy));
  const presets=[...$('status-category').options].map(option=>option.value);const category=mine.category||'listening to';
  $('status-category').value=presets.includes(category)?category:'custom';$('custom-category-wrap').hidden=$('status-category').value!=='custom';$('status-custom-category').value=presets.includes(category)?'':category;$('status-text').value=isExpired(mine)?'':mine.text||'';
}

function render(){
  $('status-pair').innerHTML=['her','him'].map(person=>statusCard(person,statuses.find(item=>item.id===person||item.person===person))).join('');
}
function statusCard(person,item={}){
  const custom=item.text&&!isExpired(item);const label=stateLabels[item.state]||'somewhere';const name=personName(person);const image=person==='her'?'sun-profile.png':'moon-profile.png';
  const arrival=item.arrival&&Date.now()-Number(item.arrivalAt||0)<4*3600000?`<p class="status-arrival">↗ ${escapeHtml(item.arrival)}</p>`:'';const received=reactions.find(reaction=>reaction.targetType==='status'&&reaction.targetId===person);const mine=person===other?reactions.find(reaction=>reaction.targetType==='status'&&reaction.targetId===person&&reaction.by===viewer):null;const reactionDisplay=received?`<div class="reaction-display"><b>${escapeHtml(received.emoji)}</b><span>${person===other?'your reaction · tap it again to undo':`from ${escapeHtml(personName(other))}`}</span></div>`:'';const reactionButtons=person===other?`<div class="quick-reactions">${statusReactionButton(person,'♡',mine)}${statusReactionButton(person,'😭',mine)}${statusReactionButton(person,'🫡',mine)}${statusReactionButton(person,'criminal behavior',mine)}</div>`:'';
  return `<article class="person-status-card ${person===viewer?'is-me':''}"><div class="status-avatar"><img src="${image}" alt=""><i class="status-dot state-${escapeHtml(item.state||'invisible')}"></i></div><div class="status-person-copy"><div class="status-person-top"><strong>${escapeHtml(name)}</strong>${person===viewer?'<span>you</span>':''}</div><p class="status-presence">${escapeHtml(label)} · ${escapeHtml(item.energy||'functioning')}</p>${arrival}${custom?`<p class="status-custom"><b>${escapeHtml(item.emoji||'✦')}</b><span><small>${escapeHtml(item.category||'currently')}</small>${escapeHtml(item.text)}</span></p>`:'<p class="status-blank">no custom status rn</p>'}${reactionDisplay}${reactionButtons}</div></article>`;
}
function statusReactionButton(targetId,value,current){const active=current?.emoji===value;return `<button class="${active?'active':''}" type="button" data-react-status="${escapeHtml(targetId)}" data-emoji="${escapeHtml(value)}" aria-pressed="${active}">${escapeHtml(value)}</button>`;}
function expiryTime(value){if(value==='today'){const date=new Date();date.setHours(23,59,59,999);return date.getTime();}const hours=Number(value)||0;return hours?Date.now()+hours*3600000:0;}
function isExpired(item){return Boolean(item.expiresAt&&item.expiresAt<Date.now());}
window.addEventListener('littlelist:profile',render);
