// The map half of status.html. Tracking itself lives in auto-location.js so it
// keeps working while either person uses any page in the PWA.

import { sharedLayer } from './data-hub.js';
import { awaitViewer } from './viewer.js';
import { pauseAutoLocation, resumeAutoLocation, locationSnapshot } from './auto-location.js';
import { escapeHtml, setButtonBusy, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';

const byId=id=>document.getElementById(id);
let locations=[];
let viewer;
let map;
let state=locationSnapshot();
let lastMapLocations=[];
let lastFrameSignature='';
let mapWasMoved=false;
let framingMap=false;
const markers={};

const data=await sharedLayer();
viewer=await awaitViewer();
if(!viewer)await new Promise(()=>{});

initializeMap();
data.listenTo('locations',items=>{locations=items;render();});
window.addEventListener('littlelist:location-state',event=>{state=event.detail||locationSnapshot();renderControl();});

byId('location-action')?.addEventListener('click',async event=>{
  const button=event.currentTarget;
  if(['live','starting','retrying','offline'].includes(state.phase)){
    setButtonBusy(button,true,'pausing…');
    await pauseAutoLocation();
    toast('location paused. stealth mode.');
  }else{
    setButtonBusy(button,true,'finding you…');
    await resumeAutoLocation();
  }
  setButtonBusy(button,false);
  state=locationSnapshot();renderControl();
});

byId('hide-last-location')?.addEventListener('click',async event=>{
  setButtonBusy(event.currentTarget,true,'hiding…');
  await pauseAutoLocation({removeSpot:true});
  setButtonBusy(event.currentTarget,false);
  toast('last spot deleted');
});

byId('recenter-map')?.addEventListener('click',()=>{
  mapWasMoved=false;byId('recenter-map').hidden=true;frameLocations(lastMapLocations,true);
});

function render(){
  renderControl();
  const now=Date.now();
  const known=locations.filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lng));
  const active=known.filter(item=>Number(item.shareUntil)>now);
  const her=active.find(item=>item.id==='her');const him=active.find(item=>item.id==='him');
  const knownHer=known.find(item=>item.id==='her');const knownHim=known.find(item=>item.id==='him');

  updateMap(known,now);renderLastKnown(known,active);
  byId('hide-last-location').hidden=!known.some(item=>item.id===viewer);

  if(!known.length){setProximity('waiting for a first spot','the map is currently just vibes.','orbit pending');byId('map-updated').textContent='no spots yet';return;}
  const newest=Math.max(...known.map(item=>Number(item.updatedAt)||0));
  byId('map-updated').textContent=newest?`updated ${timeAgo(newest)}`:'last known';
  if(her&&him){renderLiveDistance(her,him);return;}
  if(knownHer&&knownHim){const meters=distanceMeters(knownHer,knownHim);setProximity('last known orbit',`${friendlyDistance(meters)} apart at the last update.`,'old news');return;}
  const live=her||him;
  if(live){const missing=live.id==='her'?'him':'her';setProximity(`waiting for ${personName(missing)}`,`${personName(live.id)} is live on the map.`,'one phone online');return;}
  setProximity('last known only','open the app on either phone to go live again.','both offline');
}

function renderControl(){
  const labels={live:'location on',starting:'finding you',retrying:'trying again',offline:'waiting for internet',paused:'location paused',blocked:'location blocked',unavailable:'not available',error:'could not locate',preview:'preview mode',loading:'starting'};
  const active=['live','starting','retrying','offline'].includes(state.phase);
  byId('location-state').textContent=labels[state.phase]||'location';
  byId('location-state-dot').className=`now-location-dot ${active?'is-live':state.phase==='blocked'||state.phase==='error'?'is-error':''}`;
  byId('location-note').textContent=state.detail||(active?'updating while the app is open':'tap to turn it back on');
  byId('location-action').textContent=active?'pause':'turn on';
  byId('location-action').classList.toggle('is-pause',active);
}

function renderLiveDistance(her,him){
  const meters=distanceMeters(her,him);const friendly=friendlyDistance(meters);
  if(meters<=75)setProximity('together at last :)',`${friendly} apart.`,'made it');
  else if(meters<=500)setProximity('almost together',`${friendly} to go.`,'so close');
  else if(meters<=2000)setProximity('getting closer',`${friendly} between you.`,'on the way');
  else if(meters<=10000)setProximity('on the way',`${friendly} between you.`,'getting there');
  else setProximity('same planet, technically',`${friendly} between you.`,'for now');
}

function renderLastKnown(known,active){
  byId('last-known-row').innerHTML=['her','him'].map(person=>{
    const name=escapeHtml(personName(person));const point=known.find(item=>item.id===person);
    if(!point)return `<span class="known-pill missing"><b>${name}</b> no spot yet</span>`;
    const live=active.some(item=>item.id===person);
    return `<span class="known-pill ${live?'live':'last'}"><b>${name}</b> ${live?'live now':`last seen ${escapeHtml(timeAgo(point.updatedAt))}`}</span>`;
  }).join('');
}

