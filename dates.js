import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
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

const $=id=>document.getElementById(id);let ideas=[];let vibe='go out';let migrationStarted=false;let viewLimit=8;

const data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));
if(data.mode==='local')setupAuthUI(data,{local:true});

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const viewer=await awaitViewer();
if(!viewer){showNotAMember();await new Promise(()=>{});}
const other=partnerOf(viewer);
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;

data.listenTo('dates',items=>{
  const flag=value=>value?1:0;
  ideas=items.sort((a,b)=>(flag(a.done)-flag(b.done))||(flag(b.favorite)-flag(a.favorite))||((b.createdAt||0)-(a.createdAt||0)));
  render();
});
void importLegacyIdeas();

document.querySelectorAll('.date-vibe').forEach(button=>button.addEventListener('click',()=>{vibe=button.dataset.vibe;document.querySelectorAll('.date-vibe').forEach(item=>item.classList.toggle('active',item===button));}));
$('date-form').addEventListener('submit',async event=>{event.preventDefault();const title=$('date-title').value.trim();const note=$('date-note').value.trim();const button=$('date-submit');const details={cost:$('date-cost').value,energy:$('date-energy').value,weather:$('date-weather').value,distance:$('date-distance').value,duration:$('date-duration').value};setButtonBusy(button,true,'saving…');try{await data.addTo('dates',{title,note,vibe,...details,addedBy:viewer,favorite:false,done:false,createdAt:Date.now()});void data.notify(other,{title:'new date idea ✦',body:title,url:`dates.html`,kind:'date'});event.target.reset();toast('saved for later ✦');}catch(_){showFailure('the idea escaped.','check the internet and save it again.');}finally{setButtonBusy(button,false);}});
$('pick-random').addEventListener('click',event=>{const filters={cost:$('filter-cost').value,energy:$('filter-energy').value,weather:$('filter-weather').value,distance:$('filter-distance').value,duration:$('filter-duration').value};// The 26 imported ideas predate these five fields, so an exact match excludes
// every one of them the moment a filter leaves "any" — the roulette said
// "nothing matches" with a full pile behind it. Tagged ideas still win; the
// untagged ones are the fallback rather than the exclusion.
const chosen=Object.entries(filters).filter(([,value])=>value!=='any');
const tagged=idea=>chosen.every(([key,value])=>idea[key]===value);
const untagged=idea=>chosen.every(([key])=>!idea[key]);
const pool=ideas.filter(idea=>!idea.done);
const available=pool.filter(tagged).length?pool.filter(tagged):pool.filter(untagged);
if(!available.length){$('random-date').textContent='nothing matches that exact mood.';return;}event.currentTarget.classList.remove('is-picking');void event.currentTarget.offsetWidth;event.currentTarget.classList.add('is-picking');const idea=available[Math.floor(Math.random()*available.length)];$('random-date').innerHTML=`<strong>${escapeHtml(idea.title)}</strong>${idea.note?`<span>${escapeHtml(idea.note)}</span>`:''}`;});
$('date-more').addEventListener('click',()=>{viewLimit+=8;render();});
$('date-list').addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button)return;const idea=ideas.find(item=>item.id===button.closest('[data-id]')?.dataset.id);if(!idea)return;button.disabled=true;try{if(button.dataset.action==='favorite')await data.updateIn('dates',idea.id,{favorite:!idea.favorite});else if(button.dataset.action==='complete'){await data.updateIn('dates',idea.id,{done:!idea.done,doneAt:idea.done?0:Date.now()});toast(idea.done?'back in the pile':'date completed. historic.');}else if(button.dataset.action==='delete')await data.removeFrom('dates',idea.id);}catch(_){showFailure('that edit did not stick.','check the internet and tap it again.');button.disabled=false;}});

function importLegacyIdeas(){
  if(migrationStarted||!data)return;
  migrationStarted=true;
  // The unsubscribe used to be called from inside the callback that assigned
  // it, so a fast first snapshot left the listener attached and the import
  // could run twice.
  let handled=false;
  let stop=()=>{};
  stop=data.listenTo('migrations',async records=>{
    if(handled)return;
    handled=true;
    queueMicrotask(()=>stop());
    if(records.some(record=>record.id===LEGACY_MIGRATION_ID))return;
    try{
      // Only write the ideas that are genuinely absent. The marker write can
      // fail (both phones opening this page at once race for it, and the rules
      // allow create but not update), and a retry used to reset every star and
      // every "we did this" back to the shipped defaults.
      const existing=new Set((await data.readOnce('dates')).map(idea=>idea.id));
      const missing=LEGACY_DATE_IDEAS.filter(([slug])=>!existing.has(`old-list-${slug}`));
      await Promise.all(missing.map(([slug,title,ideaVibe,done])=>{
        const index=LEGACY_DATE_IDEAS.findIndex(entry=>entry[0]===slug);
        return data.setTo('dates',`old-list-${slug}`,{title,note:'',vibe:ideaVibe,addedBy:'him',favorite:false,done,doneAt:done?LEGACY_CREATED_AT-index*1000:0,imported:true,createdAt:LEGACY_CREATED_AT-index*1000});
      }));
      if(missing.length)toast('the old date list moved in ✦');
      // The ideas are in. A failed marker only costs one wasted read next time.
      await data.setTo('migrations',LEGACY_MIGRATION_ID,{done:true,count:LEGACY_DATE_IDEAS.length,importedAt:Date.now()}).catch(()=>{});
    }catch(_){migrationStarted=false;handled=false;showFailure('the old date list did not move in.','check the internet, then reopen this page.');}
  });
}

function render(){
  const finished=ideas.filter(idea=>idea.done).length;const left=ideas.length-finished;
  $('date-count').textContent=finished?`${left} left · ${finished} done`:`${ideas.length} saved`;
  $('date-empty').hidden=ideas.length>0;
  const visible=ideas.slice(0,viewLimit);
  $('date-list').innerHTML=visible.map(idea=>`<article class="date-idea-card${idea.favorite?' favorite':''}${idea.done?' done':''}" data-id="${escapeHtml(idea.id)}"><div class="date-idea-top"><span>${escapeHtml(idea.vibe||'idea')}</span><div class="date-actions"><button data-action="favorite" aria-label="${idea.favorite?'Unfavorite':'Favorite'}">${idea.favorite?'★':'☆'}</button><button data-action="delete" aria-label="Delete">×</button></div></div><h3>${escapeHtml(idea.title)}</h3>${idea.note?`<p>${escapeHtml(idea.note)}</p>`:''}<div class="date-tags">${[idea.cost,idea.energy,idea.weather,idea.distance,idea.duration].filter(Boolean).map(value=>`<span>${escapeHtml(value)}</span>`).join('')}</div><div class="date-idea-foot"><small>added by ${escapeHtml(personName(idea.addedBy))}</small><button class="date-done-toggle" data-action="complete" type="button">${idea.done?'undo':'did it ✓'}</button></div>${idea.done?'<span class="date-complete-badge">we did this</span>':''}</article>`).join('');
  $('date-more').hidden=visible.length>=ideas.length;
  $('date-more').textContent=`show ${Math.min(8,ideas.length-visible.length)} more`;
}
window.addEventListener('littlelist:profile',render);
