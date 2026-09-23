import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, escapeHtml, toast, setButtonBusy, showFailure } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';

const $=id=>document.getElementById(id);let memories=[];let photo='';
const data=await sharedLayer();onAuthChange(user=>setupAuthUI(data,user));if(data.mode==='local')setupAuthUI(data,{local:true});
const viewer=await awaitViewer();if(!viewer){showNotAMember();await new Promise(()=>{});}const other=partnerOf(viewer);
applyViewerTheme(viewer);document.querySelector('.back-to-side').href=`${viewer}.html`;
data.listenTo('memories',items=>{memories=items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));render();});

$('memory-photo').addEventListener('change',async event=>{const file=event.target.files?.[0];photo='';$('photo-name').textContent='';if(!file)return;try{photo=await shrinkPhoto(file);$('photo-name').textContent=file.name;}catch(problem){event.target.value='';showFailure('that photo is too mighty.','try a smaller photo or a screenshot.');}});
$('memory-form').addEventListener('submit',async event=>{event.preventDefault();const text=$('memory-text').value.trim();const button=$('memory-save');setButtonBusy(button,true,'jarring…');try{await data.addTo('memories',{text,photo,addedBy:viewer,createdAt:Date.now()});void data.notify(other,{title:`${personName(viewer)} added to the memory jar`,body:text.slice(0,120),url:'memories.html',kind:'memory'});event.target.reset();photo='';$('photo-name').textContent='';toast('secured for the historians');}catch(_){showFailure('the jar did not take it.','check the internet and try again.');}finally{setButtonBusy(button,false);}});
$('memory-list').addEventListener('click',async event=>{const button=event.target.closest('[data-delete]');if(!button)return;button.disabled=true;try{await data.removeFrom('memories',button.dataset.delete);}catch(_){showFailure('that memory stayed put.','check the internet and try again.');button.disabled=false;}});
$('memory-pick').addEventListener('click',()=>{if(!memories.length)return;const item=memories[Math.floor(Math.random()*memories.length)];$('memory-random').hidden=false;$('memory-random').innerHTML=memoryMarkup(item,true);$('memory-random').scrollIntoView({behavior:'smooth',block:'nearest'});});

function render(){$('memory-empty').hidden=memories.length>0;$('memory-list').innerHTML=memories.map(item=>memoryMarkup(item)).join('');}
function memoryMarkup(item,featured=false){const image=safePhoto(item.photo);return `<article class="memory-card${featured?' featured':''}">${image?`<img src="${image}" alt="">`:''}<div><p>${escapeHtml(item.text||'')}</p><small>${escapeHtml(personName(item.addedBy))} · ${timeAgo(item.createdAt)}</small>${featured?'':`<button type="button" data-delete="${escapeHtml(item.id)}" aria-label="Delete memory">×</button>`}</div></article>`;}
function safePhoto(value){return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value||'')?value:'';}
async function shrinkPhoto(file){if(!file.type.startsWith('image/'))throw new Error('not an image');const bitmap=await loadPhoto(file);const width=bitmap.width||bitmap.naturalWidth;const height=bitmap.height||bitmap.naturalHeight;const scale=Math.min(1,1200/Math.max(width,height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();let quality=.78;let result=canvas.toDataURL('image/jpeg',quality);while(result.length>560000&&quality>.38){quality-=.1;result=canvas.toDataURL('image/jpeg',quality);}if(result.length>620000)throw new Error('too large');return result;}
async function loadPhoto(file){if('createImageBitmap' in window)return createImageBitmap(file);return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const image=new Image();image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('image failed'));};image.src=url;});}
window.addEventListener('littlelist:profile',render);
