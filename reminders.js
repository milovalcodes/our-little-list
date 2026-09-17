import { createDataLayer } from './firebase-data.js';
import { setupAuthUI, applyViewerTheme, toast, dateKey, setButtonBusy, showFailure } from './ui-helpers.js';

const params=new URLSearchParams(location.search);const sender=params.get('from')==='him'?'him':'her';const recipient=sender==='her'?'him':'her';
applyViewerTheme(sender);document.querySelector('.back-to-side').href=`${sender}.html`;document.getElementById('reminder-heading').textContent=`Remind ${recipient}`;
const $=id=>document.getElementById(id);let day='today';let time='09:00';let data;
data=await createDataLayer({collectionName:'reminders',onItems(){},onAuth(user){setupAuthUI(data,user);}});if(data.mode==='local')setupAuthUI(data,{local:true});

function select(group,button,key){document.querySelectorAll(`#${group} .choice`).forEach(item=>item.classList.remove('active'));button.classList.add('active');if(group==='day-choices'){day=key;$('custom-day').hidden=key!=='custom';}else{time=key;$('custom-time').hidden=key!=='custom';}}
document.querySelectorAll('#day-choices .choice').forEach(button=>button.addEventListener('click',()=>select('day-choices',button,button.dataset.day)));
document.querySelectorAll('#time-choices .choice').forEach(button=>button.addEventListener('click',()=>select('time-choices',button,button.dataset.time)));

$('reminder-form').addEventListener('submit',async event=>{
  event.preventDefault();const chosen=makeDate();if(!chosen){toast('pick a day and time first');return;}
  const title=$('reminder-title').value.trim();const dueAt=chosen.getTime();
  const submit=$('reminder-submit');setButtonBusy(submit,true,'warning future us…');
  try{
    const record=await data.add({sender,recipient,from:sender,to:recipient,title,note:$('reminder-note').value.trim(),scheduledAt:chosen.toISOString(),dueAt,delivered:false,createdAt:Date.now()});
    const reminderId=record?.id||`web-${Date.now()}`;
    const push=await data.push(recipient,{title:'new reminder ⏰',body:`${title} · ${friendly(chosen)}`,sound:'twinkle.wav',channelId:'our-twinkles',priority:'high',data:{kind:'reminder-created',title,dueAt,from:sender,reminderId,url:'reminders'}}).catch(()=>({sent:false}));
    if(push.sent)void data.push(recipient,{data:{kind:'schedule-reminder',title,dueAt,from:sender,reminderId},contentAvailable:true,priority:'high'}).catch(()=>{});
    event.target.hidden=true;$('sent-state').hidden=false;$('sent-copy').textContent=push.sent?`future ${recipient} has been warned. ominous.`:`saved to the receipts. future ${recipient} can no longer claim ignorance.`;
  }catch(_){showFailure('the reminder fell out of the timeline.','check the internet and try again. Everything you typed is still here.');}
  finally{if(!event.target.hidden)setButtonBusy(submit,false);}
});
$('another-reminder').addEventListener('click',()=>{location.reload();});

function makeDate(){
  const value=new Date();value.setSeconds(0,0);
  if(day==='tomorrow')value.setDate(value.getDate()+1);
  if(day==='weekend'){const days=(6-value.getDay()+7)%7||7;value.setDate(value.getDate()+days);}
  if(day==='custom'){if(!$('custom-day').value)return null;const[y,m,d]=$('custom-day').value.split('-').map(Number);value.setFullYear(y,m-1,d);}
  const chosenTime=time==='custom'?$('custom-time').value:time;if(!chosenTime)return null;const[h,min]=chosenTime.split(':').map(Number);value.setHours(h,min,0,0);return value;
}
function friendly(value){return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(value);}
