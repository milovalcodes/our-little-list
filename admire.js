import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, showFailure, toast } from './ui-helpers.js';
import { cachedProfile, personName } from './profile-store.js';
import { timeAgo } from './time-format.js';

const $=id=>document.getElementById(id);
const buckets={notes:[],statuses:[],locations:[],items:[],dates:[],presence:[],reactions:[]};let data;let started=false;let map;let marker;
data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));
if(data.mode==='local')setupAuthUI(data,{local:true});

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const viewer=await awaitViewer();
if(!viewer){showNotAMember();await new Promise(()=>{});}
const other=partnerOf(viewer);

applyViewerTheme(viewer);document.body.classList.add(other==='her'?'admiring-sun':'admiring-moon');document.querySelector('.back-to-side').href=`${viewer}.html`;
setIdentity();initializeMap();
start();

function start(){if(started)return;started=true;['notes','statuses','locations','items','dates','presence','reactions'].forEach(name=>data.listenTo(name,items=>{buckets[name]=items;render();}));window.setInterval(render,30000);}
$('admire-notes').addEventListener('click',async event=>{const button=event.target.closest('[data-note-reaction]');if(!button)return;const targetId=button.dataset.noteReaction;const id=`note-${targetId}-${viewer}`;const existing=buckets.reactions.find(item=>item.id===id||(item.targetType==='note'&&item.targetId===targetId&&item.by===viewer));button.disabled=true;try{if(existing?.emoji===button.dataset.emoji){await data.removeFrom('reactions',existing.id||id);toast('reaction removed');}else{await data.setTo('reactions',id,{targetType:'note',targetId,by:viewer,to:other,emoji:button.dataset.emoji,createdAt:Date.now()});void data.notify(other,{title:`${personName(viewer)} reacted ${button.dataset.emoji}`,body:'to your note',url:'admire.html',kind:'reaction'});toast(`reacted ${button.dataset.emoji}`);}}catch(_){showFailure('that reaction did not stick.','check the internet and try again.');button.disabled=false;}});

function setIdentity(){const profile=cachedProfile();const customName=other==='her'?profile.sunName:profile.moonName;const celestial=other==='her'?'sun':'moon';const displayName=customName||`the ${celestial}`;const possessive=customName?`${customName}${customName.toLowerCase().endsWith('s')?'’':'’s'}`:`the ${celestial}'s`;$('admire-face').src=other==='her'?'sun-profile.png':'moon-profile.png';$('admire-kicker').textContent=`the ${celestial} report`;$('admire-title').textContent=`Admire ${displayName}`;$('admire-map-title').textContent=`${possessive} location`;document.title=`Admire ${displayName} · Our Little List`;}

function render(){setIdentity();renderStatus();renderPresence();renderLocation();renderNotes();renderAdditions();}

function renderStatus(){const status=buckets.statuses.find(item=>item.id===other||item.person===other)||{};const labels={online:'around',away:'afk-ish',dnd:'busy',invisible:'lurking'};const expired=status.expiresAt&&Number(status.expiresAt)<Date.now();const arrival=status.arrival&&Date.now()-Number(status.arrivalAt||0)<4*3600000?`<p class="status-arrival">↗ ${escapeHtml(status.arrival)}</p>`:'';const reacts=buckets.reactions.filter(reaction=>reaction.targetType==='status'&&reaction.targetId===other).map(reaction=>reaction.emoji).join(' ');$('admire-state-dot').className=`admire-state-dot state-${status.state||'invisible'}`;$('admire-status').innerHTML=status.text&&!expired?`<strong>${escapeHtml(status.emoji||'✦')} ${escapeHtml(status.category||'currently')}</strong><p>${escapeHtml(status.text)}</p><small>${escapeHtml(labels[status.state]||'somewhere')} · ${escapeHtml(status.energy||'functioning')}</small>${arrival}${reacts?`<small class="reaction-count">${escapeHtml(reacts)}</small>`:''}`:`<strong>${escapeHtml(labels[status.state]||'somewhere')}</strong><p>${escapeHtml(status.energy||'functioning')}</p>${arrival}${reacts?`<small class="reaction-count">${escapeHtml(reacts)}</small>`:''}`;}