function setProximity(message,detail,label){byId('proximity-message').textContent=message;byId('proximity-detail').textContent=detail;byId('distance-label').textContent=label;}

function initializeMap(){
  if(!window.L){byId('couple-map').innerHTML='<p class="map-fallback">map tiles took the day off. the location text still works.</p>';return;}
  const node=byId('couple-map');
  map=window.L.map(node,{zoomControl:false,attributionControl:true,dragging:true,touchZoom:true,bounceAtZoomLimits:false}).setView([39.5,-98.35],3);
  window.L.control.zoom({position:'bottomright'}).addTo(map);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:4,updateWhenIdle:true,crossOrigin:true,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const moved=()=>{if(framingMap)return;mapWasMoved=true;byId('recenter-map').hidden=lastMapLocations.length===0;};
  map.on('dragstart',moved);map.on('zoomstart',moved);
  const resize=()=>window.requestAnimationFrame(()=>map?.invalidateSize({animate:false,pan:false}));
  resize();window.setTimeout(resize,250);window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.setTimeout(resize,100);});
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(node);
}

function updateMap(known,now){
  if(!map)return;lastMapLocations=known;
  ['her','him'].forEach(person=>{
    const point=known.find(item=>item.id===person);
    if(!point){if(markers[person]){map.removeLayer(markers[person]);delete markers[person];}return;}
    const live=Number(point.shareUntil)>now;const label=live?personName(person):`${personName(person)} · last known`;
    if(!markers[person]){markers[person]=window.L.marker([point.lat,point.lng],{icon:markerIcon(person,live)}).addTo(map).bindTooltip(label,{direction:'top',offset:[0,-42]});markers[person].isLive=live;}
    else{markers[person].setLatLng([point.lat,point.lng]);if(markers[person].isLive!==live){markers[person].setIcon(markerIcon(person,live));markers[person].isLive=live;}markers[person].setTooltipContent(label);}
  });
  const signature=known.map(point=>`${point.id}:${Number(point.lat).toFixed(5)}:${Number(point.lng).toFixed(5)}`).sort().join('|');
  if(!mapWasMoved&&signature!==lastFrameSignature)frameLocations(known,Boolean(lastFrameSignature));
  lastFrameSignature=signature;if(!known.length)byId('recenter-map').hidden=true;
}

function frameLocations(known,animate=false){
  if(!map||!known.length)return;framingMap=true;map.stop();
  if(known.length===1)map.setView([known[0].lat,known[0].lng],15,{animate});
  else map.fitBounds(window.L.latLngBounds(known.map(point=>[point.lat,point.lng])).pad(.35),{maxZoom:17,animate});
  window.setTimeout(()=>{framingMap=false;},animate?400:50);
}

function markerIcon(person,live){
  const art=person==='her'
    ?'<svg class="map-character" viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.8"><path d="M24 3v5M24 40v5M3 24h5M40 24h5M9.2 9.2l3.6 3.6M35.2 35.2l3.6 3.6M38.8 9.2l-3.6 3.6M12.8 35.2l-3.6 3.6"/></g><circle cx="24" cy="24" r="13.5" fill="#ffd45e" stroke="currentColor" stroke-width="2"/><path d="M17.2 23c1.3-1.2 3.2-1.2 4.5 0M26.3 23c1.3-1.2 3.2-1.2 4.5 0M20 28.2c2.5 2.2 5.5 2.2 8 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>'
    :'<svg class="map-character" viewBox="0 0 48 48" aria-hidden="true"><path d="M33.8 6.2c-8.7 1.3-15.3 8.8-15.3 17.8 0 9.1 6.7 16.6 15.5 17.8A19 19 0 1 1 33.8 6.2Z" fill="#cbd4ff" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M15.3 21.8c1.3-1.1 3.1-1.1 4.4 0M14.7 20l-1.5-1M20.3 20l1.5-1M14.7 27.6c1.8 1.7 3.9 1.7 5.7 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/><circle cx="35.8" cy="13" r="1.25" fill="#fff3bd"/><circle cx="39" cy="19" r=".8" fill="#fff3bd"/></svg>';
  return window.L.divIcon({className:'couple-marker-wrap',html:`<span class="couple-marker ${person} ${live?'live':'last-known'}">${art}</span>`,iconSize:[52,52],iconAnchor:[26,48]});
}

function distanceMeters(a,b){const r=6371000;const lat1=a.lat*Math.PI/180;const lat2=b.lat*Math.PI/180;const dLat=(b.lat-a.lat)*Math.PI/180;const dLng=(b.lng-a.lng)*Math.PI/180;const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return r*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function friendlyDistance(meters){if(meters<1000)return`${Math.max(1,Math.round(meters))} m`;const km=meters/1000;return`${km<10?km.toFixed(1):Math.round(km)} km`;}

renderControl();
window.setInterval(render,15000);
window.addEventListener('littlelist:profile',render);
