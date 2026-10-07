// The map half of status.html. Tracking itself lives in auto-location.js so it
// keeps working while either person uses any page in the PWA.

import { sharedLayer } from './data-hub.js';
import { awaitViewer } from './viewer.js';
import { pauseAutoLocation, resumeAutoLocation, locationSnapshot } from './auto-location.js';
import { escapeHtml, setButtonBusy, toast } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';
import { orbitLine } from './availability.js';
import { setupTrip, updateTrip } from './trip.js';

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

// Tiles: OpenStreetMap's own, the source this map always used. On the moon
// page they are darkened with a CSS filter rather than a second tile service:
// a free third-party style started answering with an "API key needed" picture,
// which loads like a normal tile, so no error handler can catch it.
const TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const VIEW_KEY='our-little-list-map-view-v1';
const TOGETHER_PX=46;          // closer than this on screen and the markers would overlap
const GLIDE_MS=700;
const FRAME_PAD={top:72,left:44,right:62,bottom:30};
const GLIDE_MAX_M=5000;        // farther than this is a new place, not a walk: jump
const accuracyRings={};
let orbitLineLayer=null;
let tiles=null;
// The moon page is dark navy whatever the phone's own setting is.
const darkPage=()=>document.body.classList.contains('him-theme');
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');

const data=await sharedLayer();
viewer=await awaitViewer();
if(!viewer)await new Promise(()=>{});

initializeMap();
setupTrip(viewer);
data.listenTo('locations',items=>{locations=items;render();});
// auto-location.js boots while this module is still evaluating, so its first
// emit can land before the listener exists. renderControl reads the live
// snapshot instead of trusting that we heard about it.
window.addEventListener('littlelist:location-state',()=>renderControl());

byId('location-action')?.addEventListener('click',async event=>{
  const button=event.currentTarget;
  state=locationSnapshot();
  if(['live','starting','retrying','offline'].includes(state.phase)){
    byId('pause-choices').hidden=!byId('pause-choices').hidden;
    return;
  }else{
    setButtonBusy(button,true,'finding you…');
    await resumeAutoLocation();
  }
  setButtonBusy(button,false);
  renderControl();
});

byId('pause-choices')?.addEventListener('click',async event=>{
  const choice=event.target.closest('[data-pause]');if(!choice)return;
  const minutes=Number(choice.dataset.pause)||0;
  byId('pause-choices').hidden=true;
  const button=byId('location-action');
  setButtonBusy(button,true,'pausing…');
  await pauseAutoLocation({minutes});
  setButtonBusy(button,false);
  toast(minutes?`paused for ${minutes/60} hour${minutes===60?'':'s'} · back on by itself`:'location paused until you turn it on');
  renderControl();
});

byId('hide-last-location')?.addEventListener('click',async event=>{
  setButtonBusy(event.currentTarget,true,'hiding…');
  await pauseAutoLocation({removeSpot:true});
  setButtonBusy(event.currentTarget,false);
  // Deleting the spot has to stop the sharing too, or the next fix puts it
  // straight back. Say so, rather than leaving sharing quietly off.
  toast('last spot deleted · sharing paused');
});

byId('recenter-map')?.addEventListener('click',()=>{
  mapWasMoved=false;byId('recenter-map').hidden=true;frameLocations(lastMapLocations,true);
});

function render(){
  renderControl();
  const now=Date.now();
  const known=locations.filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lng));
  const mapCard=document.querySelector('.now-location-card');
  const hadMap=mapCard.classList.contains('has-map');
  mapCard.classList.toggle('has-map',known.length>0);
  if(!hadMap&&known.length)window.setTimeout(()=>map?.invalidateSize({animate:false,pan:false}),80);
  const active=known.filter(item=>Number(item.shareUntil)>now);
  const her=active.find(item=>item.id==='her');const him=active.find(item=>item.id==='him');
  const knownHer=known.find(item=>item.id==='her');const knownHim=known.find(item=>item.id==='him');

  updateMap(known,now);renderLastKnown(known,active);updateTrip(known);
  const hideButton=byId('hide-last-location');
  if(hideButton)hideButton.hidden=!known.some(item=>item.id===viewer);

  if(!known.length){setProximity('waiting for a first spot','the map is currently just vibes.','orbit pending');byId('map-updated').textContent='no spots yet';return;}
  const newest=Math.max(...known.map(item=>Number(item.updatedAt)||0));
  byId('map-updated').textContent=newest?`updated ${timeAgo(newest)}`:'last known';
  if(her&&him){renderLiveDistance(her,him);return;}
  if(knownHer&&knownHim){const line=orbitLine(knownHer,knownHim);const partner=known.find(item=>item.id!==viewer);const stale=partner&&Number(partner.shareUntil)<=now;setProximity(line.title,`${line.detail}.${stale?` ${personName(partner.id)} updates when they open the app.`:''}`,line.kicker);return;}
  const live=her||him;
  if(live){const missing=live.id==='her'?'him':'her';setProximity(`waiting for ${personName(missing)}`,`${personName(live.id)} is live on the map.`,'one phone online');return;}
  setProximity('last known only','open the app on either phone to go live again.','both offline');
}

