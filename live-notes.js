import { createDataLayer } from './firebase-data.js';

const params=new URLSearchParams(location.search);
const viewer=document.body.dataset.viewer||params.get('as')||params.get('from');
if(viewer==='her'||viewer==='him')boot(viewer);

async function boot(viewer){
  const other=viewer==='her'?'him':'her';const shown=new Set();const known={items:null,reminders:null};let layer;let started=false;
  layer=await createDataLayer({collectionName:'notes',onAuth(user){if(user)start();},onItems(notes){
    const incoming=notes.filter(note=>note.recipient===viewer&&!note.read&&!shown.has(`note-${note.id}`)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
    if(!incoming)return;shown.add(`note-${incoming.id}`);announce({icon:{heart:'💛',sun:'☀️',moon:'🌙',star:'✦'}[incoming.mood]||'💌',label:'a note for you',body:incoming.body,url:`notes.html?from=${viewer}`});window.setTimeout(()=>void layer.update(incoming.id,{read:true,readAt:Date.now()}).catch(()=>{}),1200);
  }});
  if(layer.mode==='local')start();

  function start(){
    if(started)return;started=true;
    layer.listenTo('items',items=>watchFresh('items',items,item=>item.addedBy===other,{icon:'✓',label:'new on our list',body:item=>item.title,url:`tasks.html?as=${viewer}`}));
    layer.listenTo('reminders',items=>watchFresh('reminders',items,item=>item.recipient===viewer,{icon:'⏰',label:'a reminder for you',body:item=>item.title,url:`reminders.html?from=${viewer}`}));
    if(!document.body.dataset.viewer){touchPresence();window.setInterval(touchPresence,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)touchPresence();});}
  }
  function touchPresence(){void layer.setTo('presence',viewer,{person:viewer,lastSeenAt:Date.now(),page:document.body.dataset.app||'somewhere'}).catch(()=>{});}
  function watchFresh(name,items,isIncoming,copy){
    const ids=new Set(items.map(item=>item.id));if(known[name]===null){known[name]=ids;return;}
    items.filter(item=>!known[name].has(item.id)&&isIncoming(item)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,1).forEach(item=>announce({icon:copy.icon,label:copy.label,body:copy.body(item),url:copy.url}));known[name]=ids;
  }
}

function announce(message){
  window.playLittleTwinkle?.();
  if(document.hidden&&'Notification'in window&&Notification.permission==='granted'){
    navigator.serviceWorker?.ready.then(registration=>registration.showNotification(message.label,{body:message.body,icon:'./sun-moon-personalized.png',badge:'./sun-moon-personalized.png',data:{url:message.url}})).catch(()=>{});
  }
  document.querySelector('.incoming-note')?.remove();
  const popup=document.createElement('aside');popup.className='incoming-note';popup.innerHTML=`<button aria-label="Close">×</button><span>${message.icon}</span><div><small></small><p></p></div>`;popup.querySelector('small').textContent=message.label;popup.querySelector('p').textContent=message.body;popup.querySelector('button').addEventListener('click',()=>popup.remove());popup.addEventListener('click',event=>{if(event.target.closest('button'))return;location.href=message.url;});document.body.append(popup);setTimeout(()=>popup.remove(),10000);
}
