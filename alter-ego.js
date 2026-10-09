import {personName} from './profile-store.js';
import {showFailure,setButtonBusy,settleQuickly,toast} from './ui-helpers.js';

export const safeAlterEgo=value=>typeof value==='string'&&value.length<=90000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';
export async function prepareAlterEgo(file){
  if(!file?.type.startsWith('image/')||file.type==='image/svg+xml'||file.size>20000000)throw Error('Choose a photo under 20 MB.');
  const url=URL.createObjectURL(file),image=new Image();
  try{
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('This photo format could not be opened.'));image.src=url;});
    const size=Math.min(image.naturalWidth,image.naturalHeight),canvas=document.createElement('canvas');
    if(!size)throw Error('Empty image');
    canvas.width=320;canvas.height=320;
    const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,320,320);
    context.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,320,320);
    for(const quality of [.85,.72,.58,.4]){const result=canvas.toDataURL('image/jpeg',quality);if(safeAlterEgo(result))return result;}
    throw Error('This photo is too large.');
  }finally{URL.revokeObjectURL(url);}
}

let started=false;
export function startAlterEgos(data,viewer){
  if(started)return;started=true;
  let photos={},loaded=false,frame=0,draft='',selection=0,busy=false,loadFailed=false;
  const timers=new Map(),settings=document.getElementById('alter-ego-settings');
  const $=id=>document.getElementById(id);
  function closeFlip(button){clearTimeout(timers.get(button));timers.delete(button);button.classList.remove('is-flipped');button.setAttribute('aria-pressed','false');}
  function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
  function paint(){
    frame=0;
    for(const button of document.querySelectorAll('.alter-ego-trigger')){
      const person=button.dataset.person,photo=photos[person]||'';
      let turn=button.querySelector('.alter-ego-turn');
      if(!turn){const front=button.querySelector('img');if(!front)continue;turn=document.createElement('span');turn.className='alter-ego-turn';front.classList.add('alter-ego-front');button.insertBefore(turn,front);turn.append(front);}
      let back=turn.querySelector('.alter-ego-back');
      if(photo){if(!back){back=new Image();back.className='alter-ego-back';back.alt='';turn.append(back);}if(back.getAttribute('src')!==photo){closeFlip(button);back.src=photo;}}
      else if(back){closeFlip(button);back.remove();}
      button.classList.toggle('has-alter-ego',Boolean(photo));
      const label=photo?`Peek at ${personName(person)}’s alter ego`:button.dataset.profileUrl?`Open ${personName(person)}’s profile`:person===viewer?'Add your alter ego':'No alter ego photo yet';
      button.setAttribute('aria-label',label);button.title=label;
      if(!button.hasAttribute('aria-pressed'))button.setAttribute('aria-pressed','false');
      button.disabled=!photo&&!button.dataset.profileUrl&&person!==viewer;
    }
    for(const button of timers.keys())if(!button.isConnected)closeFlip(button);
    if(settings){
      const source=draft||photos[viewer]||'';
      $('alter-ego-preview').hidden=!source;if(source&&$('alter-ego-preview').getAttribute('src')!==source)$('alter-ego-preview').src=source;
      if(!source)$('alter-ego-preview').removeAttribute('src');
      $('alter-ego-save').hidden=!draft;$('alter-ego-cancel').hidden=!draft;
      $('alter-ego-remove').hidden=!photos[viewer];
      $('alter-ego-remove').disabled=busy||!loaded;$('alter-ego-file').disabled=busy||!loaded;
      $('alter-ego-save').disabled=busy||!loaded;
      $('alter-ego-state').textContent=busy?'saving…':loadFailed?'Couldn’t load your photo. Reopen this page to try again.':!loaded?'getting your photo…':draft?'Preview first. Save if you like it.':photos[viewer]?'Tap a portrait to peek. It flips back on its own.':'The sun and moon stay. A photo goes on the other side.';
    }
  }
  data.listenTo('profilePhotos',items=>{loaded=true;loadFailed=false;photos=Object.fromEntries(items.filter(p=>['her','him'].includes(p.id)).map(p=>[p.id,safeAlterEgo(p.photo)]));schedule();},{onError:()=>{loadFailed=true;schedule();}});
  setTimeout(()=>{if(!loaded){loadFailed=true;schedule();}},10000);
  const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'||[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches?.('.alter-ego-turn,.alter-ego-back'))))schedule();});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('littlelist:profile',schedule);
  document.addEventListener('click',event=>{
    const button=event.target.closest('.alter-ego-trigger');if(!button)return;
    const person=button.dataset.person;
    if(!photos[person]){if(button.dataset.profileUrl)location.href=button.dataset.profileUrl;else if(person===viewer&&settings){settings.open=true;settings.scrollIntoView({block:'center'});$('alter-ego-file').focus();}return;}
    if(button.classList.contains('is-flipped')){closeFlip(button);return;}
    button.classList.add('is-flipped');button.setAttribute('aria-pressed','true');
    timers.set(button,setTimeout(()=>closeFlip(button),2600));
  });
  const resetFlips=()=>{for(const button of [...timers.keys()])closeFlip(button);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetFlips();});window.addEventListener('pagehide',resetFlips);
  if(settings){
    $('alter-ego-file').addEventListener('change',async event=>{
      const version=++selection,file=event.target.files?.[0];draft='';if(!file){paint();return;}
      $('alter-ego-state').textContent='making it portrait-sized…';
      try{const photo=await prepareAlterEgo(file);if(version===selection)draft=photo;}
      catch(_){if(version===selection)showFailure('that photo did not open.','try a JPG, PNG or a screenshot under 20 MB.');}
      finally{if(version===selection){event.target.value='';paint();}}
    });
    $('alter-ego-cancel').addEventListener('click',()=>{selection++;draft='';paint();});
    async function save(remove=false){
      if(busy||!loaded||(!remove&&!draft))return;
      const next=draft;busy=true;selection++;paint();const button=$(remove?'alter-ego-remove':'alter-ego-save');setButtonBusy(button,true,'saving…');
      try{await settleQuickly(remove?data.removeFrom('profilePhotos',viewer):data.setTo('profilePhotos',viewer,{person:viewer,photo:next,updatedAt:Date.now()}),'Your photo has not confirmed yet.');draft='';toast(remove?'alter ego removed':'alter ego saved ♡');}
      catch(_){showFailure('the photo change did not confirm.','check the connection and try again.');}
      finally{busy=false;setButtonBusy(button,false);paint();}
    }
    $('alter-ego-save').addEventListener('click',()=>void save());$('alter-ego-remove').addEventListener('click',()=>void save(true));
  }
  schedule();
}
