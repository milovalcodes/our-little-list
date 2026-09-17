import { createDataLayer } from './firebase-data.js';
import { setupAuthUI,applyViewerTheme,escapeHtml } from './ui-helpers.js';

const params=new URLSearchParams(location.search);const viewer=params.get('as')==='him'?'him':'her';const other=viewer==='her'?'him':'her';
const $=id=>document.getElementById(id);const buckets={items:[],notes:[],reminders:[],presence:[]};
const seenKey=`our-little-list-seen-${viewer}`;let data;let started=false;
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;
$('other-face').src=other==='her'?'sun-profile.png':'moon-profile.png';

data=await createDataLayer({collectionName:'items',onItems(items){buckets.items=items;render();},onAuth(user){setupAuthUI(data,user);if(user)start();}});
if(data.mode==='local'){setupAuthUI(data,{local:true});start();}
$('mark-seen').addEventListener('click',markSeen);

function start(){
  if(started)return;started=true;
  ['notes','reminders','presence'].forEach(name=>data.listenTo(name,items=>{buckets[name]=items;render();}));
  void data.setTo('presence',viewer,{person:viewer,lastSeenAt:Date.now(),page:'receipts'}).catch(()=>{});
  window.setTimeout(markIncomingRead,900);
  window.setInterval(renderPresence,30000);
}

function events(){
  const all=[];
  buckets.items.forEach(item=>{
    all.push({id:`item-${item.id}`,at:Number(item.createdAt)||0,icon:item.type==='grocery'?'🛒':'✓',who:item.addedBy,kind:item.type==='grocery'?'put on groceries':'put on the list',text:item.title});
    if(item.done&&item.doneAt)all.push({id:`done-${item.id}`,at:Number(item.doneAt),icon:'🫡',who:item.doneBy,kind:'defeated a task',text:item.title});
  });
  buckets.notes.forEach(note=>all.push({id:`note-${note.id}`,at:Number(note.createdAt)||0,icon:{heart:'💛',sun:'☀️',moon:'🌙',star:'✦'}[note.mood]||'💌',who:note.sender,kind:'launched a tiny note',text:note.body,status:note.recipient===viewer?(note.read?'seen by you':'new for you'):(note.read?'seen':'delivered to the website')}));
  buckets.reminders.forEach(reminder=>all.push({id:`reminder-${reminder.id}`,at:Number(reminder.createdAt)||0,icon:'⏰',who:reminder.sender,kind:'weaponized the future',text:reminder.title,status:reminder.dueAt?`for ${friendlyDate(reminder.dueAt)}`:''}));
  return all.filter(item=>item.at).sort((a,b)=>b.at-a.at).slice(0,80);
}

function render(){
  const list=events();$('activity-empty').hidden=list.length>0;
  $('activity-list').innerHTML=list.map(event=>`<li class="activity-row"><span class="activity-icon">${event.icon}</span><div><p><b>${event.who===viewer?'you':event.who||'someone'}</b> ${escapeHtml(event.kind)}</p><strong>${escapeHtml(event.text||'')}</strong><small>${timeAgo(event.at)}${event.status?` · ${escapeHtml(event.status)}`:''}</small></div></li>`).join('');
  renderPresence();
}

function renderPresence(){
  const person=buckets.presence.find(item=>item.id===other||item.person===other);const age=person?Date.now()-Number(person.lastSeenAt||0):Infinity;const here=age<120000;
  $('presence-dot').classList.toggle('online',here);
  $('presence-kicker').textContent=here?'currently haunting the website':'last known internet activity';
  $('presence-status').textContent=here?`${other} is here right now`:(person?`${other} was here ${timeAgo(person.lastSeenAt)}`:`${other} has left no digital footprints yet`);
}

function markSeen(){localStorage.setItem(seenKey,String(Date.now()));$('mark-seen').textContent='seen. legally.';window.setTimeout(()=>$('mark-seen').textContent='mark all seen',1600);markIncomingRead();}
function markIncomingRead(){
  buckets.notes.filter(note=>note.recipient===viewer&&!note.read).forEach(note=>void data.updateIn('notes',note.id,{read:true,readAt:Date.now()}).catch(()=>{}));
  buckets.reminders.filter(reminder=>reminder.recipient===viewer&&!reminder.seenAt).forEach(reminder=>void data.updateIn('reminders',reminder.id,{seenAt:Date.now()}).catch(()=>{}));
}
function timeAgo(at){const seconds=Math.max(0,Math.floor((Date.now()-Number(at))/1000));if(seconds<15)return'just now';if(seconds<60)return`${seconds}s ago`;const minutes=Math.floor(seconds/60);if(minutes<60)return`${minutes}m ago`;const hours=Math.floor(minutes/60);if(hours<24)return`${hours}h ago`;return`${Math.floor(hours/24)}d ago`;}
function friendlyDate(at){return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(Number(at)));}
