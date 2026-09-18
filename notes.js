import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, setButtonBusy, showFailure } from './ui-helpers.js';
import { personName } from './profile-store.js';

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
document.querySelectorAll('#note-starters button').forEach(button=>button.addEventListener('click',()=>{$('note-body').value=button.textContent;updatePreview();}));
$('note-body').addEventListener('input',updatePreview);document.querySelectorAll('[name="mood"]').forEach(input=>input.addEventListener('change',updatePreview));
function updatePreview(){const mood=document.querySelector('[name="mood"]:checked').value;$('preview-mood').textContent=moods[mood];$('preview-body').textContent=$('note-body').value.trim()||'thinking of u ♡';}

$('note-form').addEventListener('submit',async event=>{
  event.preventDefault();const mood=document.querySelector('[name="mood"]:checked').value;const body=$('note-body').value.trim();
  const submit=$('note-submit');setButtonBusy(submit,true,'sending…');
  try{
    await data.addTo('notes',{sender,recipient,from:sender,to:recipient,body,message:body,mood,read:false,createdAt:Date.now()});
    const delivery=await data.notify(recipient,{title:sender==='her'?'the sun says ☀️':'the moon says 🌙',body,url:`notes.html`,kind:'note'});
    event.target.hidden=true;document.querySelector('.note-starters').hidden=true;document.querySelectorAll('.note-maker>.maker-question').forEach(el=>el.hidden=true);$('sent-state').hidden=false;$('sent-copy').textContent=delivery.queued?`sent with a ${moods[mood]}`:`saved. ${personName(recipient)} will see it next time they open the site.`;
  }catch(_){showFailure('the note did not send.','check the internet and try again. The note is still here.');}
  finally{if(!event.target.hidden)setButtonBusy(submit,false);}
});
$('another-note').addEventListener('click',()=>location.reload());
function setNames(){document.getElementById('note-heading').textContent=`Send ${personName(recipient)} a note`;}
window.addEventListener('littlelist:profile',setNames);
