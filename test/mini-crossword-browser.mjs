import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {weeklyRounds} from '../round-engine.js';
import {timedPoints} from '../timed-game.js';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
try{
 for(const [day,width] of [['2026-10-20',390],['2026-10-25',320]]){
  const mini=weeklyRounds(day)[day].crossword;
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const now=Date.parse(day+'T18:00Z');await page.clock.setFixedTime(now);
  await page.goto(base+'/activities.html?as=her#crossword');
  // Local mode draws legacy boards, so seed the engine's mini like the Worker would.
  await page.evaluate(async p=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('timedPuzzles',p.day+'-crossword',p);},mini);
  await page.locator('#crossword .timed-ready').waitFor();
  if(!await page.locator('#crossword').evaluate(d=>d.open))await page.locator('#crossword>summary').click();
  assert.match(await page.locator('#crossword .timed-ready').textContent(),new RegExp((mini.hard?'3:00':'2:00')+'.*up to '+(mini.hard?120:60)+' points'));
  await page.locator('#wordle').evaluate(d=>d.open=true); // Another open board must not steal crossword keystrokes.
  await page.locator('#crossword [data-start]:not([disabled])').click();
  await page.locator('#crossword .puzzle-cell.cursor').waitFor();
  assert.equal(await page.locator('#crossword .puzzle-cell').count(),21,'a 5x5 lattice has 21 open squares');
  assert.equal(await page.locator('#crossword .puzzle-wall').count(),4);
  // The keyboard works straight after start, without tapping a square first.
  const first=mini.entries.find(e=>e.start===0&&e.step===1);
  for(const ch of first.word)await page.keyboard.press(ch.toLowerCase());
  assert.equal(await page.locator('#crossword .timed-toolbar span').textContent(),'5 / 21 squares');
  assert.equal(await page.locator('#crossword .found').count(),0);
  assert.equal(await page.locator('#word-game .word-row').first().textContent(),'','crossword typing never edits another open game');
  for(let i=0;i<mini.entries.length;i++){
   const e=mini.entries[i];if(!await page.locator('#crossword .crossword-keys').count())break;
   await page.locator(`#crossword [data-clue="${i}"]`).click();
   if(await page.locator('#crossword .puzzle-cell.cursor').getAttribute('data-cell')!==String(e.start))await page.locator(`#crossword [data-cell="${e.start}"]`).click();
   for(const ch of e.word){if(!await page.locator('#crossword .crossword-keys').count())break;await page.keyboard.press(ch.toLowerCase());}
  }
  await page.waitForFunction(()=>document.querySelector('#crossword-summary').textContent.includes('6 / 6 found'));
  const expected=timedPoints({day,type:'crossword',total:6,count:6,startedAt:now,finishedAt:now,done:true,complete:true,durationMs:mini.durationMs});
  assert.match(await page.locator('#crossword-summary').textContent(),new RegExp('^'+expected+' points'));
  assert.equal(await page.locator('#crossword .crossword-clues .found').count(),6);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('MINI CROSSWORD UI: 5x5 lattice, 2:00/3:00 clocks, keyboard right after start, silent credit, full-grid finish with time bonus and 320px layout pass');
}finally{await browser.close();}
