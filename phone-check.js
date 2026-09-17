import { createDataLayer } from './firebase-data.js';
import { setupAuthUI,applyViewerTheme } from './ui-helpers.js';

const params=new URLSearchParams(location.search);
const viewer=params.get('as')==='him'?'him':'her';
const isApple=/iPhone|iPad|iPod/i.test(navigator.userAgent);
const $=id=>document.getElementById(id);
let data;let wakeLock=null;

applyViewerTheme(viewer);
document.querySelector('.back-to-side').href=`${viewer}.html`;
data=await createDataLayer({collectionName:'presence',onItems(){},onAuth(user){
  setupAuthUI(data,user);
  setStatus('sync',Boolean(user),user?'the cloud is doing its little job':'sign in so both phones see the same nonsense');
  if(user)void data.set(viewer,{person:viewer,lastSeenAt:Date.now(),page:'phone-check'});
}});
if(data.mode==='local'){
  setupAuthUI(data,{local:true});
  setStatus('sync',false,'local-only mode. this phone is freelancing.');
}

function setStatus(name,okay,text){
  $(`${name}-symbol`).textContent=okay?'✓':'!';
  $(`${name}-symbol`).classList.toggle('okay',okay);
  $(`${name}-symbol`).classList.toggle('warning',!okay);
  $(`${name}-status`).textContent=text;
}
function help(name,text){const el=$(`${name}-help`);el.textContent=text;el.hidden=false;}
function clearHelp(name){$(`${name}-help`).hidden=true;}

function renderOnline(){
  setStatus('online',navigator.onLine,navigator.onLine?'connected. huge day for technology.':'offline. the cloud has been dismissed.');
}
function renderInstall(){
  const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  setStatus('install',installed,installed?'living on the home screen rent-free.':isApple?'not installed yet. Safari requires the sacred share-button ritual.':'not installed yet. Android might give us a real button.');
  $('ask-install').textContent=installed?'already installed ✓':'install / show me';
  $('ask-install').disabled=installed;
}
function renderNotifications(){
  const button=$('ask-notifications');
  if(!('Notification'in window)){
    setStatus('notification',false,isApple?'install this site on the Home Screen first, then ask again.':'this browser said no. foreground popups still work while the page is open.');
    button.textContent='show me how';return;
  }
  const permission=Notification.permission;
  setStatus('notification',permission==='granted',permission==='granted'?'allowed. the tiny noise department is operational.':permission==='denied'?'blocked in phone settings. the browser remembers grudges.':'not asked yet. it has manners, apparently.');
  button.textContent=permission==='granted'?'test popup':permission==='denied'?'how to unblock':'ask phone';
}
async function renderLocation(){
  const button=$('ask-location');
  if(!navigator.geolocation){setStatus('location',false,'this browser has never heard of geography.');button.textContent='unavailable';button.disabled=true;return;}
  try{
    const result=await navigator.permissions?.query({name:'geolocation'});
    if(result){
      setStatus('location',result.state==='granted',result.state==='granted'?'allowed. geography survives.':result.state==='denied'?'blocked in phone settings.':'ready to ask your phone.');
      button.textContent=result.state==='granted'?'test location':result.state==='denied'?'how to unblock':'ask phone';
      result.onchange=renderLocation;
    }else setStatus('location',false,'tap below and the phone should ask.');
  }catch(_){setStatus('location',false,'tap below and the phone should ask.');}
}
function renderBackground(){
  const supported='wakeLock'in navigator;
  const active=Boolean(wakeLock);
  $('background-symbol').textContent=active?'✓':'◐';
  $('background-symbol').classList.toggle('okay',active);
  $('background-symbol').classList.toggle('warning',!active);
  $('background-status').textContent=active?'staying awake while this page is visible. tiny victory.':supported?'we can keep the screen awake while this page is open. lock-screen magic is still forbidden.':'this browser cannot keep a website awake. opening it again catches everything up.';
  $('ask-background').textContent=active?'let it nap again':supported?'keep page awake':'what can i do?';
}

