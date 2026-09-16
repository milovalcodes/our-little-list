import { createDataLayer } from './firebase-data.js';

const params=new URLSearchParams(location.search);
const viewer=document.body.dataset.viewer||params.get('as')||params.get('from');
if(viewer==='her'||viewer==='him'){
  const seen=new Set();let layer;
  layer=await createDataLayer({collectionName:'notes',onAuth(){},onItems(notes){
    const incoming=notes.filter(note=>note.recipient===viewer&&!note.read&&!seen.has(note.id)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];
    if(!incoming)return;seen.add(incoming.id);show(incoming);setTimeout(()=>layer.update(incoming.id,{read:true}),1200);
  }});
}

function show(note){
  const icons={heart:'💛',sun:'☀️',moon:'🌙',star:'✦'};document.querySelector('.incoming-note')?.remove();
  const popup=document.createElement('aside');popup.className='incoming-note';popup.innerHTML=`<button aria-label="Close">×</button><span>${icons[note.mood]||'💌'}</span><div><small>a tiny note from your person</small><p></p></div>`;popup.querySelector('p').textContent=note.body;popup.querySelector('button').addEventListener('click',()=>popup.remove());document.body.append(popup);setTimeout(()=>popup.remove(),10000);
}