function renderControl(){
  state=locationSnapshot();
  const labels={live:'location on',starting:'finding you',retrying:'trying again',offline:'waiting for internet',paused:'location paused','needs-permission':'location is off',blocked:'location blocked',unavailable:'not available',error:'could not locate',preview:'preview mode',loading:'starting'};
  const active=['live','starting','retrying','offline'].includes(state.phase);
  byId('location-state').textContent=labels[state.phase]||'location';
  byId('location-state-dot').className=`now-location-dot ${active?'is-live':state.phase==='blocked'||state.phase==='error'?'is-error':''}`;
  byId('location-note').textContent=state.detail||(active?'updating while the app is open':'tap to turn it back on');
  byId('location-action').textContent=active?'pause':'turn on';
  byId('location-action').classList.toggle('is-pause',active);
}

function renderLiveDistance(her,him){
  const line=orbitLine(her,him);
  setProximity(line.title,`${line.detail}.`,line.kicker);
}


function renderLastKnown(known,active){
  byId('last-known-row').innerHTML=['her','him'].map(person=>{
    const name=escapeHtml(personName(person));const point=known.find(item=>item.id===person);
    if(!point)return `<span class="known-pill missing"><b>${name}</b> no spot yet</span>`;
    const live=active.some(item=>item.id===person);
    const place=point.placeLabel?` · ${escapeHtml(point.placeEmoji||'📍')} ${escapeHtml(point.placeLabel)}`:'';
    return `<span class="known-pill ${live?'live':'last'}"><b>${name}</b> ${live?'live now':`last seen ${escapeHtml(timeAgo(point.updatedAt))}`}${place}${!live&&person!==viewer?`<small>updates when ${name} opens the app</small>`:''}</span>`;
  }).join('');
}

function setProximity(message,detail,label){byId('proximity-message').textContent=message;byId('proximity-detail').textContent=detail;byId('distance-label').textContent=label;}


function setTiles(){
  if(!map)return;
  if(!tiles)tiles=window.L.tileLayer(TILE_URL,{maxZoom:19,keepBuffer:4,updateWhenIdle:true,crossOrigin:true,attribution:ATTRIBUTION}).addTo(map);
  byId('couple-map').classList.toggle('is-dark-tiles',darkPage());
}

// Open where the map was last time (or on this phone's own last spot) rather
// than on the whole country, which then lurched to the real spot.
function startingView(){
  try{const saved=JSON.parse(localStorage.getItem(VIEW_KEY)||'null');if(saved&&Number.isFinite(saved.lat)&&Number.isFinite(saved.lng)&&Number.isFinite(saved.zoom))return saved;}catch(_){}
  const mine=locationSnapshot();
  if(Number.isFinite(mine.lat)&&Number.isFinite(mine.lng))return {lat:mine.lat,lng:mine.lng,zoom:15};
  return {lat:39.5,lng:-98.35,zoom:3};
}
function rememberView(){
  if(!map)return;
  try{const c=map.getCenter();localStorage.setItem(VIEW_KEY,JSON.stringify({lat:c.lat,lng:c.lng,zoom:map.getZoom()}));}catch(_){}
}

function initializeMap(){
  if(!window.L){byId('couple-map').innerHTML='<p class="map-fallback">map tiles took the day off. the location text still works.</p>';return;}
  const node=byId('couple-map');
  const start=startingView();
  map=window.L.map(node,{zoomControl:false,attributionControl:true,dragging:true,touchZoom:true,bounceAtZoomLimits:false,zoomSnap:.5,wheelPxPerZoomLevel:90}).setView([start.lat,start.lng],start.zoom);
  map.attributionControl.setPrefix(false);
  window.L.control.zoom({position:'bottomright'}).addTo(map);
  setTiles();
  // The page theme can be applied after the map starts; follow it when it lands.
  new MutationObserver(setTiles).observe(document.body,{attributes:true,attributeFilter:['class']});
  const moved=()=>{if(framingMap)return;mapWasMoved=true;byId('recenter-map').hidden=lastMapLocations.length===0;};
  map.on('dragstart',moved);map.on('zoomstart',moved);
  map.on('zoomend',()=>{spreadMarkers();rememberView();});
  map.on('moveend',rememberView);
  const resize=()=>window.requestAnimationFrame(()=>{map?.invalidateSize({animate:false,pan:false});spreadMarkers();});
  resize();window.setTimeout(resize,250);window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.setTimeout(resize,100);});
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(node);
}

