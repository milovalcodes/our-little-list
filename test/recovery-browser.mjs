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
  const p=await page();await p.route('**/audit-harness.html',r=>r.fulfill({contentType:'text/html',body:'<div id="weekly-score"></div><div id="weekly-board"></div>'}));
  await p.clock.install({time:new Date('2026-10-09T18:00Z')});await p.goto(base+'/audit-harness.html');
  await p.evaluate(async()=>{window.callbacks={};const data={listenTo:(name,cb)=>{callbacks[name]=cb;return()=>{};},listenToQuery:(name,_,cb)=>{callbacks[name]=cb;return()=>{};}};(await import('./weekly-tracker.js')).startWeeklyTracker({data});});
  await p.clock.fastForward(13000);assert.match(await p.locator('#weekly-board').textContent(),/Couldn’t load/);
  await p.evaluate(()=>Object.values(callbacks).forEach(cb=>cb([])));
  await p.waitForFunction(()=>document.querySelector('#weekly-score').textContent.includes('☀ 0 · ☾ 0'));
  console.log('RECOVERY: delayed scoreboard snapshots clear the timeout without a reload');
 }
 if(!only||only==='drag'){
  const p=await page();await p.clock.setFixedTime(new Date('2026-10-09T18:00Z'));await p.goto(base+'/activities.html?as=him#search');await p.click('#search [data-start]');
  const cell=p.locator('#search [data-cell="0"]');await cell.scrollIntoViewIfNeeded();const box=await cell.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer(),id='2026-10-09-search-him',g=await d.readDoc('timedGames',id);await d.setTo('timedGames',id,{...g,solved:[0],foundAt:[1000]});});
  await p.locator('#search-game').dispatchEvent('pointercancel',{pointerId:1});
  await p.waitForFunction(()=>document.querySelectorAll('#search .search-words .found').length===1);
  await p.mouse.up();assert.equal(await p.locator('#search .tracing').count(),0);
  await p.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));await p.clock.setFixedTime(new Date('2026-10-09T18:02:01Z'));
  await p.waitForFunction(()=>document.querySelector('#search-summary').textContent.includes('points'));
  assert.equal(await p.locator('#search .puzzle-cell:not(:disabled)').count(),0);
  console.log('RECOVERY: cancelled drags repaint saved progress; offline expiry ends the board without accepting extra words');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
