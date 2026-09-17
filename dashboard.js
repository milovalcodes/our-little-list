import { createDataLayer } from './firebase-data.js';
import { setupAuthUI } from './ui-helpers.js';

const viewer=document.body.dataset.viewer;
const other=viewer==='her'?'him':'her';
const badge=document.getElementById('activity-badge');
const seenKey=`our-little-list-seen-${viewer}`;
const buckets={items:[],notes:[],reminders:[],dates:[],statuses:[]};
let data;let started=false;let heartbeat;

data=await createDataLayer({collectionName:'presence',onItems(){},onAuth(user){
  setupAuthUI(data,user);
  if(user)start();
}});
if(data.mode==='local'){setupAuthUI(data,{local:true});start();}

function start(){
  if(started)return;started=true;
  ['items','notes','reminders','dates','statuses'].forEach(name=>data.listenTo(name,items=>{buckets[name]=items;renderBadge();}));
  touchPresence();heartbeat=window.setInterval(touchPresence,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)touchPresence();});
  window.addEventListener('focus',touchPresence);
}

function touchPresence(){
  void data.setTo('presence',viewer,{person:viewer,lastSeenAt:Date.now(),page:'home'}).catch(()=>{});
}

function renderBadge(){
  if(!badge)return;
  const since=Number(localStorage.getItem(seenKey)||0);
  const incoming=[
    ...buckets.items.filter(item=>item.addedBy===other&&Number(item.createdAt)>since),
    ...buckets.notes.filter(note=>note.recipient===viewer&&Number(note.createdAt)>since),
    ...buckets.reminders.filter(reminder=>reminder.recipient===viewer&&Number(reminder.createdAt)>since),
    ...buckets.dates.filter(idea=>idea.addedBy===other&&!idea.imported&&Number(idea.createdAt)>since),
    ...buckets.statuses.filter(status=>(status.person===other||status.id===other)&&Number(status.updatedAt)>since)
  ];
  badge.hidden=incoming.length===0;
  badge.textContent=incoming.length>9?'9+':String(incoming.length);
  badge.setAttribute('aria-label',`${incoming.length} new`);
}
