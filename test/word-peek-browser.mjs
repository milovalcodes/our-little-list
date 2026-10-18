import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const base='http://127.0.0.1:8777',errors=[];
try{
 const context=await browser.newContext({viewport:{width:320,height:700},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-09T18:00Z'));
 await page.goto(base+'/activities.html?as=him#wordle');await page.waitForSelector('.word-keyboard button:not([disabled])');
 await page.evaluate(async()=>{
  const d=await(await import('./data-hub.js')).sharedLayer(),day='2026-10-09';
  await d.setTo('wordPuzzles',day,{day,word:'apple',opensAt:1,closesAt:4102444800000});
  await d.setTo('wordGames',day+'-him',{day,person:'him',guesses:['apple'],done:true,won:true});
  await d.setTo('wordResults',day+'-her',{day,person:'her',attempts:1,done:false,won:false});
  const read=d.readDoc.bind(d);window.peekReads=0;
  d.readDoc=async(...args)=>{if(args[0]==='wordGames'){window.peekReads++;if(window.peekFail)throw new Error('offline');}return read(...args);};
 });
 assert.equal(await page.locator('[data-word-peek]').count(),0);
 assert.equal(await page.evaluate(()=>window.peekReads),0,'no prefetching private guesses');
 await page.evaluate(async()=>{
  const d=await(await import('./data-hub.js')).sharedLayer(),day='2026-10-09';
  window.peekFail=true;
  await d.setTo('wordGames',day+'-her',{day,person:'her',guesses:['grape','table','crane','beach','crown'],done:true,won:false});
  await d.setTo('wordResults',day+'-her',{day,person:'her',attempts:5,done:true,won:false});
 });
 await page.waitForSelector('[data-round-grid-retry]');
 assert.match(await page.locator('.shared-grid-status').textContent(),/couldn’t load/);
 await page.evaluate(()=>{window.peekFail=false;});await page.click('[data-round-grid-retry]');
 await page.waitForSelector('.shared-grid:last-child .shared-word-row');
 assert.equal(await page.locator('.shared-grid:last-child .shared-word-row').count(),5,'misses reveal the whole process too');
 assert.equal(await page.locator('.shared-grid:last-child .shared-word-row').first().textContent(),'grape');
 assert.equal(await page.locator('.shared-grid:last-child .shared-word-row').last().textContent(),'crown');
 assert.ok(await page.locator('.shared-grid:last-child .present').count()>0);
 assert.ok(await page.locator('.shared-grid:last-child .absent').count()>0);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(await page.locator('[data-word-peek]').count(),0,'no extra reveal button');
 assert.equal(await page.evaluate(()=>window.peekReads),2,'one failed automatic read and one successful retry');
 await page.reload();await page.waitForSelector('.shared-grid:last-child .shared-word-row');
 assert.equal(await page.locator('.shared-grid:last-child .shared-word-row').count(),5,'letters reappear automatically after reopening');
 assert.deepEqual(errors,[]);
 console.log('WORD REVEAL: no early fetch, automatic unlock, missed boards, exact letters and colours, failure/retry, 320px layout and reload pass');
}finally{await browser.close();}
