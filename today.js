import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, toast, setButtonBusy, showFailure, dateKey } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { friendlyDate, timeAgo } from './time-format.js';

const $=id=>document.getElementById(id);
const buckets={items:[],reminders:[],help:[],focus:[],statuses:[]};
let focusMinutes=15;let tick;
const data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));if(data.mode==='local')setupAuthUI(data,{local:true});
const viewer=await awaitViewer();if(!viewer){showNotAMember();await new Promise(()=>{});}const other=partnerOf(viewer);
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;
$('today-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'}).format(new Date()).toLowerCase();

Object.keys(buckets).forEach(name=>data.listenTo(name,items=>{buckets[name]=items;render();}));
tick=window.setInterval(renderFocus,1000);

$('focus-presets').addEventListener('click',event=>{const button=event.target.closest('[data-minutes]');if(!button)return;focusMinutes=Number(button.dataset.minutes);document.querySelectorAll('#focus-presets button').forEach(item=>item.classList.toggle('active',item===button));});
$('focus-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('focus-start');setButtonBusy(button,true,'starting…');const startedAt=Date.now();const label=$('focus-label').value.trim()||'doing the thing';try{await data.setTo('focus',viewer,{person:viewer,active:true,label,minutes:focusMinutes,startedAt,endsAt:startedAt+focusMinutes*60000,updatedAt:startedAt});void data.notify(other,{title:`${personName(viewer)} is locking in`,body:`${label} · ${focusMinutes} min`,url:'today.html',kind:'focus'});toast('timer started. extremely brave.');}catch(_){showFailure('the timer did not start.','check the internet and try again.');}finally{setButtonBusy(button,false);}});
$('focus-pair').addEventListener('click',async event=>{const button=event.target.closest('[data-stop]');if(!button||button.dataset.stop!==viewer)return;button.disabled=true;try{await data.setTo('focus',viewer,{person:viewer,active:false,endedAt:Date.now(),updatedAt:Date.now()});toast('focus session survived');}catch(_){showFailure('the timer refused to stop.','refresh and try once more.');button.disabled=false;}});

function render(){renderToday();renderFocus();}
function renderToday(){const today=dateKey(new Date());const end=new Date();end.setHours(23,59,59,999);const due=[
  ...buckets.items.filter(item=>!item.done&&item.due&&item.due<=today).map(item=>({id:`item-${item.id}`,icon:item.type==='grocery'?'🛒':'✓',title:item.title,meta:item.due<today?'overdue':'today',href:'tasks.html'})),
  ...buckets.reminders.filter(item=>item.recipient===viewer&&Number(item.dueAt)<=end.getTime()&&Number(item.dueAt)>Date.now()-3*3600000).map(item=>({id:`reminder-${item.id}`,icon:'⏰',title:item.title,meta:friendlyDate(item.dueAt),href:'activity.html'})),
  ...buckets.help.filter(item=>item.to===viewer&&item.state==='open').map(item=>({id:`help-${item.id}`,icon:item.emoji||'🙋',title:item.title,meta:'needs an answer',href:'tasks.html#asks'}))
  ].slice(0,12);$('today-count').textContent=String(due.length);$('today-empty').hidden=due.length>0;$('today-list').innerHTML=due.map(item=>`<a class="today-row" href="${item.href}"><span>${escapeHtml(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.meta)}</small></div><i>›</i></a>`).join('');}
function renderFocus(){if(!$('focus-pair'))return;const now=Date.now();$('focus-pair').innerHTML=['her','him'].map(person=>{const item=buckets.focus.find(entry=>entry.id===person||entry.person===person)||{};const active=item.active&&Number(item.endsAt)>now;const remaining=Math.max(0,Number(item.endsAt)-now);const clock=active?`${Math.ceil(remaining/60000)}m left`:(item.endedAt?`ended ${timeAgo(item.endedAt)}`:'not focusing');return `<article class="focus-person${active?' active':''}"><img src="${person==='her'?'sun-profile.png':'moon-profile.png'}" alt=""><div><strong>${escapeHtml(personName(person))}</strong><span>${escapeHtml(clock)}</span>${active?`<small>${escapeHtml(item.label||'doing the thing')}</small>`:''}</div>${active&&person===viewer?`<button type="button" data-stop="${person}">done</button>`:''}</article>`;}).join('');}
window.addEventListener('beforeunload',()=>window.clearInterval(tick));window.addEventListener('littlelist:profile',render);
