import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, showNotAMember } from './viewer.js';
import { setupAuthUI,applyViewerTheme } from './ui-helpers.js';
import { ensurePushSubscription, pushState } from './push-client.js';
import { startPresence } from './presence.js';

const isApple=/iPhone|iPad|iPod/i.test(navigator.userAgent);
const $=id=>document.getElementById(id);
let data;let wakeLock=null;

data=await sharedLayer();
onAuthChange(user=>{
  setupAuthUI(data,user);
  setStatus('sync',Boolean(user),user?'connected to our shared space.':'sign in so both phones can see the same things.');
});
if(data.mode==='local'){
  setupAuthUI(data,{local:true});
  setStatus('sync',false,'only saved on this phone.');
}
// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const viewer=await awaitViewer();
if(!viewer){showNotAMember();await new Promise(()=>{});}

applyViewerTheme(viewer);
document.querySelector('.back-to-side').href=`${viewer}.html`;

startPresence(data,viewer,'phone-check');
void ensurePushSubscription(data,viewer).then(renderNotifications);

function setStatus(name,okay,text){
  $(`${name}-symbol`).textContent=okay?'✓':'!';
  $(`${name}-symbol`).classList.toggle('okay',okay);
  $(`${name}-symbol`).classList.toggle('warning',!okay);
  $(`${name}-symbol`).classList.remove('failed');
  $(`${name}-status`).textContent=text;
}
function setFailure(name,text){const symbol=$(`${name}-symbol`);symbol.textContent='×';symbol.classList.remove('okay','warning');symbol.classList.add('failed');$(`${name}-status`).textContent=text;}
function help(name,text,tone=''){const el=$(`${name}-help`);el.textContent=tone==='fail'?`try this: ${text}`:text;el.hidden=false;el.classList.toggle('fail',tone==='fail');}
function clearHelp(name){$(`${name}-help`).hidden=true;}
function busy(button,on,label='thinking…'){if(on){button.dataset.normalText=button.textContent;button.textContent=label;button.disabled=true;button.classList.add('is-busy');}else{button.textContent=button.dataset.normalText||button.textContent;button.disabled=false;button.classList.remove('is-busy');delete button.dataset.normalText;}}
async function locationPermission(){
  try{return (await navigator.permissions?.query({name:'geolocation'}))?.state||'unknown';}
  catch(_){return 'unknown';}
}

