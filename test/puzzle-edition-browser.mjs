import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {timedPuzzle} from '../daily-puzzles.js';
import {wordForDay} from '../daily-words.js';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const base='http://127.0.0.1:8777',errors=[];
try{
 for(const [day,side]of [['2026-10-10','him'],['2026-10-11','her'],['2026-11-07','her'],['2026-11-08','him'],['2026-12-05','him'],['2026-12-06','her']]){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  const now=Date.parse(day+'T18:00Z');await page.clock.setFixedTime(now);
  await page.goto(base+'/activities.html?as='+side+'#search');
  for(const type of ['search','crossword']){
   const p=timedPuzzle(day,type);
   if(type==='crossword')await page.locator('#crossword>summary').click();
   await page.locator('#'+type+' [data-start]:not([disabled])').click();
   await page.locator('#'+type+' .puzzle-cell').first().waitFor();
   const started=type==='search'?now:now+100000;
   for(let n=0;n<p.entries.length;n++){
    // Allow ten seconds per find/clue. This is an input/timer test, not a human benchmark.
    await page.clock.setFixedTime(started+(n+1)*10000);
    const e=p.entries[n];
    if(type==='search'){
     await page.locator('#search [data-cell="'+e.start+'"]').click();
     await page.locator('#search [data-cell="'+(e.start+(e.word.length-1)*e.step)+'"]').click();
    }else{
     await page.locator('#crossword [data-clue="'+n+'"]').click();
     await page.locator('#crossword [data-answer]').fill(e.word);
     await page.locator('#crossword button[type=submit]').click();
    }
    await page.waitForFunction(({type,n})=>document.querySelectorAll('#'+type+' '+(type==='search'?'.search-words':'.crossword-clues')+' .found').length===n,{type,n:n+1});
   }
   assert.match(await page.locator('#'+type+'-summary').textContent(),new RegExp((p.hard?100:50)+' points'));
   await page.setViewportSize({width:320,height:700});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.setViewportSize({width:390,height:844});
  }
  await page.evaluate(()=>location.hash='wordle');
  const word=wordForDay(day);await page.locator('#wordle [data-key]').first().waitFor();
  for(const letter of word.word)await page.locator('#wordle [data-key="'+letter+'"]').click();
  await page.locator('#wordle [data-key="↵"]').click();
  await page.waitForFunction(()=>document.querySelector('#wordle').textContent.includes('100 points')||document.querySelector('#wordle').textContent.includes('200 points'));
  if(day==='2026-10-11')await page.screenshot({path:join(tmpdir(),'little-puzzles-v107.png'),fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('New edition mobile: both profiles, normal/Sunday, all seasons, all three games, two-minute completion mechanics and 320px layout pass');
}finally{await browser.close();}
