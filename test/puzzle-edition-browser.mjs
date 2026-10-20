import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {timedPuzzle} from '../daily-puzzles.js';
import {wordForDay} from '../daily-words.js';
import {wordPoints} from '../word-scores.js';
import {timedPoints} from '../timed-game.js';
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
   const seconds=(p.durationMs||120000)/1000,limit=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
   await page.waitForFunction(({type,limit})=>document.querySelector('#'+type).textContent.includes(limit),{type,limit});
   const started=await page.evaluate(()=>Date.now());
   await page.locator('#'+type+' [data-start]:not([disabled])').click();
   await page.locator('#'+type+' .puzzle-cell').first().waitFor();
   if(type==='crossword')await page.locator('#crossword .crossword-expand').click();
   for(let n=0;n<p.entries.length;n++){
    // Hard boards exercise the new time beyond 2:00, not just their labels.
    // This is an input/deadline test, not a human difficulty benchmark.
    const step=p.durationMs>120000?(p.durationMs-10000)/p.entries.length:10000;
    await page.clock.setFixedTime(started+(n+1)*step);
    const e=p.entries[n];
    if(type==='search'){
     await page.locator('#search [data-cell="'+e.start+'"]').click();
     await page.locator('#search [data-cell="'+(e.start+(e.word.length-1)*e.step)+'"]').click();
    }else{
     await page.locator('#crossword [data-clue="'+n+'"]').click();
     if(await page.locator('#crossword .puzzle-cell.cursor').getAttribute('data-cell')!==String(e.start))await page.locator('#crossword [data-cell="'+e.start+'"]').click();
     for(const ch of e.word)await page.keyboard.press(ch.toLowerCase());
    }
    // Crossword credit is saved silently, so wait on the saved game itself.
    if(type==='search')await page.waitForFunction(n=>document.querySelectorAll('#search .search-words .found').length===n,n+1);
    else for(let tries=0;await page.evaluate(async({day,side})=>(await(await(await import('./data-hub.js')).sharedLayer()).readDoc('timedGames',day+'-crossword-'+side))?.solved.length||0,{day,side})<n+1;tries++){assert.ok(tries<80,'crossword word '+n+' saved');await page.waitForTimeout(100);}
   }
   const step=p.durationMs>120000?(p.durationMs-10000)/p.entries.length:10000;
   const expected=timedPoints({day,type,total:p.entries.length,count:p.entries.length,startedAt:started,finishedAt:started+p.entries.length*step,done:true,complete:true,durationMs:p.durationMs});
   assert.match(await page.locator('#'+type+'-summary').textContent(),new RegExp('^'+expected+' points'));
   await page.setViewportSize({width:320,height:700});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.setViewportSize({width:390,height:844});
  }
  await page.evaluate(()=>location.hash='wordle');
  const word=wordForDay(day);await page.locator('#wordle [data-key]').first().waitFor();
  for(const letter of word.word)await page.locator('#wordle [data-key="'+letter+'"]').click();
  await page.locator('#wordle [data-key="↵"]').click();
  await page.waitForFunction(points=>document.querySelector('#wordle').textContent.includes(points+' points'),wordPoints({day,done:true,won:true,attempts:1}));
  if(day==='2026-10-11')await page.screenshot({path:join(tmpdir(),'little-puzzles-v108.png'),fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('New edition mobile: both profiles, all seasons, normal/hard timers, completion past two minutes, all games and 320px layout pass');
}finally{await browser.close();}
