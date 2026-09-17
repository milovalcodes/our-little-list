import { createDataLayer } from './firebase-data.js';
import { setupAuthUI, applyViewerTheme, setButtonBusy, showFailure } from './ui-helpers.js';

const params=new URLSearchParams(location.search);const sender=params.get('from')==='him'?'him':'her';const recipient=sender==='her'?'him':'her';
applyViewerTheme(sender);document.querySelector('.back-to-side').href=`${sender}.html`;document.getElementById('note-heading').textContent=`Send ${recipient} a note`;
const $=id=>document.getElementById(id);let data;
data=await createDataLayer({collectionName:'notes',onItems(){},onAuth(user){setupAuthUI(data,user);}});if(data.mode==='local')setupAuthUI(data,{local:true});

const moods={heart:'💛',sun:'☀️',moon:'🌙',star:'✦'};
document.querySelectorAll('#note-starters button').forEach(button=>button.addEventListener('click',()=>{$('note-body').value=button.textContent;updatePreview();}));
$('note-body').addEventListener('input',updatePreview);document.querySelectorAll('[name="mood"]').forEach(input=>input.addEventListener('change',updatePreview));
function updatePreview(){const mood=document.querySelector('[name="mood"]:checked').value;$('preview-mood').textContent=moods[mood];$('preview-body').textContent=$('note-body').value.trim()||'thinking of u ♡';}

$('note-form').addEventListener('submit',async event=>{
  event.preventDefault();const mood=document.querySelector('[name="mood"]:checked').value;const body=$('note-body').value.trim();
  const submit=$('note-submit');setButtonBusy(submit,true,'launching…');
  try{
    await data.add({sender,recipient,from:sender,to:recipient,body,message:body,mood,read:false,createdAt:Date.now()});
    const push=await data.push(recipient,{title:sender==='her'?'the sun says ☀️':'the moon says 🌙',body,sound:'twinkle.wav',channelId:'our-twinkles',priority:'high',data:{kind:'note',body,from:sender,url:'notes'}}).catch(()=>({sent:false}));
    event.target.hidden=true;document.querySelector('.note-starters').hidden=true;document.querySelectorAll('.note-maker>.maker-question').forEach(el=>el.hidden=true);$('sent-state').hidden=false;$('sent-copy').textContent=push.sent?`launched the ${moods[mood]}. technology has peaked.`:`saved to the receipts. the popup will ambush ${recipient} next time the site wakes up.`;
  }catch(_){showFailure('the note got stuck in the launch tube.','check the internet and try sending it again. The note is still here.');}
  finally{if(!event.target.hidden)setButtonBusy(submit,false);}
});
$('another-note').addEventListener('click',()=>location.reload());

