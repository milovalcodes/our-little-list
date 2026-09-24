import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI,applyViewerTheme,escapeHtml,showFailure,toast } from './ui-helpers.js';
import { startPresence } from './presence.js';
import { personName } from './profile-store.js';
import { timeAgo, friendlyDate } from './time-format.js';

const $=id=>document.getElementById(id);const buckets={items:[],notes:[],reminders:[],presence:[],dates:[],statuses:[],help:[],memories:[],reactions:[],focus:[]};
let data;let started=false;
// The "delete for us" confirm used to be stored on the button element itself.
// render() replaces the whole list, and a presence beat alone does that about
// twice a minute, so the second tap kept landing on a fresh button that had
// forgotten the first one — and nothing was ever deleted. Keeping the armed row
// here lets the confirm survive a redraw.
let armedDelete=null;let armedTimer=0;
// Marking incoming things read used to be a single timer 900ms after startup,
// which on a slow first load ran before any of the snapshots had arrived and
// then never ran again.
const markedRead=new Set();let markTimer=0;
data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));
if(data.mode==='local')setupAuthUI(data,{local:true});

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const viewer=await awaitViewer();
if(!viewer){showNotAMember();await new Promise(()=>{});}
const other=partnerOf(viewer);
const seenKey=`our-little-list-seen-${viewer}`;
const hiddenKey=`our-little-list-hidden-activity-${viewer}-v1`;
const hidden=readHidden();

applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;
$('other-face').src=other==='her'?'sun-profile.png':'moon-profile.png';
start();
$('mark-seen').addEventListener('click',markSeen);
$('activity-list').addEventListener('click',handleActivityAction);

function start(){
  if(started)return;started=true;
  ['items','notes','reminders','presence','dates','statuses','help','memories','reactions','focus'].forEach(name=>data.listenTo(name,items=>{buckets[name]=items;render();if(name==='notes'||name==='reminders')scheduleMarkRead();}));
  startPresence(data,viewer,'activity');
  window.setInterval(renderPresence,30000);
}

function events(){
  const all=[];
  buckets.items.forEach(item=>{
    all.push({id:`item-${item.id}`,recordId:item.id,collection:'items',at:Number(item.createdAt)||0,icon:item.type==='grocery'?'🛒':'✓',who:item.addedBy,kind:item.type==='grocery'?'put on groceries':'put on the list',text:item.title});
    if(item.done&&item.doneAt)all.push({id:`done-${item.id}`,recordId:item.id,collection:'items',at:Number(item.doneAt),icon:'🫡',who:item.doneBy,kind:'finished',text:item.title});
  });
  buckets.notes.forEach(note=>all.push({id:`note-${note.id}`,recordId:note.id,collection:'notes',at:Number(note.createdAt)||0,icon:{heart:'💛',sun:'☀️',moon:'🌙',star:'✦'}[note.mood]||'💌',who:note.sender,kind:'sent a note',text:note.body,status:note.recipient===viewer?(note.read?'seen by you':'new for you'):(note.read?'seen':'delivered')}));
  buckets.reminders.forEach(reminder=>all.push({id:`reminder-${reminder.id}`,recordId:reminder.id,collection:'reminders',at:Number(reminder.createdAt)||0,icon:'⏰',who:reminder.sender,kind:'set a reminder',text:reminder.title,status:reminder.dueAt?`for ${friendlyDate(reminder.dueAt)}`:''}));
  buckets.dates.filter(idea=>!idea.imported).forEach(idea=>all.push({id:`date-${idea.id}`,recordId:idea.id,collection:'dates',at:Number(idea.createdAt)||0,icon:'✦',who:idea.addedBy,kind:'saved a date idea',text:idea.title,status:idea.vibe||''}));
  buckets.help.forEach(request=>{
    all.push({id:`help-${request.id}`,recordId:request.id,collection:'help',at:Number(request.createdAt)||0,icon:request.emoji||'🙋',who:request.from,kind:'asked for a hand',selfKind:'asked for a hand',text:request.title,status:request.state&&request.state!=='open'?`answered: ${request.state==='on-it'?'on it':request.state==='later'?'in a bit':request.state==='cant'?"can't":'sorted'}`:'waiting'});
    if(request.answeredAt)all.push({id:`help-answer-${request.id}-${request.answeredAt}`,recordId:request.id,collection:'help',at:Number(request.answeredAt),icon:request.state==='cant'?'✗':'✓',who:request.to,kind:'answered a request',selfKind:'answered a request',text:request.title});
  });
  buckets.statuses.forEach(status=>all.push({id:`status-${status.id}-${status.updatedAt||0}`,recordId:status.id,collection:'statuses',at:Number(status.updatedAt)||0,icon:status.emoji||'●',who:status.person||status.id,kind:'updated their status',selfKind:'updated your status',text:status.text?`${status.category||'currently'} ${status.text}`:(status.state||'updated')}));
  buckets.memories.forEach(item=>all.push({id:`memory-${item.id}`,recordId:item.id,collection:'memories',at:Number(item.createdAt)||0,icon:'◒',who:item.addedBy,kind:'added to the memory jar',text:item.text}));
  buckets.reactions.forEach(item=>all.push({id:`reaction-${item.id}`,recordId:item.id,collection:'reactions',at:Number(item.createdAt)||0,icon:item.emoji||'♡',who:item.by,kind:'reacted',text:item.targetType==='status'?'to a status':'to a note'}));
  buckets.focus.forEach(item=>{if(item.updatedAt)all.push({id:`focus-${item.id}-${item.updatedAt}`,recordId:item.id,collection:'focus',at:Number(item.updatedAt),icon:'⏱',who:item.person||item.id,kind:item.active?'started focusing':'finished focusing',text:item.label||'doing the thing',status:item.active?`${item.minutes||15} min`:''});});
  return all.filter(item=>item.at&&!hidden.has(item.id)).sort((a,b)=>b.at-a.at).slice(0,80);
}