function renderOnline(){
  if(navigator.onLine){setStatus('online',true,'online and ready.');clearHelp('online');}
  else{setFailure('online','offline right now.');help('online','turn on Wi-Fi or mobile data, then tap recheck.','fail');}
}
function renderInstall(){
  const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  setStatus('install',installed,installed?'on your home screen.':isApple?'not on your Home Screen yet.':'not on your home screen yet.');
  $('ask-install').textContent=installed?'already installed ✓':'install / show me';
  $('ask-install').disabled=installed;
}
async function renderNotifications(){
  const button=$('ask-notifications');
  const state=await pushState();

  if(state==='needs-install'){
    setFailure('notification','iPhone needs this on the Home Screen first.');
    help('notification','Safari Share → Add to Home Screen, open that copy, then come back here.','fail');
    button.textContent='show me how';return;
  }
  if(state==='unsupported'){
    setStatus('notification',false,'this browser cannot do phone notifications. popups still work while the page is open.');
    help('notification','try Safari on iPhone or Chrome on Android.','fail');
    button.textContent='show me how';return;
  }
  if(state==='blocked'){
    setFailure('notification','blocked in phone settings.');
    help('notification',isApple?'iPhone Settings → Notifications → this web app → Allow Notifications.':'Chrome Settings → Site settings → Notifications → allow this site.','fail');
    button.textContent='how to unblock';return;
  }
  if(state==='needs-permission'){
    setStatus('notification',false,'ready to ask your phone.');
    button.textContent='ask phone';return;
  }
  if(state==='not-configured'){
    setStatus('notification',false,'popups work here, but background delivery is not set up yet.');
    help('notification','the delivery key is missing from the website config.');
    button.textContent='test popup';return;
  }
  if(state==='needs-subscribe'||state==='no-sync'){
    setStatus('notification',false,'allowed, but this phone is not registered for background nudges yet.');
    help('notification',state==='no-sync'?'sign in first so this phone can register.':'tap the button to finish registering.');
    button.textContent='finish setup';return;
  }

  // state === 'ready'
  setStatus('notification',true,'allowed and registered. reminders will arrive with the app closed.');
  clearHelp('notification');
  button.textContent='test popup';
}
async function renderLocation(){
  const button=$('ask-location');
  if(!navigator.geolocation){setStatus('location',false,'this browser has never heard of geography.');button.textContent='unavailable';button.disabled=true;return;}
  try{
    const result=await navigator.permissions?.query({name:'geolocation'});
    if(result){
      if(result.state==='denied'){setFailure('location','blocked in phone settings.');help('location',isApple?'iPhone Settings → Privacy & Security → Location Services → this web app → While Using.':'tap the site-settings icon near the address bar → Permissions → Location → Allow.','fail');}
      else{setStatus('location',result.state==='granted',result.state==='granted'?'allowed. location is ready.':'ready to ask your phone.');if(result.state==='granted')clearHelp('location');}
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
  $('background-status').textContent=active?'staying awake while this page is visible.':supported?'we can keep the screen awake while this page is open.':'this browser cannot stay awake in the background. opening it again catches everything up.';
  $('ask-background').textContent=active?'let it nap again':supported?'keep page awake':'what can i do?';
}

$('check-sync').addEventListener('click',async()=>{
  clearHelp('sync');busy($('check-sync'),true,'testing…');
  try{
    const result=await data.setTo('presence',viewer,{person:viewer,lastSeenAt:Date.now(),page:'phone-check'});
    if(data.mode==='local'){setStatus('sync',false,'still only on this phone.');help('sync','test update saved.');}
    else if(result?.syncing){setStatus('sync',false,'saved on this phone, not sent yet.');help('sync','no connection right now. it goes across as soon as there is one.');}
    else {setStatus('sync',true,'sync works. both phones can share updates.');help('sync','test update saved.');}
  }
  catch(_){setFailure('sync','sync test failed.');help('sync','check the internet, then try again.','fail');}
  busy($('check-sync'),false);
});
$('check-online').addEventListener('click',async()=>{
  clearHelp('online');busy($('check-online'),true,'checking…');
  try{const response=await fetch(`./service-worker.js?internet-check=${Date.now()}`,{cache:'no-store'});setStatus('online',response.ok,response.ok?'online and ready.':'connected, but the website answered strangely.');help('online',response.ok?'the website answered.':'try refreshing in a second.');}
  catch(_){setFailure('online','offline right now.');help('online','turn Wi-Fi or mobile data on, then try again.','fail');}
  busy($('check-online'),false);
});
$('ask-install').addEventListener('click',async()=>{
  clearHelp('install');busy($('ask-install'),true,'asking phone…');
  const result=await window.requestLittleInstall?.();
  if(result?.status==='accepted'||result?.status==='installed')help('install','done. it is on this phone now.');
  else if(result?.status==='dismissed')help('install','not added yet. you can try again whenever.');
  else if(isApple)help('install','tap Safari’s Share button, then “Add to Home Screen,” then “Add.”');
  else help('install','open the browser menu (⋮), then tap “Add to Home screen” or “Install app.”');
  busy($('ask-install'),false);renderInstall();
});
$('ask-notifications').addEventListener('click',async()=>{
  clearHelp('notification');
  const state=await pushState();
  if(state==='needs-install'){help('notification','Safari Share → Add to Home Screen, open that copy, then come back here and tap this again.');return;}
  if(state==='unsupported'){help('notification','this browser cannot request phone notifications. live in-page popups still work.');return;}
  if(state==='blocked'){help('notification',isApple?'iPhone Settings → Notifications → find this web app → Allow Notifications.':'Chrome menu → Settings → Site settings → Notifications, then allow this site. If it is installed, phone Settings → Apps → this web app → Notifications.');return;}
  if(Notification.permission==='default'){busy($('ask-notifications'),true,'waiting for phone…');await Notification.requestPermission();busy($('ask-notifications'),false);}
  if(Notification.permission==='granted'){
    busy($('ask-notifications'),true,'registering…');
    const result=await ensurePushSubscription(data,viewer);
    busy($('ask-notifications'),false);
    if(result.state==='failed')help('notification','this phone allowed notifications but could not register for background ones. try reloading the page.','fail');
  }
  await renderNotifications();
  if(Notification.permission==='granted'){
    window.playLittleTwinkle?.();
    try{const registration=await navigator.serviceWorker.ready;await registration.showNotification('notifications are ready ♡',{body:'this is the test popup.',icon:'./sun-moon-personalized.png',badge:'./sun-moon-personalized.png',data:{url:`./phone-check.html`}});help('notification','test sent. if nothing appeared, check Focus / Do Not Disturb too.');}
    catch(_){help('notification','permission is allowed, but the test popup did not appear.');}
  }
});
$('ask-location').addEventListener('click',()=>{
  clearHelp('location');
  if(!navigator.geolocation)return;
  busy($('ask-location'),true,'asking phone…');
  navigator.geolocation.getCurrentPosition(
    ()=>{
      busy($('ask-location'),false);setStatus('location',true,'allowed and working.');$('ask-location').textContent='test again';
      help('location','GPS answered. automatic sharing stays on while the app is open unless you pause it from the status page.');
    },
    async problem=>{
      busy($('ask-location'),false);
      const permission=await locationPermission();
      if(problem.code===1||permission==='denied'){
        setFailure('location','location was not allowed.');$('ask-location').textContent='how to unblock';
        help('location',isApple?'iPhone Settings → Privacy & Security → Location Services → this web app or Safari → While Using.':'tap the site icon by the address bar → Permissions → Location → Allow while using.','fail');
        return;
      }
      setStatus('location',true,'permission allowed. GPS needs another try.');$('ask-location').textContent='retry GPS';
      help('location',problem.code===3?'permission is on. wait a moment or move near a window, then retry.':'permission is on. make sure the phone’s main Location switch is enabled, then retry.');
    },
    {timeout:8000,maximumAge:600000,enableHighAccuracy:false}
  );
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
window.addEventListener('appinstalled',()=>{renderInstall();void renderNotifications();});
renderOnline();renderInstall();void renderNotifications();renderLocation();renderBackground();
