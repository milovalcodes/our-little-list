import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {wordForDay} from '../daily-words.js';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777',errors=[],day='2026-10-20';
try{
 for(const width of [320,375,430]){
  const context=await browser.newContext({viewport:{width,height:812},timezoneId:width===320?'Asia/Tokyo':width===375?'America/New_York':'Europe/London',serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(Date.parse(day+'T18:00Z'));
  await page.goto(base+'/activities.html?as=her#wordle');await page.locator('#word-game [data-key]:not([disabled])').first().waitFor();
  await page.waitForFunction(()=>document.querySelector('#wordle .daily-state')?.textContent==='not played');
  assert.match(await page.locator('.word-partner').textContent(),/Emilio hasn’t tried/);
  await page.locator('.app-dock').waitFor({state:'hidden'}); // Navigation never covers an open daily board.
  await page.locator('#wordle>summary').click();await page.keyboard.type('abc');
  await page.locator('#wordle>summary').click();assert.equal(await page.locator('#word-game .word-row').first().textContent(),'');
  await page.keyboard.press('Control+a');assert.equal(await page.locator('#word-game .word-row').first().textContent(),'');
  await page.keyboard.type(wordForDay(day).word);
  if(width===375){
   await context.setOffline(true);await page.keyboard.press('Enter');assert.equal(await page.locator('#word-game .daily-results').count(),0);
   await context.setOffline(false);await page.locator('#word-game [data-key]:not([disabled])').first().waitFor();
  }
  await page.keyboard.press('Enter');
  await page.locator('#word-game .daily-results').waitFor();
  assert.match(await page.locator('#word-game .next-puzzle').textContent(),/19:00:00/);
  await page.waitForFunction(()=>document.querySelector('#wordle .daily-state')?.textContent.includes('played'));
  assert.equal(await page.locator('[data-game-reaction],.daily-crown').count(),0);
  await page.locator('.game-comfort summary').click();await page.locator('[data-comfort=colours]').check();assert.equal(await page.locator('html').evaluate(n=>n.classList.contains('game-colour-friendly')),true);
  if(width===375)await page.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer(),day='2026-10-18',at=Date.parse(day+'T14:00Z');
   localStorage.setItem('our-little-list-coronation-v1:her:2026-10-12','seen');
   await d.setTo('timedResults',day+'-crossword-her',{day,type:'crossword',person:'her',done:true,complete:true,count:6,total:6,startedAt:at,finishedAt:at+35000,durationMs:120000});
   await d.setTo('wordWeeks','2026-10-12',{week:'2026-10-12',end:'2026-10-18',format:'trio',scoreVersion:2,round:0,scores:{her:80,him:60},winners:['her'],settledAt:Date.parse('2026-10-19T13:00Z')});
  });
  await page.goto(base+'/her.html?as=her');await page.locator('.daily-strip a').first().waitFor();
  assert.match(await page.locator('#sky-greeting').textContent(),/Anely/);
  await page.waitForFunction(()=>document.querySelector('#home-next-up').textContent.includes('Word Search'));
  assert.doesNotMatch(await page.locator('#home-next-up').textContent(),/nothing needs you/);
  assert.equal(await page.locator('.our-sky').evaluate(n=>getComputedStyle(n).opacity),'1');
  if(width===375){await page.waitForFunction(()=>document.querySelector('.weekly-home-recap')?.textContent.includes('0:35'));assert.match(await page.locator('.weekly-home-recap').textContent(),/Anely.*crown/);assert.equal(await page.locator('.weekly-home-recap a').getAttribute('href'),'activities.html#scoreboard-2026-10-12');}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Daily habit UI: keyboard-only finish, closed-card guards, safe-area room, names, private state, countdown, Home and 320/375/430px pass');
}finally{await browser.close();}
