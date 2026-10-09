import { escapeHtml, toast, setButtonBusy, settleQuickly, showFailure, keepInlineEdits } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';
import { openEmojiPicker } from './emoji-picker.js';
import { sendNote, NOTE_MOODS } from './records.js';
import { pinNote, clearFridge } from './fridge.js';
import { deleteWithUndo, isPendingDelete } from './undo-delete.js';

const $=id=>document.getElementById(id);
const { data, viewer: sender, other: recipient } = await bootPage();
setNames();

const moods=NOTE_MOODS;
let notes=[];let reactions=[];let editingNoteId='';const markedRead=new Set();
let readFrame=0;

let viewLimit=20;
let renderedNotes='';
data.listenTo('notes',items=>{
  notes=items.sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
  // Read receipts do not change these cards. Replacing the entire thread for
  // each receipt can disturb scroll anchoring while someone is reading it.
  const visibleContent=JSON.stringify(notes.map(({read,readAt,...note})=>note));
  if(visibleContent!==renderedNotes){renderedNotes=visibleContent;renderNotes();}
  markIncomingRead();
});
data.listenToQuery('reactions',{orderBy:{field:'createdAt',direction:'desc'},limit:100},items=>{reactions=items;renderNotes();});

// One writing bar: quick picks appear while it is empty, and the little
// button on its left cycles the mood that rides along with the note.
const quickInput=$('note-quick-text');const starters=$('note-starters');const moodButton=$('note-mood');
const moodOrder=Object.keys(moods);let quickMood='heart';
function setQuickMood(mood){quickMood=mood;moodButton.dataset.mood=mood;moodButton.textContent=moods[mood];moodButton.setAttribute('aria-label',`Mood: ${moods[mood]} — tap to change`);}
function syncStarters(){starters.hidden=!(document.activeElement===quickInput&&!quickInput.value.trim());}
['focus','input','blur'].forEach(type=>quickInput.addEventListener(type,syncStarters));
// Keep the keyboard up while tapping a pick or the mood.
[starters,moodButton].forEach(node=>node.addEventListener('pointerdown',event=>event.preventDefault()));
starters.addEventListener('click',event=>{const pick=event.target.closest('button');if(!pick)return;quickInput.value=pick.textContent;quickInput.focus();syncStarters();});
moodButton.addEventListener('click',()=>{setQuickMood(moodOrder[(moodOrder.indexOf(quickMood)+1)%moodOrder.length]);window.littleHaptic?.('tap');});

$('note-quick-form').addEventListener('submit', async event => {
  event.preventDefault();
  const body=quickInput.value.trim();if(!body)return;const mood=quickMood;
  const button=$('note-quick-send');setButtonBusy(button,true,'…');
  try{await settleQuickly(sendNote(data,{viewer:sender,other:recipient,body,mood}),`the note “${body.slice(0,40)}” did not send.`);quickInput.value='';setQuickMood('heart');syncStarters();toast(mood==='heart'?'sent 💌':`sent with a ${moods[mood]}`);}
  catch(_){showFailure('the note did not send.','check the internet and try again. Your words are still here.');}
  finally{setButtonBusy(button,false);}
});

$('note-inbox-list').addEventListener('click',async event=>{
  const edit=event.target.closest('[data-edit-note]');
  if(edit){editingNoteId=edit.dataset.editNote;renderNotes();$('note-inbox-list').querySelector('[data-note-edit] textarea')?.focus();return;}
  const cancel=event.target.closest('[data-cancel-note]');
  if(cancel){editingNoteId='';renderNotes();return;}
  const remove=event.target.closest('[data-delete-note]');
  if(remove){deleteWithUndo(data,'notes',remove.dataset.deleteNote,{label:'note deleted',onChange:renderNotes});return;}
  // Pinning puts a note on the fridge on both home screens; one at a time.
  const pin=event.target.closest('[data-pin-note]');
  if(pin){const note=notes.find(item=>item.id===pin.dataset.pinNote);if(!note)return;pin.disabled=true;
    try{if(note.pinned){await clearFridge(data,notes);toast('off the fridge');}else{await pinNote(data,notes,note.id,sender);toast('📌 on the fridge');}}
    catch(_){showFailure('the fridge did not take it.','check the internet and try again.');}
    finally{if(pin.isConnected)pin.disabled=false;}return;}
  const picker=event.target.closest('[data-note-picker]');if(!picker)return;const targetId=picker.dataset.notePicker;const current=findMyReaction(targetId);openEmojiPicker({current:current?.emoji,onSelect:value=>saveReaction(targetId,value,picker),onRemove:()=>saveReaction(targetId,'',picker)});});

