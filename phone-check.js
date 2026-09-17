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
  $(`${name}-symbol`).classList.remove('failed');
  $(`${name}-status`).textContent=text;
}
function setFailure(name,text){const symbol=$(`${name}-symbol`);symbol.textContent='×';symbol.classList.remove('okay','warning');symbol.classList.add('failed');$(`${name}-status`).textContent=text;}
function help(name,text,tone=''){const el=$(`${name}-help`);el.textContent=tone==='fail'?`probable fix: ${text}`:text;el.hidden=false;el.classList.toggle('fail',tone==='fail');}
function clearHelp(name){$(`${name}-help`).hidden=true;}
function busy(button,on,label='thinking…'){if(on){button.dataset.normalText=button.textContent;button.textContent=label;button.disabled=true;button.classList.add('is-busy');}else{button.textContent=button.dataset.normalText||button.textContent;button.disabled=false;button.classList.remove('is-busy');delete button.dataset.normalText;}}

function renderOnline(){
  if(navigator.onLine){setStatus('online',true,'connected. huge day for technology.');clearHelp('online');}
  else{setFailure('online','offline. the cloud has been dismissed.');help('online','turn on Wi-Fi or mobile data, then tap recheck.','fail');}
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
    help('notification',isApple?'add the site to your Home Screen, open that copy, then return here.':'try Chrome or Safari; this browser does not expose notification permission.','fail');
    button.textContent='show me how';return;
  }
  const permission=Notification.permission;
  if(permission==='denied'){
    setFailure('notification','blocked in phone settings. the browser remembers grudges.');
    help('notification',isApple?'iPhone Settings → Notifications → this web app → Allow Notifications.':'Chrome Settings → Site settings → Notifications → allow this site.','fail');
  }else{setStatus('notification',permission==='granted',permission==='granted'?'allowed. the tiny noise department is operational.':'not asked yet. it has manners, apparently.');if(permission==='granted')clearHelp('notification');}
  button.textContent=permission==='granted'?'test popup':permission==='denied'?'how to unblock':'ask phone';
}
async function renderLocation(){
  const button=$('ask-location');
  if(!navigator.geolocation){setStatus('location',false,'this browser has never heard of geography.');button.textContent='unavailable';button.disabled=true;return;}
  try{
    const result=await navigator.permissions?.query({name:'geolocation'});
    if(result){
      if(result.state==='denied'){setFailure('location','blocked in phone settings.');help('location',isApple?'iPhone Settings → Privacy & Security → Location Services → this web app → While Using.':'tap the site-settings icon near the address bar → Permissions → Location → Allow.','fail');}
      else{setStatus('location',result.state==='granted',result.state==='granted'?'allowed. geography survives.':'ready to ask your phone.');if(result.state==='granted')clearHelp('location');}
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
  clearHelp('sync');busy($('check-sync'),true,'testing…');
  try{await data.set(viewer,{person:viewer,lastSeenAt:Date.now(),page:'phone-check'});setStatus('sync',data.mode!=='local',data.mode==='local'?'still local-only. this phone remains an independent nation.':'sync works. the cloud accepted our paperwork.');help('sync','saved a tiny test ping. nothing dramatic happened, which is ideal.');}
  catch(_){setFailure('sync','sync test failed. the cloud is being weird.');help('sync','check the internet, then try again.','fail');}
  busy($('check-sync'),false);
});
$('check-online').addEventListener('click',async()=>{
  clearHelp('online');busy($('check-online'),true,'checking…');
  try{const response=await fetch(`./service-worker.js?internet-check=${Date.now()}`,{cache:'no-store'});setStatus('online',response.ok,response.ok?'connected. huge day for technology.':'connected, but the website answered strangely.');help('online',response.ok?'the website answered. certified online.':'try refreshing in a second.');}
  catch(_){setFailure('online','offline. the cloud has been dismissed.');help('online','turn Wi-Fi or mobile data on, then bully this button again.','fail');}
  busy($('check-online'),false);
});
$('ask-install').addEventListener('click',async()=>{
  clearHelp('install');busy($('ask-install'),true,'asking phone…');
  const result=await window.requestLittleInstall?.();
  if(result?.status==='accepted'||result?.status==='installed')help('install','done. it lives here now. no rent.');
  else if(result?.status==='dismissed')help('install','you said not now. emotionally devastating, but reversible.');
  else if(isApple)help('install','tap Safari’s Share button, then “Add to Home Screen,” then “Add.” Apple has assigned us a small quest.');
  else help('install','open the browser menu (⋮), then tap “Add to Home screen” or “Install app.”');
  busy($('ask-install'),false);renderInstall();
});
$('ask-notifications').addEventListener('click',async()=>{
  clearHelp('notification');
  if(!('Notification'in window)){help('notification',isApple?'first add the site to your Home Screen, open that copy, then come back here and tap this button again.':'this browser cannot request system notifications. live in-page popups still work.');return;}
  if(Notification.permission==='denied'){help('notification',isApple?'iPhone Settings → Notifications → find this web app → Allow Notifications.':'Chrome menu → Settings → Site settings → Notifications, then allow this site. If it is installed, phone Settings → Apps → this web app → Notifications.');return;}
  if(Notification.permission==='default'){busy($('ask-notifications'),true,'waiting for phone…');await Notification.requestPermission();busy($('ask-notifications'),false);}
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
  busy($('ask-location'),true,'asking phone…');
  navigator.geolocation.getCurrentPosition(()=>{busy($('ask-location'),false);setStatus('location',true,'allowed. geography survives.');$('ask-location').textContent='test location';help('location','location works. the test coordinates were discarded immediately.');},problem=>{busy($('ask-location'),false);renderLocation();help('location',problem.code===1?(isApple?'iPhone Settings → Privacy & Security → Location Services → this web app or Safari → While Using.':'tap the site icon by the address bar → Permissions → Location → Allow while using.'):problem.code===3?'try somewhere with a better view of the sky.':'check Location Services and try again.','fail');},{timeout:12000,maximumAge:0,enableHighAccuracy:false});
});
$('ask-background').addEventListener('click',async()=>{
  clearHelp('background');
  if(wakeLock){await wakeLock.release();wakeLock=null;renderBackground();return;}
  if(!('wakeLock'in navigator)){help('background','keep the map page open while traveling. You can also raise the phone’s screen timeout, but a website cannot change that setting for you.');return;}
  busy($('ask-background'),true,'asking phone…');
  try{wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;renderBackground();});renderBackground();help('background','screen wake-lock is on until you leave this page or tap the button again.');}
  catch(_){setFailure('background','the phone declined the keep-awake request.');help('background','turn off battery saver and try again.','fail');}
  finally{busy($('ask-background'),false);renderBackground();}
});

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&wakeLock===null)renderBackground();});
window.addEventListener('online',renderOnline);
window.addEventListener('offline',renderOnline);
window.addEventListener('appinstalled',renderInstall);
renderOnline();renderInstall();renderNotifications();renderLocation();renderBackground();
