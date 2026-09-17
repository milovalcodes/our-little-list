import { createDataLayer } from './firebase-data.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';

const LEGACY_MIGRATION_ID='date-notes-v1';
const LEGACY_CREATED_AT=1700000000000;
const LEGACY_DATE_IDEAS=[
  ['lemongrass','Lemongrass date','food',true],
  ['photoshoot','Photoshoot date','go out',false],
  ['tea','Tea date','food',true],
  ['enson-market','Enson Market date','food',true],
  ['mama-yatai','Mama Yatai date','food',true],
  ['froyo-karaoke-stargazing','Froyo + karaoke + making out + stargazing date','go out',true],
  ['double-date-round-1','Double date to Round 1','go out',true],
  ['pool','Pool date','go out',false],
  ['water-taxi','Water taxi date','little trip',false],
  ['kava','Kava date','food',true],
  ['raccoon-island','Raccoon Island date','little trip',false],
  ['museum','Museum date','go out',true],
  ['trader-joes','Trader Joe’s date','food',false],
  ['lingerie-shopping','Lingerie shopping date','go out',true],
  ['perfume','Perfume date','go out',false],
  ['decorate-room','Decorating my room date','stay in',false],
  ['parallel-play','Parallel play date','stay in',true],
  ['pedicure','Pedicure date','go out',false],
  ['slime','Slime date','stay in',false],
  ['nintendo','Nintendo date','stay in',false],
  ['lemonica','Lemonica date','food',false],
  ['fancy-dinner','Dinner date (fancy)','food',false],
  ['clay-marcus','Clay Marcus date','go out',false],
  ['cooking','Cooking date','stay in',true],
  ['picnic','Picnic date','go out',false],
  ['baking','Baking date','stay in',false]
];

const params=new URLSearchParams(location.search);const viewer=params.get('as')==='him'?'him':'her';const other=viewer==='her'?'him':'her';const $=id=>document.getElementById(id);let ideas=[];let vibe='go out';let data;let migrationStarted=false;
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;
data=await createDataLayer({collectionName:'dates',onItems(items){ideas=items.sort((a,b)=>(Number(a.done)-Number(b.done))||(Number(b.favorite)-Number(a.favorite))||((b.createdAt||0)-(a.createdAt||0)));render();},onAuth(user){setupAuthUI(data,user);if(user)queueMicrotask(importLegacyIdeas);}});if(data.mode==='local'){setupAuthUI(data,{local:true});void importLegacyIdeas();}

document.querySelectorAll('.date-vibe').forEach(button=>button.addEventListener('click',()=>{vibe=button.dataset.vibe;document.querySelectorAll('.date-vibe').forEach(item=>item.classList.toggle('active',item===button));}));
$('date-form').addEventListener('submit',async event=>{event.preventDefault();const title=$('date-title').value.trim();const note=$('date-note').value.trim();const button=$('date-submit');setButtonBusy(button,true,'saving…');try{await data.add({title,note,vibe,addedBy:viewer,favorite:false,done:false,createdAt:Date.now()});void data.push(other,{title:'new date idea ✦',body:title,sound:'twinkle.wav',channelId:'our-twinkles',priority:'high',data:{kind:'date',from:viewer,url:`dates.html?as=${other}`}}).catch(()=>{});event.target.reset();toast('saved for later ✦');}catch(_){showFailure('the idea escaped.','check the internet and save it again.');}finally{setButtonBusy(button,false);}});
$('pick-random').addEventListener('click',event=>{const available=ideas.filter(idea=>!idea.done);if(!available.length){$('random-date').textContent=ideas.length?'we somehow did all of them. suspiciously productive.':'we need at least one idea first.';return;}event.currentTarget.classList.remove('is-picking');void event.currentTarget.offsetWidth;event.currentTarget.classList.add('is-picking');const idea=available[Math.floor(Math.random()*available.length)];$('random-date').innerHTML=`<strong>${escapeHtml(idea.title)}</strong>${idea.note?`<span>${escapeHtml(idea.note)}</span>`:''}`;});
$('date-list').addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button)return;const idea=ideas.find(item=>item.id===button.closest('[data-id]')?.dataset.id);if(!idea)return;button.disabled=true;try{if(button.dataset.action==='favorite')await data.update(idea.id,{favorite:!idea.favorite});else if(button.dataset.action==='complete'){await data.update(idea.id,{done:!idea.done,doneAt:idea.done?0:Date.now()});toast(idea.done?'back in the pile':'date completed. historic.');}else if(button.dataset.action==='delete')await data.remove(idea.id);}catch(_){showFailure('that edit did not stick.','check the internet and tap it again.');button.disabled=false;}});

function importLegacyIdeas(){
  if(migrationStarted||!data)return;migrationStarted=true;let stop;
  stop=data.listenTo('migrations',async records=>{
    stop?.();
    if(records.some(record=>record.id===LEGACY_MIGRATION_ID))return;
    try{
      await Promise.all(LEGACY_DATE_IDEAS.map(([slug,title,ideaVibe,done],index)=>data.set(`old-list-${slug}`,{title,note:'',vibe:ideaVibe,addedBy:'him',favorite:false,done,doneAt:done?LEGACY_CREATED_AT-index*1000:0,imported:true,createdAt:LEGACY_CREATED_AT-index*1000})));
      await data.setTo('migrations',LEGACY_MIGRATION_ID,{done:true,count:LEGACY_DATE_IDEAS.length,importedAt:Date.now()});
      toast('the old date list moved in ✦');
    }catch(_){migrationStarted=false;showFailure('the old date list did not move in.','check the internet, then reopen this page.');}
  });
}

function render(){
  const finished=ideas.filter(idea=>idea.done).length;const left=ideas.length-finished;
  $('date-count').textContent=finished?`${left} left · ${finished} done`:`${ideas.length} saved`;
  $('date-empty').hidden=ideas.length>0;
  $('date-list').innerHTML=ideas.map(idea=>`<article class="date-idea-card${idea.favorite?' favorite':''}${idea.done?' done':''}" data-id="${escapeHtml(idea.id)}"><div class="date-idea-top"><span>${escapeHtml(idea.vibe||'idea')}</span><div class="date-actions"><button data-action="favorite" aria-label="${idea.favorite?'Unfavorite':'Favorite'}">${idea.favorite?'★':'☆'}</button><button data-action="delete" aria-label="Delete">×</button></div></div><h3>${escapeHtml(idea.title)}</h3>${idea.note?`<p>${escapeHtml(idea.note)}</p>`:''}<div class="date-idea-foot"><small>added by ${escapeHtml(personName(idea.addedBy))}</small><button class="date-done-toggle" data-action="complete" type="button">${idea.done?'undo':'did it ✓'}</button></div>${idea.done?'<span class="date-complete-badge">we did this</span>':''}</article>`).join('');
}
window.addEventListener('littlelist:profile',render);