function updateMap(known,now){
  if(!map)return;lastMapLocations=known;
  ['her','him'].forEach(person=>{
    const point=known.find(item=>item.id===person);
    if(!point){
      if(markers[person]){map.removeLayer(markers[person]);delete markers[person];}
      if(accuracyRings[person]){map.removeLayer(accuracyRings[person]);delete accuracyRings[person];}
      return;
    }
    const live=Number(point.shareUntil)>now;const label=escapeHtml(live?personName(person):`${personName(person)} · last known`);
    const target=[point.lat,point.lng];
    if(!markers[person]){
      const marker=window.L.marker(target,{icon:markerIcon(person,live),keyboard:true,title:live?personName(person):`${personName(person)}, last known`,zIndexOffset:live?500:0}).addTo(map).bindTooltip(label,{direction:'top',offset:[0,-42]});
      // Touch screens have no hover, so a tap shows the name instead.
      marker.on('click',()=>marker.toggleTooltip());
      marker.isLive=live;marker.spread=0;markers[person]=marker;
    }else{
      glideMarker(markers[person],target);
      if(markers[person].isLive!==live){markers[person].isLive=live;markers[person].setZIndexOffset(live?500:0);setMarkerIcon(person);}
      markers[person].setTooltipContent(label);
    }
    updateAccuracy(person,point,live);
  });
  updateOrbitLine(known);
  spreadMarkers();
  const signature=known.map(point=>`${point.id}:${Number(point.lat).toFixed(5)}:${Number(point.lng).toFixed(5)}`).sort().join('|');
  if(!mapWasMoved&&signature!==lastFrameSignature&&needsReframe(known))frameLocations(known,Boolean(lastFrameSignature));
  lastFrameSignature=signature;if(!known.length)byId('recenter-map').hidden=true;
}

// A soft circle for how sure the phone is about a live spot. Tiny ones are
// noise; very large ones would swamp the map, so they are capped.
function updateAccuracy(person,point,live){
  const radius=Number(point.accuracy)||0;
  const show=live&&radius>=25;
  if(!show){if(accuracyRings[person]){map.removeLayer(accuracyRings[person]);delete accuracyRings[person];}return;}
  const style={radius:Math.min(radius,1500),stroke:true,weight:1,opacity:.45,fillOpacity:.12,className:`accuracy-ring ${person}`,interactive:false};
  if(!accuracyRings[person])accuracyRings[person]=window.L.circle([point.lat,point.lng],style).addTo(map);
  else{accuracyRings[person].setLatLng([point.lat,point.lng]);accuracyRings[person].setRadius(style.radius);}
}

// A dashed line between the two of you, only when you are apart.
function updateOrbitLine(known){
  const her=known.find(item=>item.id==='her');const him=known.find(item=>item.id==='him');
  const apart=her&&him&&distanceMeters(her,him)>150;
  if(!apart){if(orbitLineLayer){map.removeLayer(orbitLineLayer);orbitLineLayer=null;}return;}
  const points=[[her.lat,her.lng],[him.lat,him.lng]];
  if(!orbitLineLayer)orbitLineLayer=window.L.polyline(points,{className:'orbit-line',weight:2.5,opacity:.7,dashArray:'2 9',lineCap:'round',interactive:false}).addTo(map);
  else orbitLineLayer.setLatLngs(points);
}

// Side by side, not stacked: when both markers would overlap on screen, nudge
// them apart in pixels. Their real spots stay exactly where they are.
function spreadMarkers(){
  if(!map)return;
  const her=markers.her;const him=markers.him;
  let spread=0;
  if(her&&him){
    const a=map.latLngToContainerPoint(her.getLatLng());const b=map.latLngToContainerPoint(him.getLatLng());
    if(a.distanceTo(b)<TOGETHER_PX)spread=1;
  }
  ['her','him'].forEach(person=>{const marker=markers[person];if(marker&&marker.spread!==spread){marker.spread=spread;setMarkerIcon(person);}});
}

function setMarkerIcon(person){
  const marker=markers[person];if(!marker)return;
  const shift=marker.spread?(person==='her'?22:-22):0;
  marker.setIcon(markerIcon(person,marker.isLive,shift));
}

