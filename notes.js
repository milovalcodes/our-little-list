import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, toast, setButtonBusy, showFailure } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';
import { openEmojiPicker } from './emoji-picker.js';

const $=id=>document.getElementById(id);
const data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));
if(data.mode==='local')setupAuthUI(data,{local:true});

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const sender=await awaitViewer();
if(!sender){showNotAMember();await new Promise(()=>{});}
const recipient=partnerOf(sender);
applyViewerTheme(sender);document.querySelector('.back-to-side').href=`${sender}.html`;setNames();

const moods={heart:'💛',sun:'☀️',moon:'🌙',star:'✦'};
let notes=[];let reactions=[];const markedRead=new Set();
document.querySelectorAll('#note-starters button').forEach(button=>button.addEventListener('click',()=>{$('note-body').value=button.textContent;$('note-body').focus();}));

data.listenTo('notes',items=>{notes=items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));renderNotes();markIncomingRead();});
data.listenTo('reactions',items=>{reactions=items;renderNotes();});

$('note-form').addEventListener('submit',async event=>{
  event.preventDefault();const mood=document.querySelector('[name="mood"]:checked').value;const body=$('note-body').value.trim();
  const submit=$('note-submit');setButtonBusy(submit,true,'sending…');
  try{
    await data.addTo('notes',{sender,recipient,from:sender,to:recipient,body,message:body,mood,read:false,createdAt:Date.now()});
    const delivery=await data.notify(recipient,{title:sender==='her'?'the sun says ☀️':'the moon says 🌙',body,url:`notes.html`,kind:'note'});
    event.target.reset();$('note-send-state').hidden=false;$('note-send-state').textContent=delivery.queued?`sent with a ${moods[mood]}`:`saved for ${personName(recipient)}.`;toast('sent 💌');
  }catch(_){showFailure('the note did not send.','check the internet and try again. The note is still here.');}
  finally{setButtonBusy(submit,false);}
});

$('note-inbox-list').addEventListener('click',event=>{const picker=event.target.closest('[data-note-picker]');if(!picker)return;const targetId=picker.dataset.notePicker;const current=findMyReaction(targetId);openEmojiPicker({current:current?.emoji,onSelect:value=>saveReaction(targetId,value,picker),onRemove:()=>saveReaction(targetId,'',picker)});});

function findMyReaction(targetId){return reactions.find(item=>item.id===`note-${targetId}-${sender}`||(item.targetType==='note'&&item.targetId===targetId&&item.by===sender));}
async function saveReaction(targetId,value,button){const id=`note-${targetId}-${sender}`;const existing=findMyReaction(targetId);button.disabled=true;try{if(!value||existing?.emoji===value){if(existing)await data.removeFrom('reactions',existing.id||id);toast('reaction removed');}else{await data.setTo('reactions',id,{targetType:'note',targetId,by:sender,to:recipient,emoji:value,createdAt:Date.now()});void data.notify(recipient,{title:`${personName(sender)} reacted ${value}`,body:'to your note',url:'notes.html',kind:'reaction'});toast(`reacted ${value}`);}}catch(_){showFailure('that reaction did not stick.','check the internet and try again.');}finally{if(button.isConnected)button.disabled=false;}}

function renderNotes(){const list=notes.slice(0,20);$('note-inbox-empty').hidden=list.length>0;$('note-inbox-list').innerHTML=list.map(note=>{const mine=note.sender===sender||note.from===sender;const from=mine?sender:recipient;const myReaction=!mine?findMyReaction(note.id):null;const partnerReaction=mine?reactions.find(item=>item.targetType==='note'&&item.targetId===note.id&&item.by===recipient):null;return `<article class="note-thread-row${mine?' mine':''}"><span>${moods[note.mood]||'💌'}</span><div><small>${mine?'you':escapeHtml(personName(from))} · ${timeAgo(note.createdAt)}</small><p>${escapeHtml(note.body||note.message||'')}</p><div class="reaction-controls">${myReaction?`<button class="reaction-display" type="button" data-note-picker="${escapeHtml(note.id)}"><b>${escapeHtml(myReaction.emoji)}</b><span>yours · tap to change</span></button>`:''}${partnerReaction?`<span class="reaction-display passive"><b>${escapeHtml(partnerReaction.emoji)}</b><span>${escapeHtml(personName(recipient))}</span></span>`:''}${!mine?`<button class="reaction-trigger" type="button" data-note-picker="${escapeHtml(note.id)}">react</button>`:''}</div></div></article>`;}).join('');}

function markIncomingRead(){notes.filter(note=>(note.recipient===sender||note.to===sender)&&!note.read&&!markedRead.has(note.id)).forEach(note=>{markedRead.add(note.id);void data.updateIn('notes',note.id,{read:true,readAt:Date.now()}).catch(()=>markedRead.delete(note.id));});}
function setNames(){document.getElementById('note-heading').textContent=`Send ${personName(recipient)} a note`;}
window.addEventListener('littlelist:profile',()=>{setNames();renderNotes();});