$('note-inbox-list').addEventListener('submit',async event=>{
  const form=event.target.closest('[data-note-edit]');if(!form)return;event.preventDefault();
  const body=form.querySelector('textarea').value.trim();if(!body)return;
  const save=form.querySelector('[type="submit"]');setButtonBusy(save,true,'saving…');
  try{await data.updateIn('notes',form.dataset.noteEdit,{body,message:body,editedAt:Date.now()});editingNoteId='';renderNotes();toast('fixed it');}
  catch(_){showFailure('that edit did not stick.','check the internet and try again.');}
  finally{if(save.isConnected)setButtonBusy(save,false);}
});
$('note-inbox-list').addEventListener('keydown',event=>{if(event.key==='Escape'&&event.target.closest('[data-note-edit]')){editingNoteId='';renderNotes();}});

function findMyReaction(targetId){return reactions.find(item=>item.id===`note-${targetId}-${sender}`||(item.targetType==='note'&&item.targetId===targetId&&item.by===sender));}
async function saveReaction(targetId,value,button){const id=`note-${targetId}-${sender}`;const existing=findMyReaction(targetId);button.disabled=true;try{if(!value||existing?.emoji===value){if(existing)await data.removeFrom('reactions',existing.id||id);toast('reaction removed');}else{const at=Date.now();await data.setTo('reactions',id,{targetType:'note',targetId,by:sender,to:recipient,emoji:value,createdAt:at});void data.notify(recipient,{title:`${personName(sender)} reacted ${value}`,body:'to your note',url:`notes.html#note-${targetId}`,kind:'reaction',ref:`reactions/${id}/${at}`});toast(`reacted ${value}`);}}catch(_){showFailure('that reaction did not stick.','check the internet and try again.');}finally{if(button.isConnected)button.disabled=false;}}

