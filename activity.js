import { sharedLayer, onAuthChange, whenReady } from './data-hub.js';
import { setupAuthUI,applyViewerTheme,escapeHtml,showFailure,toast } from './ui-helpers.js';
import { startPresence } from './presence.js';
import { personName } from './profile-store.js';
import { timeAgo, friendlyDate } from './time-format.js';

const params=new URLSearchParams(location.search);const viewer=params.get('as')==='him'?'him':'her';const other=viewer==='her'?'him':'her';
const $=id=>document.getElementById(id);const buckets={items:[],notes:[],reminders:[],presence:[],dates:[],statuses:[],help:[]};
const seenKey=`our-little-list-seen-${viewer}`;const hiddenKey=`our-little-list-hidden-activity-${viewer}-v1`;const hidden=readHidden();let data;let started=false;
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;
$('other-face').src=other==='her'?'sun-profile.png':'moon-profile.png';

data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));
if(data.mode==='local')setupAuthUI(data,{local:true});
whenReady(data,start);
$('mark-seen').addEventListener('click',markSeen);
$('activity-list').addEventListener('click',handleActivityAction);

function start(){
  if(started)return;started=true;
  ['items','notes','reminders','presence','dates','statuses','help'].forEach(name=>data.listenTo(name,items=>{buckets[name]=items;render();}));
  startPresence(data,viewer,'activity');
  window.setTimeout(markIncomingRead,900);
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
  return all.filter(item=>item.at&&!hidden.has(item.id)).sort((a,b)=>b.at-a.at).slice(0,80);
}

function render(){
  const list=events();$('activity-empty').hidden=list.length>0;
  $('activity-list').innerHTML=list.map(event=>{const mine=event.who===viewer;return `<li class="activity-row" data-event-id="${escapeHtml(event.id)}" data-record-id="${escapeHtml(event.recordId)}" data-collection="${escapeHtml(event.collection)}"><span class="activity-icon">${event.icon}</span><div class="activity-row-copy"><p><b>${mine?'you':escapeHtml(event.who?personName(event.who):'someone')}</b> ${escapeHtml(mine&&event.selfKind?event.selfKind:event.kind)}</p><strong>${escapeHtml(event.text||'')}</strong><small>${timeAgo(event.at)}${event.status?` · ${escapeHtml(event.status)}`:''}</small><div class="activity-row-actions"><button type="button" data-action="hide">delete for me</button><button class="delete-for-us" type="button" data-action="delete">delete for us</button></div></div></li>`;}).join('');
  renderPresence();
}

async function handleActivityAction(event){
  const button=event.target.closest('[data-action]');if(!button)return;const row=button.closest('[data-event-id]');if(!row)return;
  if(button.dataset.action==='hide'){hidden.add(row.dataset.eventId);saveHidden();row.classList.add('is-removing');window.setTimeout(render,180);toast('gone from your feed');return;}
  if(button.dataset.confirmed!=='yes'){
    button.dataset.confirmed='yes';button.dataset.originalText=button.textContent;button.textContent='tap again to delete for us';button.classList.add('confirming');
    window.setTimeout(()=>{if(!button.isConnected)return;button.dataset.confirmed='';button.textContent=button.dataset.originalText||'delete for us';button.classList.remove('confirming');},4000);return;
  }
  button.disabled=true;button.textContent='deleting…';
  try{
    await data.removeFrom(row.dataset.collection,row.dataset.recordId);
    if(data.mode==='local'&&row.dataset.collection!=='items')buckets[row.dataset.collection]=buckets[row.dataset.collection].filter(item=>item.id!==row.dataset.recordId);
    toast('deleted for both of you');render();
  }catch(_){showFailure('that did not delete.','check the internet and try again.');button.disabled=false;button.textContent='delete for us';button.classList.remove('confirming');button.dataset.confirmed='';}
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
function markIncomingRead(){
  buckets.notes.filter(note=>note.recipient===viewer&&!note.read).forEach(note=>void data.updateIn('notes',note.id,{read:true,readAt:Date.now()}).catch(()=>{}));
  buckets.reminders.filter(reminder=>reminder.recipient===viewer&&!reminder.seenAt).forEach(reminder=>void data.updateIn('reminders',reminder.id,{seenAt:Date.now()}).catch(()=>{}));
}
window.addEventListener('littlelist:profile',render);
