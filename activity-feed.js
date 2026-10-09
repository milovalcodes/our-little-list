// A folded history on Home. Notes and their read receipts live only in Notes.

import { escapeHtml, showFailure, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { timeAgo, friendlyWhen } from './time-format.js';
import { newActivityCount } from './activity-summary.js';

export function startActivityFeed({ data, viewer, other }) {
const $=id=>document.getElementById(id);const buckets={items:[],dates:[],statuses:[],help:[],memories:[],reactions:[]};
let started=false;
let expanded=false;
// The "delete for us" confirm used to be stored on the button element itself.
// render() replaces the whole list, and a presence beat alone does that about
// twice a minute, so the second tap kept landing on a fresh button that had
// forgotten the first one — and nothing was ever deleted. Keeping the armed row
// here lets the confirm survive a redraw.
let armedDelete=null;let armedTimer=0;
const seenKey=`our-little-list-seen-${viewer}`;
const hiddenKey=`our-little-list-hidden-activity-${viewer}-v1`;
const hidden=readHidden();

start();
$('mark-seen').addEventListener('click',markSeen);
$('activity-see-all')?.addEventListener('click', () => { expanded=!expanded; render(); });
$('activity-list').addEventListener('click',handleActivityAction);

function start(){
  if(started)return;started=true;
  let openItems=[],recentDone=[];
  const updateItems=()=>{buckets.items=[...openItems,...recentDone];render();};
  data.listenToQuery('items',{where:{field:'done',value:false}},items=>{openItems=items;updateItems();});
  data.listenToQuery('items',{where:{field:'doneAt',op:'>=',value:Date.now()-7*86400000},orderBy:{field:'doneAt',direction:'desc'},limit:50},items=>{recentDone=items;updateItems();});
  ['dates','statuses','help','memories','reactions'].forEach(name=>{
    const receive=items=>{buckets[name]=items;render();};
    if(['memories','reactions'].includes(name))data.listenToQuery(name,{orderBy:{field:'createdAt',direction:'desc'},limit:50},receive);
    else data.listenTo(name,receive);
  });
}

function events(){
  const all=[];
  buckets.items.forEach(item=>{
    all.push({id:`item-${item.id}`,recordId:item.id,collection:'items',at:Number(item.createdAt)||0,icon:item.type==='grocery'?'🛒':'✓',who:item.addedBy,kind:item.type==='grocery'?'put on groceries':'put on the list',text:item.title});
    if(item.done&&item.doneAt)all.push({id:`done-${item.id}`,recordId:item.id,collection:'items',at:Number(item.doneAt),icon:'🫡',who:item.doneBy,kind:'finished',text:item.title});
  });
  buckets.dates.filter(idea=>!idea.imported).forEach(idea=>all.push({id:`date-${idea.id}`,recordId:idea.id,collection:'dates',at:Number(idea.createdAt)||0,icon:'✦',who:idea.addedBy,kind:'saved a date idea',text:idea.title,status:idea.vibe||''}));
  buckets.help.forEach(request=>{
    const timed=Number(request.dueAt)>0;const self=request.from===request.to;all.push({id:`help-${request.id}`,recordId:request.id,collection:'help',at:Number(request.createdAt)||0,icon:request.emoji||(timed?'⏰':'🙋'),who:request.from,kind:self?'set a reminder for themselves':timed?`set a reminder for ${friendlyWhen(request.dueAt)}`:'asked for a hand',selfKind:self?'set a reminder for yourself':timed?`set a reminder for ${friendlyWhen(request.dueAt)}`:'asked for a hand',text:request.title,status:request.state&&request.state!=='open'?`answered: ${request.state==='on-it'?'on it':request.state==='later'?'in a bit':request.state==='cant'?"can't":'sorted'}`:self?'for you':'waiting'});
    if(request.answeredAt)all.push({id:`help-answer-${request.id}-${request.answeredAt}`,recordId:request.id,collection:'help',at:Number(request.answeredAt),icon:request.state==='cant'?'✗':'✓',who:request.to,kind:'answered a request',selfKind:'answered a request',text:request.title});
  });
  buckets.statuses.filter(status=>['manual','custom','arrival','focus'].includes(status.updateKind)).forEach(status=>{
    const kind=status.updateKind;const who=status.person||status.id;const at=Number(status.updatedAt)||0;const base={id:`status-${status.id}-${at}`,recordId:status.id,collection:'statuses',at,who};
    // Focus sessions are statuses with a timer now, and saved spots move the
    // status on their own; each says what actually happened.
    if(kind==='location')all.push({...base,icon:status.locationEmoji||'📍',kind:'changed locations',selfKind:'changed locations',text:status.locationText||'left a saved spot'});
    else if(kind==='arrival')all.push({...base,icon:'↗',kind:'is on the way',selfKind:'are on the way',text:status.arrival||'on the way'});
    else if(kind==='focus')all.push({...base,icon:'⏱',kind:'started focusing',selfKind:'started focusing',text:status.focusLabel||'doing the thing',status:Number(status.focusMinutes)?`${status.focusMinutes} min`:''});
    else if(kind==='focus-end')all.push({...base,icon:'⏱',kind:'finished focusing',selfKind:'finished focusing',text:status.focusLabel||'doing the thing'});
    else all.push({...base,icon:status.emoji||'●',kind:'updated their status',selfKind:'updated your status',text:status.text?`${status.category||'currently'} ${status.text}`:(status.state||'updated')});
  });
  buckets.memories.forEach(item=>all.push({id:`memory-${item.id}`,recordId:item.id,collection:'memories',at:Number(item.createdAt)||0,icon:'◒',who:item.addedBy,kind:'added to the memory jar',text:item.text}));
  buckets.reactions.forEach(item=>all.push({id:`reaction-${item.id}`,recordId:item.id,collection:'reactions',at:Number(item.createdAt)||0,icon:item.emoji||'♡',who:item.by,kind:'reacted',text:item.targetType==='status'?'to a status':'to a note'}));
  return all.filter(item=>item.at&&item.who===other&&!hidden.has(item.id)).sort((a,b)=>b.at-a.at).slice(0,80);
}

function render(){
  const newCount=newActivityCount(buckets,viewer,other,Number(localStorage.getItem(seenKey)||0));
  $('new-count').hidden=newCount===0;if($('mark-seen'))$('mark-seen').hidden=newCount===0;
  $('new-count').textContent=newCount>9?'9+':String(newCount);
  const list=events();$('activity-empty').hidden=list.length>0;
  const more=$('activity-see-all');more.hidden=list.length<=3;more.textContent=expanded?'show less':'see all';
  $('activity-list').innerHTML=(expanded?list:list.slice(0,3)).map(event=>{const mine=event.who===viewer;const canDelete=mine||event.collection!=='statuses';return `<li class="activity-row" data-event-id="${escapeHtml(event.id)}" data-record-id="${escapeHtml(event.recordId)}" data-collection="${escapeHtml(event.collection)}"><span class="activity-icon">${escapeHtml(event.icon)}</span><div class="activity-row-copy"><p><b>${mine?'you':escapeHtml(event.who?personName(event.who):'someone')}</b> ${escapeHtml(mine&&event.selfKind?event.selfKind:event.kind)}</p><strong>${escapeHtml(event.text||'')}</strong><small>${timeAgo(event.at)}${event.status?` · ${escapeHtml(event.status)}`:''}</small><div class="activity-row-actions"><button type="button" data-action="hide">delete for me</button>${canDelete?'<button class="delete-for-us" type="button" data-action="delete">delete for us</button>':''}</div></div><button class="row-more" type="button" aria-label="More options" data-toggle-row-menu>⋯</button></li>`;}).join('');
  showArmedDelete();
}

// Re-applies the pending confirm after a redraw, and clears it from the row it
// was on when it expires.
function showArmedDelete(){
  [...$('activity-list').children].forEach(row=>{
    const button=row.querySelector('[data-action="delete"]');
    if(!button||button.disabled)return;
    const armed=row.dataset.eventId===armedDelete;
    button.textContent=armed?'tap again to delete for us':'delete for us';
    button.classList.toggle('confirming',armed);
  });
}
function armDelete(eventId){
  armedDelete=eventId;
  window.clearTimeout(armedTimer);
  armedTimer=window.setTimeout(()=>{armedDelete=null;showArmedDelete();},4000);
  showArmedDelete();
}
function disarmDelete(){armedDelete=null;window.clearTimeout(armedTimer);}

async function handleActivityAction(event){
  const button=event.target.closest('[data-action]');if(!button)return;const row=button.closest('[data-event-id]');if(!row)return;
  if(button.dataset.action==='hide'){hidden.add(row.dataset.eventId);saveHidden();row.classList.add('is-removing');window.setTimeout(render,180);toast('gone from your feed');return;}
  if(armedDelete!==row.dataset.eventId){armDelete(row.dataset.eventId);return;}
  disarmDelete();
  button.disabled=true;button.textContent='deleting…';
  try{
    await data.removeFrom(row.dataset.collection,row.dataset.recordId);
    if(row.dataset.collection==='memories')await data.removeFrom('memoryPhotos',row.dataset.recordId);
    if(data.mode==='local'&&row.dataset.collection!=='items')buckets[row.dataset.collection]=buckets[row.dataset.collection].filter(item=>item.id!==row.dataset.recordId);
    toast('deleted for both of you');render();
  }catch(_){showFailure('that did not delete.','check the internet and try again.');button.disabled=false;button.textContent='delete for us';button.classList.remove('confirming');}
}

function readHidden(){try{return new Set(JSON.parse(localStorage.getItem(hiddenKey))||[]);}catch(_){return new Set();}}
function saveHidden(){localStorage.setItem(hiddenKey,JSON.stringify([...hidden].slice(-500)));}

function markSeen(){localStorage.setItem(seenKey,String(Date.now()));$('mark-seen').textContent='all seen ✓';render();window.setTimeout(()=>$('mark-seen').textContent='mark all seen',1600);}
window.addEventListener('littlelist:profile',render);

}