$('check-sync').addEventListener('click',async()=>{
  clearHelp('sync');$('check-sync').textContent='testing…';
  try{await data.set(viewer,{person:viewer,lastSeenAt:Date.now(),page:'phone-check'});setStatus('sync',data.mode!=='local',data.mode==='local'?'still local-only. this phone remains an independent nation.':'sync works. the cloud accepted our paperwork.');help('sync','saved a tiny test ping. nothing dramatic happened, which is ideal.');}
  catch(_){setStatus('sync',false,'sync test failed. the cloud is being weird.');help('sync','check the internet, then try again.');}
  $('check-sync').textContent='test sync';
});
$('check-online').addEventListener('click',async()=>{
  clearHelp('online');$('check-online').textContent='checking…';
  try{const response=await fetch(`./service-worker.js?internet-check=${Date.now()}`,{cache:'no-store'});setStatus('online',response.ok,response.ok?'connected. huge day for technology.':'connected, but the website answered strangely.');help('online',response.ok?'the website answered. certified online.':'try refreshing in a second.');}
  catch(_){setStatus('online',false,'offline. the cloud has been dismissed.');help('online','turn Wi-Fi or mobile data on, then bully this button again.');}
  $('check-online').textContent='recheck';
});
$('ask-install').addEventListener('click',async()=>{
  clearHelp('install');
  const result=await window.requestLittleInstall?.();
  if(result?.status==='accepted'||result?.status==='installed')help('install','done. it lives here now. no rent.');
  else if(result?.status==='dismissed')help('install','you said not now. emotionally devastating, but reversible.');
  else if(isApple)help('install','tap Safari’s Share button, then “Add to Home Screen,” then “Add.” Apple has assigned us a small quest.');
  else help('install','open the browser menu (⋮), then tap “Add to Home screen” or “Install app.”');
  renderInstall();
});
$('ask-notifications').addEventListener('click',async()=>{
  clearHelp('notification');
  if(!('Notification'in window)){help('notification',isApple?'first add the site to your Home Screen, open that copy, then come back here and tap this button again.':'this browser cannot request system notifications. live in-page popups still work.');return;}
  if(Notification.permission==='denied'){help('notification',isApple?'iPhone Settings → Notifications → find this web app → Allow Notifications.':'Chrome menu → Settings → Site settings → Notifications, then allow this site. If it is installed, phone Settings → Apps → this web app → Notifications.');return;}
  if(Notification.permission==='default')await Notification.requestPermission();
  renderNotifications();
  if(Notification.permission==='granted'){
    window.playLittleTwinkle?.();
    try{const registration=await navigator.serviceWorker.ready;await registration.showNotification('permission acquired 🫡',{body:'the tiny noise department lives.',icon:'./sun-moon-personalized.png',badge:'./sun-moon-personalized.png',data:{url:`./phone-check.html?as=${viewer}`}});help('notification','test sent. if nothing appeared, check Focus / Do Not Disturb too.');}
    catch(_){help('notification','permission is allowed. this browser declined the test popup, because of course it did.');}
  }
});
$('ask-location').addEventListener('click',()=>{
  clearHelp('location');
  if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(()=>{setStatus('location',true,'allowed. geography survives.');$('ask-location').textContent='test location';help('location','location works. the test coordinates were discarded immediately.');},problem=>{renderLocation();help('location',problem.code===1?(isApple?'iPhone Settings → Privacy & Security → Location Services → this web app or Safari → While Using.':'tap the site icon by the address bar → Permissions → Location → Allow while using.'):problem.code===3?'the phone took too long. try somewhere with a better view of the sky.':'the phone could not find a location right now.');},{timeout:12000,maximumAge:0,enableHighAccuracy:false});
});
$('ask-background').addEventListener('click',async()=>{
  clearHelp('background');
  if(wakeLock){await wakeLock.release();wakeLock=null;renderBackground();return;}
  if(!('wakeLock'in navigator)){help('background','keep the map page open while traveling. You can also raise the phone’s screen timeout, but a website cannot change that setting for you.');return;}
  try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;renderBackground();});renderBackground();help('background','screen wake-lock is on until you leave this page or tap the button again.');}
  catch(_){help('background','the phone declined. turn off battery saver and try again.');}
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&wakeLock===null)renderBackground();});
window.addEventListener('online',renderOnline);
window.addEventListener('offline',renderOnline);
window.addEventListener('appinstalled',renderInstall);
renderOnline();renderInstall();renderNotifications();renderLocation();renderBackground();
