import { escapeHtml, toast, setButtonBusy, showFailure, dateKey } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import { friendlyWhen, timeAgo } from './time-format.js';
import { startActivityFeed } from './activity-feed.js';
import { focusActive } from './availability.js';
import { startDailyQuestion } from './daily-question.js';

const $=id=>document.getElementById(id);
const buckets={items:[],help:[],statuses:[]};
let focusMinutes=15;let tick;
const { data, viewer, other } = await bootPage();
$('today-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'}).format(new Date()).toLowerCase();

Object.keys(buckets).forEach(name=>{
  const receive=items=>{buckets[name]=items;render();};
  if(name==='items')data.listenToQuery(name,{where:{field:'done',value:false}},receive);
  else data.listenTo(name,receive);
});
startActivityFeed({data,viewer,other});
startDailyQuestion({data,viewer,other});
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
  try{await data.setTo('statuses',viewer,{person:viewer,...blank,focusLabel:label,focusMinutes,focusStartedAt:startedAt,focusUntil:startedAt+focusMinutes*60000,focusEndedAt:0,updateKind:'focus',updatedAt:startedAt});void data.notify(other,{title:`${personName(viewer)} is locking in`,body:`${label} · ${focusMinutes} min`,url:'today.html',kind:'focus'});toast('timer started. extremely brave.');}catch(_){showFailure('the timer did not start.','check the internet and try again.');}finally{setButtonBusy(button,false);}});
$('focus-pair').addEventListener('click',async event=>{const button=event.target.closest('[data-stop]');if(!button||button.dataset.stop!==viewer)return;button.disabled=true;
  try{await data.setTo('statuses',viewer,{person:viewer,focusUntil:0,focusEndedAt:Date.now(),updateKind:'focus-end',updatedAt:Date.now()});toast('focus session survived');}catch(_){showFailure('the timer refused to stop.','refresh and try once more.');button.disabled=false;}});

function render(){renderToday();renderFocus();}
function renderToday(){const today=dateKey(new Date());const end=new Date();end.setHours(23,59,59,999);const due=[
  ...buckets.items.filter(item=>!item.done&&item.due&&item.due<=today).map(item=>({id:`item-${item.id}`,icon:item.type==='grocery'?'🛒':'✓',title:item.title,meta:item.due<today?'overdue':'today',href:'tasks.html'})),
  // Asks waiting on you, and asks with a time (what reminders are now) that
  // come due today even once they have been answered.
  ...buckets.help.filter(item=>{if(item.to!==viewer)return false;const due=Number(item.dueAt);
    // An ask with a time belongs to its day, like a reminder did: "Friday" does
    // not crowd Monday. Asks without one wait here until they are answered.
    if(due>0)return due>Date.now()-3*3600000&&due<=end.getTime()&&!['done','cant'].includes(item.state);
    return item.state==='open';}).map(item=>({id:`help-${item.id}`,icon:item.emoji||(item.dueAt?'⏰':'🙋'),title:item.title,meta:Number(item.dueAt)>0?`⏰ ${friendlyWhen(Number(item.dueAt))}`:'needs an answer',href:'tasks.html#asks'}))
  ];
  const total=due.length;
  const shown=fairShare(due,12);
  $('today-count').textContent=String(total);$('today-empty').hidden=total>0;$('today-list').innerHTML=shown.map(item=>`<a class="today-row" href="${item.href}"><span>${escapeHtml(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta)}</small></div><i>›</i></a>`).join('');}
let lastFocusMarkup='';
function renderFocus(){if(!$('focus-pair'))return;const now=Date.now();const markup=['her','him'].map(person=>{const item=statusOf(person)||{};const active=focusActive(item,now);const remaining=Math.max(0,Number(item.focusUntil)-now);const ended=Number(item.focusEndedAt)||(Number(item.focusUntil)>0&&!active?Number(item.focusUntil):0);const clock=active?`${Math.ceil(remaining/60000)}m left`:(ended?`ended ${timeAgo(ended)}`:'not focusing');return `<article class="focus-person${active?' active':''}"><img src="${person==='her'?'sun-profile.png':'moon-profile.png'}" alt=""><div><strong>${escapeHtml(personName(person))}</strong><span>${escapeHtml(clock)}</span>${active?`<small>${escapeHtml(item.focusLabel||'doing the thing')}</small>`:''}</div>${active&&person===viewer?`<button type="button" data-stop="${person}">done</button>`:''}</article>`;}).join('');
  if(markup===lastFocusMarkup)return;
  lastFocusMarkup=markup;
  $('focus-pair').innerHTML=markup;
}

// Keep each kind of thing represented rather than letting one long list crowd
// the others out of the twelve rows.
function fairShare(rows,limit){
  if(rows.length<=limit)return rows;
  const kinds=new Map();
  rows.forEach(row=>{const kind=row.id.split('-')[0];if(!kinds.has(kind))kinds.set(kind,[]);kinds.get(kind).push(row);});
  const picked=[];
  while(picked.length<limit){
    let took=false;
    for(const queue of kinds.values()){
      if(picked.length>=limit)break;
      if(queue.length){picked.push(queue.shift());took=true;}
    }
    if(!took)break;
  }
  return rows.filter(row=>picked.includes(row));
}
window.addEventListener('beforeunload',()=>window.clearInterval(tick));window.addEventListener('littlelist:profile',render);
