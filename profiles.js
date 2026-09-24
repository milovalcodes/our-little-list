import { sharedLayer, onAuthChange, whenReady } from './data-hub.js';
import { setupAuthUI, setButtonBusy, showFailure } from './ui-helpers.js';
import { awaitViewer, showNotAMember } from './viewer.js';
import { cachedProfile, saveCachedProfile } from './profile-store.js';

const $=id=>document.getElementById(id);
let data;
// Which boxes this phone has typed in since its last save. This used to be one
// flag for the whole form, so touching either name froze both of them: the
// other phone's rename stopped arriving, and the next save wrote this phone's
// stale copy of that name straight back over it.
const editing=new Set();
const cached=cachedProfile();
$('sun-name').value=cached.sunName;
$('moon-name').value=cached.moonName;
document.querySelectorAll('#profile-form input').forEach(input=>input.addEventListener('input',()=>{editing.add(input.id);$('profile-save-note').textContent='';}));

data=await sharedLayer();
onAuthChange(user=>setupAuthUI(data,user));
if(data.mode==='local')setupAuthUI(data,{local:true});

// Same gate as every other page: an account that signed in fine but is not one
// of the two members stops here instead of editing the household's names.
const viewer=await awaitViewer();
if(!viewer){showNotAMember();await new Promise(()=>{});}

whenReady(data,()=>{
  data.listenTo('profiles',items=>{
    const profile=items.find(item=>item.id==='couple');
    if(!profile)return;
    saveCachedProfile(profile);
    if(!editing.has('sun-name'))$('sun-name').value=profile.sunName||'';
    if(!editing.has('moon-name'))$('moon-name').value=profile.moonName||'';
  });
});

$('profile-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const profile={sunName:$('sun-name').value.trim(),moonName:$('moon-name').value.trim(),updatedAt:Date.now()};
  if(!profile.sunName||!profile.moonName)return;
  setButtonBusy($('profile-save'),true,'saving…');
  try{
    await data.setTo('profiles','couple',profile);saveCachedProfile(profile);editing.clear();
    $('profile-save-note').textContent='saved ♡';
  }catch(_){showFailure('the names did not save.','check the internet and try again.');}
  finally{setButtonBusy($('profile-save'),false);}
});
