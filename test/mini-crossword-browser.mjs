import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {weeklyRounds} from '../round-engine.js';
import {timedPoints} from '../timed-game.js';
import {crosswordWindow} from '../crossword-view.js';
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
  assert.match(await page.locator('#crossword .timed-ready').textContent(),new RegExp((mini.hard?'5:00':'3:00')+'.*up to '+(mini.hard?120:60)+' points'));
  assert.equal(await page.locator('#word-game,#search-game').count(),0,'the dedicated crossword screen mounts only its own board');
  await page.locator('#crossword [data-start]:not([disabled])').click();
  await page.locator('#crossword .puzzle-cell.cursor').waitFor();
  await page.locator('#crossword .crossword-expand').click();
  assert.equal(await page.locator('#crossword .puzzle-cell').count(),mini.grid.replaceAll('#','').length);
  assert.ok(mini.size>5);
  // Only the playable window is drawn: edge rows and columns of walls are trimmed.
  assert.equal(await page.locator('#crossword .puzzle-wall').count(),crosswordWindow(mini).cells.filter(i=>mini.grid[i]==='#').length);
  // The keyboard works straight after start, without tapping a square first.
  const first=mini.entries[0];
  for(const ch of first.word)await page.keyboard.press(ch.toLowerCase());
  assert.equal(await page.locator('#crossword .timed-toolbar span').textContent(),first.word.length+' / '+mini.grid.replaceAll('#','').length+' squares');
  assert.equal(await page.locator('#crossword .found').count(),0);
  assert.equal(await page.locator('#word-game,#search-game').count(),0,'crossword typing stays within its dedicated screen');
  for(let i=0;i<mini.entries.length;i++){
   const e=mini.entries[i];if(!await page.locator('#crossword .crossword-keys').count())break;
   await page.locator(`#crossword [data-clue="${i}"]`).click();
   if(await page.locator('#crossword .puzzle-cell.cursor').getAttribute('data-cell')!==String(e.start))await page.locator(`#crossword [data-cell="${e.start}"]`).click();
   for(const ch of e.word){if(!await page.locator('#crossword .crossword-keys').count())break;await page.keyboard.press(ch.toLowerCase());}
  }
  await page.waitForFunction(n=>document.querySelector('#crossword-summary').textContent.includes(n+' / '+n+' found'),mini.entries.length);
  const expected=timedPoints({day,type:'crossword',total:mini.entries.length,count:mini.entries.length,startedAt:now,finishedAt:now,done:true,complete:true,durationMs:mini.durationMs});
  assert.match(await page.locator('#crossword-summary').textContent(),new RegExp('^'+expected+' points'));
  assert.equal(await page.locator('#crossword .crossword-clues .found').count(),mini.entries.length);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('THEMED CROSSWORD UI: larger interlocking grids, 3:00/5:00 clocks, keyboard right after start, silent credit, full-grid finish with time bonus and 320px layout pass');
}finally{await browser.close();}