function glideMarker(marker,target){
  const from=marker.getLatLng();
  const to=window.L.latLng(target);
  if(from.equals(to))return;
  if(marker.glide)window.cancelAnimationFrame(marker.glide);
  if(reducedMotion?.matches||document.hidden||from.distanceTo(to)>GLIDE_MAX_M){marker.setLatLng(to);spreadMarkers();return;}
  const started=performance.now();
  const step=time=>{
    const t=Math.min(1,(time-started)/GLIDE_MS);const ease=1-Math.pow(1-t,3);
    const at=window.L.latLng(from.lat+(to.lat-from.lat)*ease,from.lng+(to.lng-from.lng)*ease);
    marker.setLatLng(at);
    if(t<1)marker.glide=window.requestAnimationFrame(step);else{marker.glide=0;spreadMarkers();}
  };
  marker.glide=window.requestAnimationFrame(step);
}

function distanceMeters(a,b){return window.L.latLng(a.lat,a.lng).distanceTo([b.lat,b.lng]);}

function framingFor(known){
  if(known.length===1)return {center:window.L.latLng(known[0].lat,known[0].lng),zoom:15};
  // Room in screen pixels, not map distance: a marker stands about 50px tall
  // above its spot, and the zoom buttons sit bottom right.
  const bounds=window.L.latLngBounds(known.map(point=>[point.lat,point.lng]));
  const padding=window.L.point(FRAME_PAD.left+FRAME_PAD.right,FRAME_PAD.top+FRAME_PAD.bottom);
  return {bounds,zoom:Math.min(16,map.getBoundsZoom(bounds,false,padding))};
}

// GPS wobbles by a few metres every fix. Re-zooming on each one made the map
// twitch while you looked at it. Reframe only when someone is out of view, the
// people on the map changed, or the right zoom moved by a real amount.
function needsReframe(known){
  if(!known.length)return false;
  if(!lastFrameSignature)return true;
  const people=sig=>sig.split('|').map(part=>part.split(':')[0]).join(',');
  const current=known.map(point=>point.id).sort().join(',');
  if(people(lastFrameSignature)!==current)return true;
  const view=map.getBounds().pad(-.12);
  if(known.some(point=>!view.contains([point.lat,point.lng])))return true;
  return Math.abs(framingFor(known).zoom-map.getZoom())>=1.5;
}

function frameLocations(known,animate=false){
  if(!map||!known.length)return;framingMap=true;map.stop();
  const target=framingFor(known);
  const motion=animate&&!reducedMotion?.matches;
  if(target.bounds)map.fitBounds(target.bounds,{maxZoom:16,animate:motion,paddingTopLeft:[FRAME_PAD.left,FRAME_PAD.top],paddingBottomRight:[FRAME_PAD.right,FRAME_PAD.bottom]});
  else map.setView(target.center,target.zoom,{animate:motion});
  window.setTimeout(()=>{framingMap=false;spreadMarkers();},motion?450:50);
}

function markerIcon(person,live,shift=0){
  const art=person==='her'
    ?'<svg class="map-character" viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.8"><path d="M24 3v5M24 40v5M3 24h5M40 24h5M9.2 9.2l3.6 3.6M35.2 35.2l3.6 3.6M38.8 9.2l-3.6 3.6M12.8 35.2l-3.6 3.6"/></g><circle cx="24" cy="24" r="13.5" fill="#ffd45e" stroke="currentColor" stroke-width="2"/><path d="M17.2 23c1.3-1.2 3.2-1.2 4.5 0M26.3 23c1.3-1.2 3.2-1.2 4.5 0M20 28.2c2.5 2.2 5.5 2.2 8 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>'
    :'<svg class="map-character" viewBox="0 0 48 48" aria-hidden="true"><path d="M33.8 6.2c-8.7 1.3-15.3 8.8-15.3 17.8 0 9.1 6.7 16.6 15.5 17.8A19 19 0 1 1 33.8 6.2Z" fill="#cbd4ff" stroke="currentColor" stroke-linejoin="round" stroke-width="2"/><path d="M15.3 21.8c1.3-1.1 3.1-1.1 4.4 0M14.7 20l-1.5-1M20.3 20l1.5-1M14.7 27.6c1.8 1.7 3.9 1.7 5.7 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/><circle cx="35.8" cy="13" r="1.25" fill="#fff3bd"/><circle cx="39" cy="19" r=".8" fill="#fff3bd"/></svg>';
  return window.L.divIcon({className:'couple-marker-wrap',html:`<span class="couple-marker ${person} ${live?'live':'last-known'}">${art}</span>`,iconSize:[52,52],iconAnchor:[26+shift,48],tooltipAnchor:[-shift,0]});
}


renderControl();
window.setInterval(render,15000);
window.addEventListener('littlelist:profile',render);