function renderPresence(){const presence=buckets.presence.find(item=>item.id===other||item.person===other);if(!presence){$('admire-presence').textContent='no recent sighting.';return;}const age=Date.now()-Number(presence.lastSeenAt||0);$('admire-presence').textContent=age<120000?'here right now.':`here ${timeAgo(presence.lastSeenAt)}.`;}

function renderLocation(){const point=buckets.locations.find(item=>item.id===other||item.person===other);if(!point||!Number.isFinite(point.lat)||!Number.isFinite(point.lng)){$('admire-map').hidden=true;$('admire-map-empty').hidden=false;$('admire-location-age').textContent='no spot yet';if(marker&&map){map.removeLayer(marker);marker=null;}return;}$('admire-map').hidden=false;$('admire-map-empty').hidden=true;const live=Number(point.shareUntil)>Date.now();$('admire-location-age').textContent=live?'live now':`updated ${timeAgo(point.updatedAt)}`;if(!map)return;const latLng=[point.lat,point.lng];const icon=partnerIcon(other,live);if(!marker)marker=window.L.marker(latLng,{icon}).addTo(map);else{marker.setLatLng(latLng);marker.setIcon(icon);}map.setView(latLng,15,{animate:false});window.setTimeout(()=>map.invalidateSize({animate:false}),40);}

function renderNotes(){const notes=buckets.notes.filter(note=>note.sender===other||note.from===other).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5);$('admire-notes-empty').hidden=notes.length>0;$('admire-notes').innerHTML=notes.map(note=>{const mine=buckets.reactions.find(reaction=>reaction.targetType==='note'&&reaction.targetId===note.id&&reaction.by===viewer);return `<article class="admire-feed-row"><span>${{heart:'💛',sun:'☀️',moon:'🌙',star:'✦'}[note.mood]||'💌'}</span><div><p>${escapeHtml(note.body||note.message||'')}</p><small>${timeAgo(note.createdAt)}</small>${mine?`<div class="reaction-display"><b>${escapeHtml(mine.emoji)}</b><span>your reaction · tap it again to undo</span></div>`:''}<div class="quick-reactions">${reactionButton(note.id,'♡',mine)}${reactionButton(note.id,'😭',mine)}${reactionButton(note.id,'🫡',mine)}${reactionButton(note.id,'criminal behavior',mine)}</div></div></article>`;}).join('');}

function reactionButton(targetId,value,current){const active=current?.emoji===value;return `<button class="${active?'active':''}" type="button" data-note-reaction="${escapeHtml(targetId)}" data-emoji="${escapeHtml(value)}" aria-pressed="${active}">${escapeHtml(value)}</button>`;}

function renderAdditions(){const additions=[...buckets.items.filter(item=>item.addedBy===other).map(item=>({at:item.createdAt,icon:item.type==='grocery'?'🛒':'✓',title:item.title,meta:item.done?'done':'on the list'})),...buckets.dates.filter(item=>item.addedBy===other&&!item.imported).map(item=>({at:item.createdAt,icon:'✦',title:item.title,meta:`date idea · ${item.vibe||'for later'}`}))].filter(item=>item.at).sort((a,b)=>b.at-a.at).slice(0,6);$('admire-additions-empty').hidden=additions.length>0;$('admire-additions').innerHTML=additions.map(item=>`<article class="admire-feed-row"><span>${item.icon}</span><div><p>${escapeHtml(item.title||'')}</p><small>${escapeHtml(item.meta)} · ${timeAgo(item.at)}</small></div></article>`).join('');}

function initializeMap(){if(!window.L)return;map=window.L.map('admire-map',{zoomControl:true,attributionControl:true,dragging:true,touchZoom:true,scrollWheelZoom:false}).setView([39.5,-98.35],3);window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:3,updateWhenIdle:true,crossOrigin:true,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);}

function partnerIcon(person,live){const art=person==='her'?'<span class="admire-map-symbol">☀</span>':'<span class="admire-map-symbol">☾</span>';return window.L.divIcon({className:'admire-marker-wrap',html:`<span class="admire-marker ${person} ${live?'live':'last'}">${art}</span>`,iconSize:[48,48],iconAnchor:[24,43]});}
window.addEventListener('littlelist:profile',render);
