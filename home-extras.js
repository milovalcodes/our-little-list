import { escapeHtml, toast, setButtonBusy, showFailure } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';
import { startActivityFeed } from './activity-feed.js';
import { focusActive } from './availability.js';

const $=id=>document.getElementById(id);
const buckets={statuses:[]};
let focusMinutes=15;let tick;
const { data, viewer, other } = await bootPage();

Object.keys(buckets).filter(name=>name!=='routineChecks').forEach(name=>{
  const receive=items=>{buckets[name]=items;render();};
  if(name==='items')data.listenToQuery(name,{where:{field:'done',value:false}},receive);
  else data.listenTo(name,receive);
});
startActivityFeed({data,viewer,other});
// A focus session is part of your status: while it runs, the status says
// "⏱ locking in · <what>" everywhere. It lives in its own fields on the status
// (see availability.js) instead of its own record that only this page showed.
const statusOf=person=>buckets.statuses.find(entry=>entry.id===person||entry.person===person);
// Nothing writes until the stored status has been seen: before that, "is there
// a status yet?" has no honest answer, and guessing "no" would write blank
// fields over a real one.
let statusesSeen=false;let settleStatuses;const firstStatuses=new Promise(resolve=>{settleStatuses=resolve;});
data.listenTo('statuses',()=>{statusesSeen=true;settleStatuses();});
async function statusesReady(){
  if(statusesSeen)return true;
  await Promise.race([firstStatuses,new Promise(resolve=>window.setTimeout(resolve,6000))]);
  if(!statusesSeen)showFailure('we could not reach your status yet.','check the internet, then try again — nothing was changed.');
  return statusesSeen;
}
tick=window.setInterval(renderFocus,1000);

$('focus-presets').addEventListener('click',event=>{const button=event.target.closest('[data-minutes]');if(!button)return;focusMinutes=Number(button.dataset.minutes);document.querySelectorAll('#focus-presets button').forEach(item=>item.classList.toggle('active',item===button));});
$('focus-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('focus-start');setButtonBusy(button,true,'starting…');
  if(!await statusesReady()){setButtonBusy(button,false);return;}
  const startedAt=Date.now();const label=$('focus-label').value.trim()||'doing the thing';
  // A brand-new status document needs its text fields to exist; an existing
  // one keeps whatever it says.
  const blank=statusOf(viewer)?{}:{text:'',category:'',emoji:''};
  try{await data.setTo('statuses',viewer,{person:viewer,...blank,focusLabel:label,focusMinutes,focusStartedAt:startedAt,focusUntil:startedAt+focusMinutes*60000,focusEndedAt:0,updateKind:'focus',updatedAt:startedAt});void data.notify(other,{title:`${personName(viewer)} is locking in`,body:`${label} · ${focusMinutes} min`,url:`status.html#profile-${viewer}-focus`,kind:'focus'});toast('timer started. extremely brave.');}catch(_){showFailure('the timer did not start.','check the internet and try again.');}finally{setButtonBusy(button,false);}});
$('focus-pair').addEventListener('click',async event=>{const button=event.target.closest('[data-stop]');if(!button||button.dataset.stop!==viewer)return;button.disabled=true;
  try{await data.setTo('statuses',viewer,{person:viewer,focusUntil:0,focusEndedAt:Date.now(),updateKind:'focus-end',updatedAt:Date.now()});toast('focus session survived');}catch(_){showFailure('the timer refused to stop.','refresh and try once more.');button.disabled=false;}});

function render(){renderFocus();}
let lastFocusMarkup='';
function renderFocus(){if(!$('focus-pair'))return;const now=Date.now();const markup=['her','him'].map(person=>{const item=statusOf(person)||{};const active=focusActive(item,now);const remaining=Math.max(0,Number(item.focusUntil)-now);const ended=Number(item.focusEndedAt)||(Number(item.focusUntil)>0&&!active?Number(item.focusUntil):0);const clock=active?`${Math.ceil(remaining/60000)}m left`:(ended?`ended ${timeAgo(ended)}`:'not focusing');return `<article class="focus-person${active?' active':''}"><img src="${person==='her'?'sun-profile.png':'moon-profile.png'}" alt=""><div><strong>${escapeHtml(personName(person))}</strong><span>${escapeHtml(clock)}</span>${active?`<small>${escapeHtml(item.focusLabel||'doing the thing')}</small>`:''}</div>${active&&person===viewer?`<button type="button" data-stop="${person}">done</button>`:''}</article>`;}).join('');
  if(markup===lastFocusMarkup)return;
  lastFocusMarkup=markup;
  $('focus-pair').innerHTML=markup;
}

window.addEventListener('beforeunload',()=>window.clearInterval(tick));window.addEventListener('littlelist:profile',render);
