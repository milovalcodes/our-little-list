// Explicit small-change coverage. Unknown files and shared infrastructure fall
// back to the existing broad suite; adding an exemption requires coverage here.
const notificationTests=['delivery','push-client','notification-paths','notification-click','delivery-worker','immediate-delivery'];
const automation=/^(?:\.github\/workflows\/checks\.yml|scripts\/(?:check-scope|focused-checks|run-focused-checks)\.mjs|test\/check-scope\.test\.mjs)$/;
const docs=/^(?:README|CLAUDE)\.md$|^docs\/.+\.md$/;
const pages=new Set(['index','him','her','today','tasks','notes','dates','memories','status','activities','games','practice','phone-check','guide']);
export function focusedPlan(files,{versionOnly=false}={}){
 if(!files.length)return null;
 const unit=new Set(),browser=new Set(),page=new Set();
 let syntax=false;
 for(const file of files){
  if(automation.test(file)||docs.test(file))continue;
  if(/^(?:(?:daily-question|question-prompts|activity-clock|win-[\w-]+|activities)\.js|activities-layout\.css|test\/retirement\.test\.mjs)$/.test(file)){
   syntax=true;['retirement','navigation-attention','memory-catalog','precache','offline'].forEach(t=>unit.add(t));browser.add('retirement');continue;
  }
  // This self-contained UI fixture uses the standard local browser harness.
  const fixture={'test/declutter-browser.mjs':'declutter','test/retirement-browser.mjs':'retirement'}[file];
  if(fixture){browser.add('declutter');browser.add('retirement');continue;}
  if(['app-chrome.js','app-life.css','dock-viewport.js','test/dock-scroll-browser.mjs'].includes(file)){
   syntax=true;
   ['navigation-attention','home-parity','guide-contract','seasonal','precache'].forEach(test=>unit.add(test));
   ['dock-scroll','app-life','appearance','retirement'].forEach(test=>browser.add(test));
   continue;
  }
  // Main-app presentation is shared across destinations, but does not load the
  // separate Little Star document or change account/backend behavior.
  if(['styles.css','app-life.js','interface-icons.js','test/interface-design-browser.mjs'].includes(file)||file.startsWith('fonts/')){
   syntax=true;
   ['branding','home-parity','guide-contract','precache','offline','cache-lifetime'].forEach(test=>unit.add(test));
   ['interface-design','app-life','appearance','retirement','routines','memories','delete-recovery','dock-scroll'].forEach(test=>browser.add(test));
   continue;
  }
  if(['status.js','status-presets.js'].includes(file)){
   syntax=true;unit.add('merged');browser.add('alter-ego');browser.add('interface-design');page.add('status');continue;
  }
  if(file==='service-worker.js'){
   for(const test of ['precache','offline','cache-lifetime'])unit.add(test);
   if(!versionOnly){unit.add('notification-click');unit.add('notification-paths');browser.add('update-freshness');browser.add('lifecycle');}
   continue;
  }
  const html=/^([\w-]+)\.html$/.exec(file);
  if(html&&pages.has(html[1])){
   page.add(html[1]);unit.add('precache');
   if(['him','her'].includes(html[1]))unit.add('home-parity');
   if(html[1]==='guide')unit.add('guide-contract');
   if(['activities','games','today'].includes(html[1]))browser.add('retirement');
   continue;
  }
  if(/^(?:notification-policy|notification-preferences|pings-settings|push-client|live-notes)\.js$/.test(file)){
   notificationTests.forEach(test=>unit.add(test));page.add('phone-check');syntax=true;continue;
  }
  if(file==='game-comfort.js'){
   unit.add('interface-audio');page.add('phone-check');page.add('activities');syntax=true;continue;
  }
  if(/^(?:tasks|routines|recurrence)\.js$/.test(file)){
   ['routines','recurrence'].forEach(test=>unit.add(test));browser.add('routines');page.add('tasks');syntax=true;continue;
  }
  if(file==='notes.js'){browser.add('delete-recovery');page.add('notes');syntax=true;continue;}
  if(/^(?:memories|memory-catalog)\.js$/.test(file)){unit.add('memory-catalog');browser.add('memories');page.add('memories');syntax=true;continue;}
  if(file==='guide.js'){unit.add('guide-contract');page.add('guide');syntax=true;continue;}
  if(/^test\/[\w-]+\.test\.mjs$/.test(file)&&!/-rules\.test\.mjs$/.test(file)){
   unit.add(file.slice(5,-9));continue;
  }
  // Browser fixtures and emulator tests need their owning suite's setup.
  return null;
 }
 return {syntax,unit:[...unit].sort(),browser:[...browser].sort(),pages:[...page].sort()};
}
