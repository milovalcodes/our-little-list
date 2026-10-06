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
document.querySelectorAll('#note-starters button').forEach(button=>button.addEventListener('click',()=>{$('note-body').value=button.textContent;$('note-body').focus();}));

let viewLimit=20;
data.listenTo('notes',items=>{notes=items.sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0));renderNotes();markIncomingRead();});
data.listenToQuery('reactions',{orderBy:{field:'createdAt',direction:'desc'},limit:100},items=>{reactions=items;renderNotes();});

$('note-form').addEventListener('submit',async event=>{
  event.preventDefault();const mood=document.querySelector('[name="mood"]:checked').value;const body=$('note-body').value.trim();
  const submit=$('note-submit');setButtonBusy(submit,true,'sending…');
  try{
    const sent=await settleQuickly(sendNote(data,{viewer:sender,other:recipient,body,mood}),`the note “${body.slice(0,40)}” did not send.`);const delivery=sent?.delivery||{queued:true};
    event.target.reset();$('note-send-state').hidden=false;$('note-send-state').textContent=delivery.queued?`sent with a ${moods[mood]}`:`saved for ${personName(recipient)}.`;toast('sent 💌');
    document.querySelector('#sheet-note-form [data-close-sheet]')?.click();
  }catch(_){showFailure('the note did not send.','check the internet and try again. The note is still here.');}
  finally{setButtonBusy(submit,false);}
});

$('note-quick-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input=$('note-quick-text');const body=input.value.trim();if(!body)return;
  const button=$('note-quick-send');setButtonBusy(button,true,'…');
  try{await settleQuickly(sendNote(data,{viewer:sender,other:recipient,body,mood:'heart'}),`the note “${body.slice(0,40)}” did not send.`);input.value='';toast('sent 💌');}
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
async function saveReaction(targetId,value,button){const id=`note-${targetId}-${sender}`;const existing=findMyReaction(targetId);button.disabled=true;try{if(!value||existing?.emoji===value){if(existing)await data.removeFrom('reactions',existing.id||id);toast('reaction removed');}else{await data.setTo('reactions',id,{targetType:'note',targetId,by:sender,to:recipient,emoji:value,createdAt:Date.now()});void data.notify(recipient,{title:`${personName(sender)} reacted ${value}`,body:'to your note',url:`notes.html#note-${targetId}`,kind:'reaction'});toast(`reacted ${value}`);}}catch(_){showFailure('that reaction did not stick.','check the internet and try again.');}finally{if(button.isConnected)button.disabled=false;}}

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
}
window.addEventListener('hashchange',()=>{renderNotes();markIncomingRead();});
$('note-more').addEventListener('click',()=>{viewLimit+=20;renderNotes();markIncomingRead();});

function markIncomingRead(){notes.slice(0,viewLimit).filter(note=>(note.recipient===sender||note.to===sender)&&!note.read&&!markedRead.has(note.id)).forEach(note=>{markedRead.add(note.id);void data.updateIn('notes',note.id,{read:true,readAt:Date.now()}).catch(()=>markedRead.delete(note.id));});}
function setNames(){document.getElementById('note-page-add').setAttribute('aria-label',`Send ${personName(recipient)} a note`);$('note-quick-text').placeholder=`write ${personName(recipient)} a little note…`;}
window.addEventListener('littlelist:profile',()=>{setNames();renderNotes();});
