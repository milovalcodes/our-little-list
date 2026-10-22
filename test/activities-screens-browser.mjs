import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const screenshots=process.env.QA_SCREENSHOTS||'node_modules/.cache/activities';await mkdir(screenshots,{recursive:true});
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
try{
 for(const side of ['her','him'])for(const width of [390,1100]){
 const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:8777'?r.fallback():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-22T18:00Z'));
 await page.goto('http://127.0.0.1:8777/activities.html?as='+side);
 await page.waitForSelector('.crown-map').catch(async e=>{console.log(side,width,page.url(),errors,await page.locator('body').innerText());throw e;});
 assert.equal(await page.locator('#word-game,#search-game,#crossword-game').count(),0);
 assert.ok(await page.locator('#question-answer').isVisible());
 assert.equal(await page.locator('.activity-game-link').count(),3);
 for(const [id,host]of [['wordle','word-game'],['search','search-game'],['crossword','crossword-game']]){
 await page.locator('.activity-game-link#'+id).click();
 await page.waitForSelector('#'+host).catch(async e=>{console.log(page.url(),errors,await page.locator('body').innerText());throw e;});
 assert.equal(await page.locator('#word-game,#search-game,#crossword-game').count(),1);
 assert.equal(await page.locator('#question,#weekly-board').count(),0);
 assert.ok(await page.locator('#'+host).isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('.activity-back').click();await page.waitForSelector('.crown-map').catch(async e=>{console.log(side,width,page.url(),errors,await page.locator('body').innerText());throw e;});
 }
 await page.goto('http://127.0.0.1:8777/activities.html?as='+side+'#search');
 await page.waitForSelector('#search-game button');
 assert.match(page.url(),/game=search/);
 assert.deepEqual(errors,[]);
 await page.locator('.thinking-screen').waitFor({state:'hidden'});if(width===390)await page.screenshot({path:join(screenshots,'activities-'+side+'-game.png'),fullPage:true});
 await page.locator('.activity-back').click();await page.waitForSelector('.crown-map').catch(async e=>{console.log(side,width,page.url(),errors,await page.locator('body').innerText());throw e;});
 await page.locator('.thinking-screen').waitFor({state:'hidden'});if(width===390)await page.screenshot({path:join(screenshots,'activities-'+side+'.png'),fullPage:true});
 await context.close();
 }
 console.log('Activities hub and independent games pass for both sides at phone and desktop widths.');
}finally{await browser.close();}
