import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777',errors=[];
const only=process.env.AUDIT_CASE;
async function page(){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const p=await context.newPage();p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push(e.message));return p;
}
try{
 if(!only||only==='photo'){
  const p=await page();await p.goto(base+'/status.html?as=him#profile-him');await p.waitForSelector('.profile-photo-edit:not(:disabled)');
  await p.setInputFiles('#alter-ego-file',{name:'broken.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not a picture')});
  await p.waitForFunction(()=>document.querySelector('#alter-ego-settings[open] [role=alert]')?.textContent.includes('JPG'));
  assert.equal(await p.locator('#alter-ego-save').isVisible(),false);assert.equal(await p.locator('#alter-ego-choose').isEnabled(),true);
  await p.setInputFiles('#alter-ego-file',fileURLToPath(new URL('../moon-profile.png',import.meta.url)));await p.locator('#alter-ego-save').waitFor({state:'visible'});
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();window.restorePhotoWrite=d.setTo;d.setTo=()=>Promise.reject(Error('test rejection'));});await p.click('#alter-ego-save');
  await p.waitForFunction(()=>document.querySelector('#alter-ego-settings[open] [role=alert]')?.textContent.includes('did not confirm'));
  assert.equal(await p.locator('#alter-ego-save').isEnabled(),true,'failed save retains the preview for retry');
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();d.setTo=window.restorePhotoWrite;});await p.click('#alter-ego-save');await p.waitForSelector('.has-alter-ego');
  console.log('RECOVERY: invalid photo has a visible error inside its modal, with change-photo still usable');
  const q=await page();await q.route('**/profile-names.js',r=>r.fulfill({contentType:'text/javascript',body:`import {startAlterEgos} from './alter-ego.js';let attempts=0;window.photoFailures=[];startAlterEgos({listenTo:(_,cb,options)=>{photoFailures.push(options.onError);queueMicrotask(()=>++attempts===1?options.onError():cb([]));return()=>{};}},'him');`}));
  await q.goto(base+'/status.html?as=him#profile-him');await q.waitForSelector('.profile-photo-edit:not(:disabled)');await q.click('.profile-photo-edit');
  await q.locator('#alter-ego-retry').waitFor({state:'visible'});await q.click('#alter-ego-retry');await q.waitForFunction(()=>document.querySelector('#alter-ego-retry').hidden&&!document.querySelector('#alter-ego-choose').disabled);
  await q.evaluate(()=>photoFailures[0]());assert.equal(await q.locator('#alter-ego-retry').isVisible(),false,'obsolete subscription errors do not undo recovery');
  console.log('RECOVERY: photo subscription failure can be retried without reloading, and stale errors are ignored');
 }
 if(!only||only==='scores'){
  const p=await page();await p.route('**/audit-harness.html',r=>r.fulfill({contentType:'text/html',body:'<div id="wins-history"></div>'}));
  await p.clock.install({time:new Date('2026-10-24T18:00Z')});await p.goto(base+'/audit-harness.html');
  await p.evaluate(async()=>{window.callbacks=[];const data={listenTo:(name,cb,opt)=>{callbacks.push({cb,opt});return()=>{};}};(await import('./win-history.js')).startWinHistory({data});});
  await p.clock.fastForward(13000);assert.match(await p.locator('#wins-history').textContent(),/Couldn’t load/);
  await p.evaluate(()=>callbacks[0].cb([{week:'2026-10-12',scoreVersion:2,scores:{her:50,him:40},winners:['her']}]));
  await p.locator('#win-2026-10-12').waitFor();
  await p.evaluate(()=>callbacks[0].opt.onError(Error('lost connection')));await p.click('[data-retry-wins]');
  await p.evaluate(()=>{callbacks[1].cb([]);callbacks[0].opt.onError(Error('obsolete'));callbacks[0].cb([{week:'2026-10-12'}]);});
  assert.equal(await p.locator('[data-retry-wins]').count(),0);assert.equal(await p.locator('#win-2026-10-12').count(),0);
  console.log('RECOVERY: delayed win history recovers, retry replaces failed subscriptions and obsolete callbacks are ignored');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
