import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {wordForDay} from '../daily-words.js';
import {timedPuzzle} from '../daily-puzzles.js';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
try{
 for(const side of ['her','him'])for(const day of ['2026-10-10','2026-10-11','2026-12-05','2026-12-06','2027-01-04']){
  const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'Pacific/Auckland'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date(day+'T18:00Z'));
  await page.goto(base+'/activities.html?as='+side+'#wordle');
  await page.locator('#word-game [data-key]:not([disabled])').first().waitFor();
  const word=wordForDay(day),hard=word.difficulty==='hard';
  assert.match(await page.locator('#word-game .word-heading').textContent(),new RegExp(word.theme));
  for(const letter of word.word)await page.click('#word-game [data-key="'+letter+'"]');
  await page.click('#word-game [data-key="↵"]');
  await page.waitForFunction(points=>document.querySelector('#word-summary').textContent.includes(points+' points'),hard?200:100);
  for(const type of ['search','crossword']){
   await page.locator('#'+type+'>summary').click();
   const p=timedPuzzle(day,type);
   assert.match(await page.locator('#'+type+' .puzzle-theme').textContent(),new RegExp(p.theme));
   assert.match(await page.locator('#'+type+' .timed-ready').textContent(),new RegExp((hard?100:50)+' points'));
  }
  assert.match(await page.locator('#search>summary').textContent(),/Word Search/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.reload();await page.waitForFunction(points=>document.querySelector('#word-summary').textContent.includes(points+' points'),hard?200:100);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('SEASONAL UI: both profiles, October/December normal and hard puzzles, January reset, accepted seasonal answers, saved scores and 320px travel-timezone layout pass');
}finally{await browser.close();}
