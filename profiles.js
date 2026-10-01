// The names form, part of Settings (phone-check.html). The page's own module
// handles the sign-in gate.
import { sharedLayer, whenReady } from './data-hub.js';
import { showFailure } from './ui-helpers.js';
import { awaitViewer } from './viewer.js';
import { cachedProfile, saveCachedProfile } from './profile-store.js';

const $=id=>document.getElementById(id);
let data;
// Which boxes this phone has typed in since its last save. This used to be one
// flag for the whole form, so touching either name froze both of them: the
// other phone's rename stopped arriving, and the next save wrote this phone's
// stale copy of that name straight back over it.
const editing=new Set();
let saveTimer=0;let saving=false;let editVersion=0;
const cached=cachedProfile();
$('sun-name').value=cached.sunName;
$('moon-name').value=cached.moonName;
document.querySelectorAll('#profile-form input').forEach(input=>input.addEventListener('input',()=>{editing.add(input.id);editVersion++;$('profile-save-note').textContent='saving…';window.clearTimeout(saveTimer);saveTimer=window.setTimeout(()=>void saveNames(),700);}));

data=await sharedLayer();

// Same gate as every other page: an account that signed in fine but is not one
// of the two members stops here instead of editing the household's names.
const viewer=await awaitViewer();
if(!viewer)await new Promise(()=>{}); // phone-check.js shows the not-a-member screen

whenReady(data,()=>{
  data.listenTo('profiles',items=>{
    const profile=items.find(item=>item.id==='couple');
    if(!profile)return;
    saveCachedProfile(profile);
    if(!editing.has('sun-name'))$('sun-name').value=profile.sunName||'';
    if(!editing.has('moon-name'))$('moon-name').value=profile.moonName||'';
  });
});

$('profile-form').addEventListener('submit',event=>{event.preventDefault();window.clearTimeout(saveTimer);void saveNames();});
async function saveNames(){
  if(saving){window.clearTimeout(saveTimer);saveTimer=window.setTimeout(()=>void saveNames(),350);return;}
  const profile={sunName:$('sun-name').value.trim(),moonName:$('moon-name').value.trim(),updatedAt:Date.now()};
  if(!profile.sunName||!profile.moonName){$('profile-save-note').textContent='both names first';return;}
  saving=true;
  const savingVersion=editVersion;
  try{
    await data.setTo('profiles','couple',profile);saveCachedProfile(profile);
    if(savingVersion===editVersion){editing.clear();$('profile-save-note').textContent='saved ♡';}
  }catch(_){showFailure('the names did not save.','check the internet and try again.');}
  finally{saving=false;}
}
