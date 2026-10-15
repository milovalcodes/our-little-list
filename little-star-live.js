import {bootPage} from './page-boot.js';
import {DELIVERY_URL} from './push-config.js';
import {sideForUid} from './household.js';

const live=globalThis.starLive,endpoint=new URL('./star',DELIVERY_URL).href;
let data,viewer,uiKey,started=false,inFlight=false,polling=false,listener=null,latest=null;
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(!started)location.reload();});
const status=document.getElementById('star-connection');
function loadUI(){try{return JSON.parse(localStorage.getItem(uiKey)||'null')||{};}catch{return {};}}
live.saveUI=value=>{try{localStorage.setItem(uiKey,JSON.stringify(value));return true;}catch{return false;}};
async function request(body){
 try{
  const token=await data.getIdToken();
  const response=await fetch(endpoint,{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const value=await response.json();
  if(!response.ok){const error=Error(value.error||'Cannot save right now.');error.uncertain=response.status>=500;error.offline=response.status===401||response.status>=500;throw error;}
  live.offline=false;live.weekly=value.weekly;live.scoresPending=value.scoresPending;return value;
 }catch(error){live.offline=error.offline??true;if(error.uncertain===undefined)error.uncertain=true;throw error;}
}
live.action=async command=>{
 inFlight=true;
 try{const result=await request({op:'act',command});latest=result;return {...result,state:result.star};}
 finally{inFlight=false;}
};
live.subscribe=fn=>{listener=fn;};
async function poll(){
 if(!started||inFlight||polling||document.hidden)return;
 polling=true;
 try{const value=await request({op:'read'});if(!latest||value.star.revision>=latest.star.revision){latest=value;listener?.(value);}}
 catch{listener?.(latest);}finally{polling=false;}
}
try{
 ({data,viewer}=await bootPage({onAuth:user=>{if(started&&sideForUid(user?.uid)!==viewer)location.reload();}}));
 if(data.mode!=='firebase')throw Error('The shared nursery needs your live account.');
 uiKey='little-star-live-ui-v1:'+viewer;
 let value=await request({op:'read'});
 const target=new URLSearchParams(location.search).get('pet');
 if(target&&value.star.otherPet?.petId===target)value=await request({op:'act',command:{id:crypto.randomUUID(),type:'switch-pet',payload:{},petId:value.star.petId}});
 latest=value;started=true;status.hidden=true;
 live.resolve({...loadUI(),...value,person:viewer,wallAt:Date.now()});
 setInterval(poll,5000);
 window.addEventListener('online',poll);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
}catch(error){status.replaceChildren();const text=document.createElement('p');text.textContent=error.message;const button=document.createElement('button');button.textContent='Retry connection';button.onclick=()=>location.reload();status.append(text,button);status.hidden=false;}

// The standalone game shares authentication and phone notifications, not the
// main app's visual shell. No shared.js import (it adds the main navigation).
if('serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).catch(()=>{});
