import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777',day='2026-10-20',now=Date.parse(day+'T18:00Z');
try{
 for(const type of ['search','crossword']){
  const context=await browser.newContext({viewport:{width:320,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(now);
  await page.goto(`${base}/activities.html?as=him#${type}`);await page.locator(`#${type} [data-start]`).waitFor();
  await page.evaluate(async({type,day,now})=>{
   const d=await(await import('./data-hub.js')).sharedLayer(),p=(await import('./daily-puzzles.js')).timedPuzzle(day,type),{newTimedGame,timedSummary}=await import('./timed-game.js');
   await d.setTo('timedPuzzles',`${day}-${type}`,p);
   const mine={...newTimedGame(p,'him',now-600000),done:true,complete:false,finishedAt:now-300000,solved:[0],foundAt:[12000]};
   await d.setTo('timedGames',`${day}-${type}-him`,mine);await d.setTo('timedResults',`${day}-${type}-him`,timedSummary(mine));
   const read=d.readDoc.bind(d);window.routeReads=0;
   d.readDoc=async(...args)=>{if(args[0]==='timedGames'&&args[1]===`${day}-${type}-her`){window.routeReads++;if(window.routeFail)throw Error('offline');}return read(...args);};
  },{type,day,now});
  assert.equal(await page.evaluate(()=>window.routeReads),0,'no private route read before both finish');
  assert.equal(await page.locator(`#${type} .timed-routes`).count(),0);
  await page.evaluate(async({type,day,now})=>{
   window.routeFail=true;
   const d=await(await import('./data-hub.js')).sharedLayer(),p=(await import('./daily-puzzles.js')).timedPuzzle(day,type),{newTimedGame,timedSummary}=await import('./timed-game.js');
   const theirs={...newTimedGame(p,'her',now-600000),done:true,complete:false,finishedAt:now-300000,solved:[],foundAt:[]};
   await d.setTo('timedGames',`${day}-${type}-her`,theirs);await d.setTo('timedResults',`${day}-${type}-her`,timedSummary(theirs));
  },{type,day,now});
  await page.locator(`#${type} [data-route-retry]`).waitFor();
  await page.evaluate(()=>{window.routeFail=false;});await page.locator(`#${type} [data-route-retry]`).click();
  await page.waitForFunction(type=>document.querySelectorAll(`#${type} .timed-route`).length===2,type);
  assert.match(await page.locator(`#${type} .timed-route:last-child`).textContent(),/no words found/);
  assert.equal(await page.evaluate(()=>window.routeReads),2,'automatic read plus explicit error retry');
  assert.equal(await page.locator('[data-peek]').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.reload();await page.locator(`#${type} .timed-route:last-child`).waitFor();
  assert.equal(await page.locator(`#${type} .timed-route`).count(),2,'both routes restore without a toggle');
  await page.evaluate(async({type,day})=>{const d=await(await import('./data-hub.js')).sharedLayer(),p=(await import('./daily-puzzles.js')).timedPuzzle(day,type);await d.setTo('timedPuzzles',`${day}-${type}`,{...p,revision:1});},{type,day});
  await page.waitForFunction(type=>!document.querySelector(`#${type} .timed-routes`),type);
  assert.deepEqual(errors,[]);await context.close();
  console.log(`TIMED REVEAL ${type}: private until both finish, automatic load, failure/retry, empty route, reload, revision reset and 320px layout pass`);
 }
}finally{await browser.close();}
