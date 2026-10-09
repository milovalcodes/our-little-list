import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8777',browser=await chromium.launch(),errors=[];
try{
 const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const side of ['her','him']){
  for(const path of ['games.html#game-connect-four','today.html#game','activities.html#shelf','activities.html#game-dots-boxes']){
   const [file,hash]=path.split('#');await page.goto(base+'/'+file+'?as='+side+'#'+hash);
   await page.waitForURL('**/activities.html?as='+side+'#daily');await page.locator('#search').waitFor();
   assert.equal(await page.locator('#game,.game-shelf-item,[data-activity-view]').count(),0);
   assert.equal(await page.locator('#daily-question,#wordle,#search,#crossword').count(),4);
  }
  await page.evaluate(()=>localStorage.setItem('our-little-list-games-v1',JSON.stringify({items:[{id:'connect-four',round:'old',ply:0,turn:'him',closed:false}]})));
  await page.goto(base+'/'+side+'.html?as='+side);await page.locator('.app-dock').waitFor();
  assert.equal(await page.locator('a[href*="#game"]').count(),0);
  assert.equal(await page.locator('a[href*="#shelf"]').count(),0);
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('our-little-list-games-v1')).items.length===1),'retired records stay intact');
 }
 assert.deepEqual(errors,[]);console.log('DAILY-ONLY NAVIGATION: retired links land safely, no arcade tab or Home shortcuts, old records preserved');
}finally{await browser.close();}
