import {personName} from './profile-store.js';
import {showFailure,setButtonBusy,settleQuickly,toast} from './ui-helpers.js';

export const safeAlterEgo=value=>typeof value==='string'&&value.length<=90000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)?value:'';
export async function prepareAlterEgo(file){
  if(!file?.type.startsWith('image/')||file.type==='image/svg+xml'||file.size>20000000)throw Error('Choose a photo under 20 MB.');
  const url=URL.createObjectURL(file),image=new Image();let timer;
  try{
    await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Photo took too long to open.')),12000);image.onload=resolve;image.onerror=()=>reject(Error('This photo format could not be opened.'));image.src=url;});
    clearTimeout(timer);
    const size=Math.min(image.naturalWidth,image.naturalHeight),canvas=document.createElement('canvas');
    if(!size)throw Error('Empty image');
    canvas.width=320;canvas.height=320;
    const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,320,320);
    context.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,320,320);
    for(const quality of [.85,.72,.58,.4]){const result=canvas.toDataURL('image/jpeg',quality);if(safeAlterEgo(result))return result;}
    throw Error('This photo is too large.');
  }finally{clearTimeout(timer);URL.revokeObjectURL(url);}
}

let started=false;
export function startAlterEgos(data,viewer){
  // Most pages have no flippable portraits; don't download both private photos there.
  if(!document.getElementById('alter-ego-settings')&&!document.querySelector('.alter-ego-trigger'))return;
  if(started)return;started=true;
  let photos={},loaded=false,frame=0,draft='',selection=0,busy=false,preparing=false,loadFailed=false,error='',stopPhotos,loadTimer,loadVersion=0;
  const timers=new Map(),lastTaps=new WeakMap(),settings=document.getElementById('alter-ego-settings');
  const $=id=>document.getElementById(id);
  function closeFlip(button){clearTimeout(timers.get(button));timers.delete(button);button.classList.remove('is-flipped');button.setAttribute('aria-pressed','false');}
  function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
  function openEditor(){if(!settings||document.body.dataset.profileOwner!=='true')return;paint();if(!settings.open)settings.showModal();}
  function closeEditor(){if(busy)return;selection++;draft='';preparing=false;error='';if(settings){$('alter-ego-file').value='';settings.close();}paint();}
  function choosePhoto(){if(!settings||busy||document.body.dataset.profileOwner!=='true')return;if(!loaded||loadFailed){openEditor();return;}$('alter-ego-file').click();}
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
      const label=photo?`Peek at ${personName(person)}’s alter ego${button.dataset.profileUrl?'; double tap to open profile':''}`:button.dataset.profileUrl?`Open ${personName(person)}’s profile`:person===viewer?'Add your alter ego':'No alter ego photo yet';
      button.setAttribute('aria-label',label);button.title=label;
      if(!button.hasAttribute('aria-pressed'))button.setAttribute('aria-pressed','false');
      button.disabled=!photo&&!button.dataset.profileUrl&&person!==viewer;
      if(settings&&person===viewer&&button.classList.contains('status-avatar')){
        let wrapper=button.closest('.profile-photo-control');
        if(!wrapper){
          wrapper=document.createElement('div');wrapper.className='profile-photo-control';button.before(wrapper);wrapper.append(button);
          const edit=document.createElement('button');edit.type='button';edit.className='profile-photo-edit';
          edit.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></svg>';
          wrapper.append(edit);
        }
        const edit=wrapper.querySelector('.profile-photo-edit');edit.disabled=busy||(!loaded&&!loadFailed);
        edit.setAttribute('aria-label',photo?'Edit profile photo':'Add profile photo');edit.title=photo?'Edit profile photo':'Add profile photo';
      }
    }
    for(const button of timers.keys())if(!button.isConnected)closeFlip(button);
    if(settings){
      const source=draft||photos[viewer]||'';
      $('alter-ego-preview').hidden=!source;if(source&&$('alter-ego-preview').getAttribute('src')!==source)$('alter-ego-preview').src=source;
      if(!source)$('alter-ego-preview').removeAttribute('src');
      $('alter-ego-save').hidden=!draft;$('alter-ego-cancel').hidden=!draft;
      $('alter-ego-remove').hidden=!photos[viewer];
      $('alter-ego-remove').disabled=busy||preparing||!loaded;$('alter-ego-file').disabled=busy||!loaded;
      $('alter-ego-save').disabled=busy||preparing||!loaded;
      $('alter-ego-choose').disabled=busy||!loaded;$('alter-ego-choose').textContent=source?'Change photo':'Choose photo';
      $('alter-ego-cancel').disabled=busy;$('alter-ego-close').disabled=busy;
      $('alter-ego-state').setAttribute('role',error||loadFailed?'alert':'status');
      $('alter-ego-state').textContent=busy?'saving…':preparing?'making it portrait-sized…':error|| (loadFailed?'Couldn’t load your photo. Check the connection and retry below.':!loaded?'getting your photo…':draft?'Looking good? Save it below.':photos[viewer]?'Your alter ego. Tap your portrait to flip.':'The sun and moon stay. Your photo lives on the flip side.');
      $('alter-ego-retry').hidden=!loadFailed;
    }
  }
  function listen(){
    stopPhotos?.();clearTimeout(loadTimer);loadFailed=false;error='';const version=++loadVersion;let received=false;
    stopPhotos=data.listenTo('profilePhotos',items=>{if(version!==loadVersion)return;received=true;clearTimeout(loadTimer);loaded=true;loadFailed=false;photos=Object.fromEntries(items.filter(p=>['her','him'].includes(p.id)).map(p=>[p.id,safeAlterEgo(p.photo)]));schedule();},{onError:()=>{if(version!==loadVersion)return;loadFailed=true;schedule();}});
    loadTimer=setTimeout(()=>{if(version===loadVersion&&!received){loadFailed=true;schedule();}},10000);schedule();
  }
  listen();
  window.addEventListener('online',()=>{if(loadFailed)listen();});
  const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'||[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches?.('.alter-ego-turn,.alter-ego-back'))))schedule();});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('littlelist:profile',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest('.profile-photo-edit')){if(photos[viewer]||loadFailed)openEditor();else choosePhoto();return;}
    const button=event.target.closest('.alter-ego-trigger');if(!button)return;
    const person=button.dataset.person;
    if(!photos[person]){if(button.dataset.profileUrl)location.href=button.dataset.profileUrl;else if(person===viewer&&settings)choosePhoto();return;}
    const now=performance.now(),previous=lastTaps.get(button);
    if(button.dataset.profileUrl&&event.detail!==0&&previous!==undefined&&now-previous<450){
      lastTaps.delete(button);closeFlip(button);location.href=button.dataset.profileUrl;return;
    }
    if(event.detail!==0)lastTaps.set(button,now);
    if(button.classList.contains('is-flipped')){closeFlip(button);return;}
    button.classList.add('is-flipped');button.setAttribute('aria-pressed','true');
    timers.set(button,setTimeout(()=>closeFlip(button),2600));
  });
  const resetFlips=()=>{for(const button of [...timers.keys()])closeFlip(button);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetFlips();});window.addEventListener('pagehide',resetFlips);
  if(settings){
    $('alter-ego-retry').addEventListener('click',listen);
    $('alter-ego-choose').addEventListener('click',choosePhoto);
    $('alter-ego-close').addEventListener('click',closeEditor);
    settings.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
    settings.addEventListener('click',event=>{if(event.target===settings){const box=settings.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeEditor();}});
    window.addEventListener('hashchange',()=>{selection++;draft='';preparing=false;$('alter-ego-file').value='';settings.close();paint();});
    $('alter-ego-file').addEventListener('change',async event=>{
      const version=++selection,file=event.target.files?.[0];draft='';error='';if(!file){paint();return;}
      preparing=true;openEditor();
      try{const photo=await prepareAlterEgo(file);if(version===selection)draft=photo;}
      catch(_){if(version===selection)error='That photo did not open. Try a JPG, PNG or a screenshot under 20 MB.';}
      finally{if(version===selection){preparing=false;event.target.value='';paint();}}
    });
    $('alter-ego-cancel').addEventListener('click',closeEditor);
    async function save(remove=false){
      if(busy||preparing||!loaded||document.body.dataset.profileOwner!=='true'||(!remove&&!draft))return;
      const next=draft;busy=true;error='';selection++;paint();const button=$(remove?'alter-ego-remove':'alter-ego-save');setButtonBusy(button,true,'saving…');
      try{await settleQuickly(remove?data.removeFrom('profilePhotos',viewer):data.setTo('profilePhotos',viewer,{person:viewer,photo:next,updatedAt:Date.now()}),'Your photo has not confirmed yet.');draft='';settings.close();toast(remove?'photo removed':'photo saved ♡');}
      catch(_){error='The photo change did not confirm. Check the connection and try again.';if(!settings.open)showFailure('the photo change did not confirm.','check the connection and try again.');}
      finally{busy=false;setButtonBusy(button,false);paint();}
    }
    $('alter-ego-save').addEventListener('click',()=>void save());$('alter-ego-remove').addEventListener('click',()=>void save(true));
  }
  schedule();
}
