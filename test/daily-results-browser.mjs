import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {wordForDay} from '../daily-words.js';
import {wordPoints} from '../word-scores.js';
const base='http://127.0.0.1:8777',day='2026-10-20',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
try{
 const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 // No share sheet here, so sharing falls back to the clipboard; capture it.
 await context.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:undefined});window.copied=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.copied.push(t);}}});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const now=Date.parse(day+'T18:00Z');await page.clock.setFixedTime(now);
 await page.goto(base+'/activities.html?as=her#wordle');
 await page.locator('#word-game [data-key]:not([disabled])').first().waitFor();
 const partnerWin={day,person:'him',attempts:4,won:true,done:true,updatedAt:2};
 await page.evaluate(async him=>{const d=await(await import('./data-hub.js')).sharedLayer();
  for(const [day,attempts] of [['2026-10-15',4],['2026-10-17',2],['2026-10-18',3],['2026-10-19',3]])await d.setTo('wordResults',day+'-her',{day,person:'her',attempts,won:true,done:true,updatedAt:1});
  await d.setTo('wordResults',him.day+'-him',him);},partnerWin);
 // Before she plays: no attempts or points for him, in the game or the weekly race.
 await page.waitForFunction(()=>document.querySelector('#word-game .word-partner').textContent.includes('has finished'));
 assert.doesNotMatch(await page.locator('#word-game .word-partner').textContent(),/points|\d \/ \d/);
 await page.locator('#scoreboard>summary').click();
 await page.waitForFunction(()=>document.querySelector('#weekly-board')?.textContent.includes('hidden until you finish yours'));
 assert.match(await page.locator('#weekly-score').textContent(),/☾ 0/);
 await page.locator('#scoreboard>summary').click();
 const word=wordForDay(day).word,guess=word==='crane'?'slate':'crane';
 for(const g of [guess,word]){for(const ch of g)await page.click(`#word-game [data-key="${ch}"]`);await page.click('#word-game [data-key="↵"]');await page.waitForFunction(n=>document.querySelectorAll('#word-game .word-row .word-tile.correct,#word-game .word-row .word-tile.present,#word-game .word-row .word-tile.absent').length>=n,g===word?10:5);}
 // After: side by side, streak and distribution, and a spoiler-free share grid.
 await page.locator('#word-game .daily-results').waitFor();
 const compare=await page.locator('#word-game .result-compare').textContent();
 assert.match(compare,/You\s*2 \/ 6\s*50 points/);assert.match(compare,new RegExp('4 / 6\\s*'+wordPoints(partnerWin)+' points'));
 assert.deepEqual(await page.locator('#word-game .result-stats dd').allTextContents(),['5','100','4','4']);
 assert.equal(await page.locator('#word-game .guess-bars .today b').textContent(),'2');
 await page.click('#word-game [data-share]');await page.waitForFunction(()=>window.copied.length===1);
 const shared=await page.evaluate(()=>window.copied[0]);
 assert.match(shared,/^Little Word · Oct 20 · 2\/6\n[🟩🟨⬛]{5}\n🟩🟩🟩🟩🟩$/u);assert.ok(!shared.toLowerCase().includes(word));
 assert.match(await page.locator('#word-game .share-note').textContent(),/copied/);
 // Once she has played, the weekly race shows his word again.
 await page.locator('#scoreboard>summary').click();
 await page.waitForFunction(points=>document.querySelector('#weekly-score').textContent.includes('☾ '+points),wordPoints(partnerWin));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);
 console.log('DAILY RESULTS UI: partner hidden until you finish (game and weekly race), side-by-side results, streak, guess distribution, share grid and 320px layout pass');
}finally{await browser.close();}
