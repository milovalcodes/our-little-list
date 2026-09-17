import { createDataLayer } from './firebase-data.js';
import { setupAuthUI, setButtonBusy, showFailure } from './ui-helpers.js';
import { cachedProfile, saveCachedProfile } from './profile-store.js';

const $=id=>document.getElementById(id);
let data;let dirty=false;
const cached=cachedProfile();
$('sun-name').value=cached.sunName;
$('moon-name').value=cached.moonName;
document.querySelectorAll('#profile-form input').forEach(input=>input.addEventListener('input',()=>{dirty=true;$('profile-save-note').textContent='';}));

data=await createDataLayer({collectionName:'profiles',onItems(items){
  const profile=items.find(item=>item.id==='couple');
  if(!profile)return;
  saveCachedProfile(profile);
  if(!dirty){$('sun-name').value=profile.sunName||'';$('moon-name').value=profile.moonName||'';}
},onAuth(user){setupAuthUI(data,user);}});
if(data.mode==='local')setupAuthUI(data,{local:true});

$('profile-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const profile={sunName:$('sun-name').value.trim(),moonName:$('moon-name').value.trim(),updatedAt:Date.now()};
  if(!profile.sunName||!profile.moonName)return;
  setButtonBusy($('profile-save'),true,'saving…');
  try{
    await data.set('couple',profile);saveCachedProfile(profile);dirty=false;
    $('profile-save-note').textContent='saved ♡';
  }catch(_){showFailure('the names did not save.','check the internet and try again.');}
  finally{setButtonBusy($('profile-save'),false);}
});
