import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {timedPuzzle,entryCells} from '../daily-puzzles.js';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const base='http://127.0.0.1:8777',errors=[];
try{
 for(const side of ['her','him']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const day='2026-10-12',now=Date.parse(day+'T18:00Z'),p=timedPuzzle(day,'search');
  await page.clock.setFixedTime(now);await page.goto(base+'/activities.html?as='+side+'#search');
  await page.locator('#search [data-start]:not([disabled])').click();await page.locator('#search .puzzle-cell').first().waitFor();
  await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer(),play=d.playTimedPuzzle.bind(d);window.saveCalls=0;window.failFind=false;d.playTimedPuzzle=async options=>{window.saveCalls++;await new Promise(r=>setTimeout(r,1400));if(window.failFind){window.failFind=false;throw Error('Test connection interrupted. Select the word again.');}return play(options);};});
  const tap=async cell=>{const el=page.locator('#search [data-cell="'+cell+'"]');await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);};
  const select=async i=>{const cells=entryCells(p,i);await tap(cells[0]);assert.ok(await page.locator('#search .tracing').count());await tap(cells.at(-1));};
  await select(0);
  assert.ok(await page.locator('#search .pending-find').count(),'touch selection is acknowledged before the delayed save');
  assert.equal(await page.locator('#search .search-words .found').count(),0,'no unconfirmed credit');
  await select(1); // The grid remains usable during the first save.
  await page.waitForFunction(()=>document.querySelectorAll('#search .search-words .found').length===2);
  assert.equal(await page.evaluate(()=>window.saveCalls),2,'one save per touch selection');
  await page.evaluate(()=>{window.failFind=true;});await select(2);
  await page.waitForFunction(()=>document.querySelector('#search .timed-feedback').textContent.includes('interrupted'));
  assert.equal(await page.locator('#search .pending-find').count(),0,'failed save rolls back the visual');
  assert.equal(await page.locator('#search .search-words .found').count(),2);
  await select(2);await page.waitForFunction(()=>document.querySelectorAll('#search .search-words .found').length===3);
  await page.clock.setFixedTime(now+120001);
  await page.waitForFunction(()=>document.querySelectorAll('#search .search-words .missed-word').length===7);
  assert.equal(await page.locator('#search .search-words .found').count(),3);
  const missed=new Set(p.entries.flatMap((_,i)=>i<3?[]:entryCells(p,i)));
  assert.equal(await page.locator('#search .puzzle-cell.missed-word').count(),missed.size);
  assert.match(await page.locator('#search-summary').textContent(),/15 points/);
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#search .search-words .missed-word').length===7);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('SEARCH TOUCH: both sides, touch endpoints, immediate pending feedback, queued saves, no phantom points, failure recovery and missed-word reveal pass');
}finally{await browser.close();}