function render(){
  const list=events();$('activity-empty').hidden=list.length>0;
  $('activity-list').innerHTML=list.map(event=>{const mine=event.who===viewer;const canDelete=mine||!['statuses','focus'].includes(event.collection);return `<li class="activity-row" data-event-id="${escapeHtml(event.id)}" data-record-id="${escapeHtml(event.recordId)}" data-collection="${escapeHtml(event.collection)}"><span class="activity-icon">${escapeHtml(event.icon)}</span><div class="activity-row-copy"><p><b>${mine?'you':escapeHtml(event.who?personName(event.who):'someone')}</b> ${escapeHtml(mine&&event.selfKind?event.selfKind:event.kind)}</p><strong>${escapeHtml(event.text||'')}</strong><small>${timeAgo(event.at)}${event.status?` · ${escapeHtml(event.status)}`:''}</small><div class="activity-row-actions"><button type="button" data-action="hide">delete for me</button>${canDelete?'<button class="delete-for-us" type="button" data-action="delete">delete for us</button>':''}</div></div></li>`;}).join('');
  showArmedDelete();
  renderPresence();
}

// Re-applies the pending confirm after a redraw, and clears it from the row it
// was on when it expires.
function showArmedDelete(){
  [...$('activity-list').children].forEach(row=>{
    const button=row.querySelector('[data-action="delete"]');
    if(!button||button.disabled)return;
    const armed=row.dataset.eventId===armedDelete;
    button.textContent=armed?'tap again to delete for us':'delete for us';
    button.classList.toggle('confirming',armed);
  });
}
function armDelete(eventId){
  armedDelete=eventId;
  window.clearTimeout(armedTimer);
  armedTimer=window.setTimeout(()=>{armedDelete=null;showArmedDelete();},4000);
  showArmedDelete();
}
function disarmDelete(){armedDelete=null;window.clearTimeout(armedTimer);}

async function handleActivityAction(event){
  const button=event.target.closest('[data-action]');if(!button)return;const row=button.closest('[data-event-id]');if(!row)return;
  if(button.dataset.action==='hide'){hidden.add(row.dataset.eventId);saveHidden();row.classList.add('is-removing');window.setTimeout(render,180);toast('gone from your feed');return;}
  if(armedDelete!==row.dataset.eventId){armDelete(row.dataset.eventId);return;}
  disarmDelete();
  button.disabled=true;button.textContent='deleting…';
  try{
    await data.removeFrom(row.dataset.collection,row.dataset.recordId);
    if(data.mode==='local'&&row.dataset.collection!=='items')buckets[row.dataset.collection]=buckets[row.dataset.collection].filter(item=>item.id!==row.dataset.recordId);
    toast('deleted for both of you');render();
  }catch(_){showFailure('that did not delete.','check the internet and try again.');button.disabled=false;button.textContent='delete for us';button.classList.remove('confirming');}
}

function readHidden(){try{return new Set(JSON.parse(localStorage.getItem(hiddenKey))||[]);}catch(_){return new Set();}}
function saveHidden(){localStorage.setItem(hiddenKey,JSON.stringify([...hidden].slice(-500)));}

function renderPresence(){
  const person=buckets.presence.find(item=>item.id===other||item.person===other);const age=person?Date.now()-Number(person.lastSeenAt||0):Infinity;const here=age<120000;
  $('presence-dot').classList.toggle('online',here);
  $('presence-kicker').textContent=here?'here now':'last seen';
  $('presence-status').textContent=here?`${personName(other)} is here right now`:(person?`${personName(other)} was here ${timeAgo(person.lastSeenAt)}`:`no visit from ${personName(other)} yet`);
}

function markSeen(){localStorage.setItem(seenKey,String(Date.now()));$('mark-seen').textContent='all seen ✓';window.setTimeout(()=>$('mark-seen').textContent='mark all seen',1600);markIncomingRead();}
function scheduleMarkRead(){window.clearTimeout(markTimer);markTimer=window.setTimeout(markIncomingRead,900);}
function markIncomingRead(){
  window.clearTimeout(markTimer);
  buckets.notes.filter(note=>note.recipient===viewer&&!note.read).forEach(note=>markOnce(`note-${note.id}`,()=>data.updateIn('notes',note.id,{read:true,readAt:Date.now()})));
  buckets.reminders.filter(reminder=>reminder.recipient===viewer&&!reminder.seenAt).forEach(reminder=>markOnce(`reminder-${reminder.id}`,()=>data.updateIn('reminders',reminder.id,{seenAt:Date.now()})));
}
// One write per thing per visit. The snapshot that the write itself triggers
// would otherwise come back before the change is visible in it and start the
// same write again. A write that fails is allowed to be retried.
function markOnce(key,write){
  if(markedRead.has(key))return;
  markedRead.add(key);
  void write().catch(()=>markedRead.delete(key));
}
window.addEventListener('littlelist:profile',render);
