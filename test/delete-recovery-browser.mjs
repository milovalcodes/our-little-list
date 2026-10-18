import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8777',browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:320,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/dates.html?as=him');await page.locator('.app-dock').waitFor();await page.locator('.thinking-screen').waitFor({state:'hidden'});
 await page.clock.install();
 await page.evaluate(async()=>{
  const {deleteWithUndo}=await import('./undo-delete.js');window.deleted=[];
  window.queueDelete=id=>deleteWithUndo({removeFrom:async(name,id)=>window.deleted.push(id)},'items',id);
  window.queueDelete('first');
 });
 await page.clock.runFor(4000);await page.evaluate(()=>window.queueDelete('second'));await page.clock.runFor(1500);
 assert.match(await page.locator('.undo-toast').textContent(),/2 deleted/);
 await page.locator('.undo-toast button').click();await page.clock.runFor(6000);
 assert.deepEqual(await page.evaluate(()=>window.deleted),[],'the grouped undo must restore both items throughout its displayed window');
 await page.evaluate(async()=>{
  const d=await(await import('./data-hub.js')).sharedLayer();
  for(const id of ['deleted','kept'])await d.setTo('dates',id,{title:id,note:'',vibe:'go out',addedBy:'him',createdAt:Date.now(),done:false});
  const {deleteWithUndo}=await import('./undo-delete.js');deleteWithUndo(d,'dates','deleted',{onChange:()=>dispatchEvent(new Event('littlelist:profile'))});
  Math.random=()=>.999;
 });
 await page.locator('#pick-random').click();
 assert.equal(await page.locator('#random-date strong').textContent(),'kept','roulette excludes pending deletions');
 await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.updateIn('dates','kept',{title:'edited date'});});
 assert.equal(await page.locator('#random-date strong').textContent(),'edited date','a selected idea follows live edits');
  await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.updateIn('dates','kept',{done:true});});
  assert.equal(await page.locator('#date-plan').isVisible(),false,'a completed selection cannot still be planned');
  await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.updateIn('dates','kept',{done:false});});
  await page.locator('#pick-random').click();
 await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.removeFrom('dates','kept');});
 assert.equal(await page.locator('#date-plan').isVisible(),false,'a deleted selection cannot still be planned');
 // Expiry and leaving the page still commit each deletion exactly once.
 await page.evaluate(()=>{window.queueDelete('third');window.queueDelete('fourth');});await page.clock.runFor(5001);
 assert.deepEqual(await page.evaluate(()=>window.deleted),['third','fourth']);
 await page.evaluate(async()=>{window.queueDelete('fifth');(await import('./undo-delete.js')).flushPendingDeletes();});await page.clock.runFor(6000);
 assert.deepEqual(await page.evaluate(()=>window.deleted),['third','fourth','fifth']);
 assert.deepEqual(errors,[]);
 console.log('DELETE RECOVERY: grouped undo window, single expiry/flush, pending-deletion roulette filtering, live edits and removed selections pass');
}finally{await browser.close();}