function renderNotes() {
  const available = notes.filter(note => !isPendingDelete('notes', note.id));
  const linked=/^#note-([A-Za-z0-9_-]+)$/.exec(location.hash)?.[1];
  if(linked){const index=available.findIndex(note=>note.id===linked);if(index>=0)viewLimit=Math.max(viewLimit,index+1);}
  const list = available.slice(0,viewLimit);
  $('note-inbox-empty').hidden = list.length > 0;
  $('note-more').hidden = list.length >= available.length;
  $('note-more').textContent = `show ${Math.min(20,available.length-list.length)} more`;
  const container = $('note-inbox-list');
  keepInlineEdits(container, () => { container.innerHTML = list.map(note => {
    const mine = note.sender === sender || note.from === sender;
    const from = mine ? sender : recipient;
    const myReaction = !mine ? findMyReaction(note.id) : null;
    const partnerReaction = mine ? reactions.find(item => item.targetType === 'note' && item.targetId === note.id && item.by === recipient) : null;
    const canEdit = mine && Date.now() - Number(note.createdAt) < 86400000;
    const editing = editingNoteId === note.id;
    const body = editing
      ? `<form class="inline-edit" data-note-edit="${escapeHtml(note.id)}"><textarea maxlength="500" required aria-label="Edit note">${escapeHtml(note.body || note.message || '')}</textarea><div class="inline-edit-actions"><button type="submit">save</button><button type="button" data-cancel-note>cancel</button></div></form>`
      : `<p>${escapeHtml(note.body || note.message || '')}</p>`;
    return `<article class="note-thread-row${mine ? ' mine' : ''}" data-id="${escapeHtml(note.id)}"><span>${moods[note.mood] || '💌'}</span><div><small>${mine ? 'you' : escapeHtml(personName(from))} · ${timeAgo(note.createdAt)}${note.editedAt ? ' · edited' : ''}</small>${body}<div class="reaction-controls">${myReaction ? `<button class="reaction-display" type="button" data-note-picker="${escapeHtml(note.id)}"><b>${escapeHtml(myReaction.emoji)}</b><span>yours · tap to change</span></button>` : ''}${partnerReaction ? `<span class="reaction-display passive"><b>${escapeHtml(partnerReaction.emoji)}</b><span>${escapeHtml(personName(recipient))}</span></span>` : ''}${!mine ? `<button class="reaction-trigger" type="button" data-note-picker="${escapeHtml(note.id)}">react</button>` : ''}<button class="reaction-trigger note-tool" type="button" data-pin-note="${escapeHtml(note.id)}">${note.pinned ? '📌 unpin' : '📌 pin'}</button>${canEdit && !editing ? `<button class="reaction-trigger note-tool" type="button" data-edit-note="${escapeHtml(note.id)}">edit</button>` : ''}${mine ? `<button class="reaction-trigger note-tool" type="button" data-delete-note="${escapeHtml(note.id)}">delete</button>` : ''}</div></div></article>`;
  }).join(''); });
  markIncomingRead();
}
window.addEventListener('hashchange',()=>{renderNotes();markIncomingRead();});
$('note-more').addEventListener('click',()=>{viewLimit+=20;renderNotes();markIncomingRead();});

function markIncomingRead(){
  if(document.hidden||readFrame)return;
  readFrame=requestAnimationFrame(()=>{
    readFrame=0;
    if(document.hidden||document.querySelector('.app-sheet:not([hidden]),dialog[open],.auth-gate,.global-failure,.thinking-screen'))return;
    for(const row of $('note-inbox-list').querySelectorAll('[data-id]')){
      const bounds=row.getBoundingClientRect();
      // A mounted row is not necessarily being read: leave offscreen notes
      // unread, including rows below the fold and a background browser tab.
      const visible=Math.min(bounds.bottom,window.innerHeight)-Math.max(bounds.top,0);
      if(!row.getClientRects().length||visible<Math.min(40,bounds.height/2))continue;
      const exposed=document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,bounds.left+bounds.width/2)),(Math.max(0,bounds.top)+Math.min(innerHeight,bounds.bottom))/2);
      if(!exposed||!row.contains(exposed))continue;
      const note=notes.find(item=>item.id===row.dataset.id);
      if(!note||(note.recipient!==sender&&note.to!==sender)||note.read||markedRead.has(note.id))continue;
      markedRead.add(note.id);
      void data.updateIn('notes',note.id,{read:true,readAt:Date.now()}).catch(()=>markedRead.delete(note.id));
    }
  });
}
document.addEventListener('visibilitychange',markIncomingRead);
window.addEventListener('scroll',markIncomingRead,{passive:true,capture:true});
window.addEventListener('resize',markIncomingRead,{passive:true});
document.addEventListener('littlelist:sheet-close',markIncomingRead);
// Loading screens, dialogs and banners can uncover a note without scrolling.
new MutationObserver(records=>{if(records.some(r=>r.target===document.body||r.target.matches?.('dialog,.app-sheet,.auth-gate,.global-failure,.thinking-screen')))markIncomingRead();})
 .observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open','class']});
function setNames(){$('note-quick-text').setAttribute('aria-label',`Write ${personName(recipient)} a note`);$('note-quick-text').placeholder=`write ${personName(recipient)} a little note…`;}
window.addEventListener('littlelist:profile',()=>{setNames();renderNotes();});
