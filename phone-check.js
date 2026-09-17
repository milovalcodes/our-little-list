import { createDataLayer } from './firebase-data.js';
import { setupAuthUI,applyViewerTheme } from './ui-helpers.js';

const params=new URLSearchParams(location.search);const viewer=params.get('as')==='him'?'him':'her';const $=id=>document.getElementById(id);let data;
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;
data=await createDataLayer({collectionName:'presence',onItems(){},onAuth(user){setupAuthUI(data,user);setStatus('sync',Boolean(user),user?'the cloud is doing its little job':'sign in so both phones see the same nonsense');if(user)void data.set(viewer,{person:viewer,lastSeenAt:Date.now(),page:'phone-check'});}});
if(data.mode==='local'){setupAuthUI(data,{local:true});setStatus('sync',false,'local-only mode. this phone is freelancing.');}

function setStatus(name,okay,text){$(`${name}-symbol`).textContent=okay?'✓':'!';$(`${name}-symbol`).classList.toggle('okay',okay);$(`${name}-symbol`).classList.toggle('warning',!okay);$(`${name}-status`).textContent=text;}
function renderOnline(){setStatus('online',navigator.onLine,navigator.onLine?'connected. huge day for technology.':'offline. the cloud has been dismissed.');}
function renderInstall(){const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;setStatus('install',installed,installed?'living on the home screen rent-free.':(/iPhone|iPad|iPod/i.test(navigator.userAgent)?'Safari share button → Add to Home Screen. an ancient ritual.':'use “put the website on my phone” from the front page.'));}
function renderNotifications(){
  const supported='Notification'in window;if(!supported){setStatus('notification',false,'this browser said no. foreground popups still work while the page is open.');return;}
  const allowed=Notification.permission==='granted';setStatus('notification',allowed,allowed?'allowed. tiny noises may occur while the site is awake.':Notification.permission==='denied'?'blocked in phone settings. the browser remembers grudges.':'not asked yet. it has manners, apparently.');$('ask-notifications').hidden=allowed||Notification.permission==='denied';
}
async function renderLocation(){
  if(!navigator.geolocation){setStatus('location',false,'this browser has never heard of geography.');return;}
  try{const result=await navigator.permissions?.query({name:'geolocation'});if(result){setStatus('location',result.state==='granted',result.state==='granted'?'allowed. geography survives.':result.state==='denied'?'blocked in phone settings.':'asks only when you share your spot.');result.onchange=renderLocation;}else setStatus('location',false,'asks only when you share your spot.');}catch(_){setStatus('location',false,'asks only when you share your spot.');}
}
$('ask-notifications').addEventListener('click',async()=>{await Notification.requestPermission();renderNotifications();});
$('ask-location').addEventListener('click',()=>navigator.geolocation.getCurrentPosition(()=>renderLocation(),()=>renderLocation(),{timeout:10000,maximumAge:60000}));
window.addEventListener('online',renderOnline);window.addEventListener('offline',renderOnline);renderOnline();renderInstall();renderNotifications();renderLocation();
