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
  assert.match(await page.locator('#crossword .timed-ready').textContent(),new RegExp((mini.hard?'6:00':'3:00')+'.*up to '+(mini.hard?120:60)+' points'));
  assert.equal(await page.locator('#word-game,#search-game').count(),0,'the dedicated crossword screen mounts only its own board');
  await page.locator('#crossword [data-start]:not([disabled])').click();
  await page.locator('#crossword .puzzle-cell.cursor').waitFor();
  await page.locator('#crossword .crossword-expand').click();
  assert.equal(await page.locator('#crossword .puzzle-cell').count(),mini.grid.replaceAll('#','').length);
  assert.ok(mini.size>5);
  // Only the playable window is drawn: edge rows and columns of walls are trimmed.
  assert.equal(await page.locator('#crossword .puzzle-wall').count(),crosswordWindow(mini).cells.filter(i=>mini.grid[i]==='#').length);
  // The keyboard works straight after start, without tapping a square first.
  const firstIndex=mini.entries.findIndex(e=>e.step===1),first=mini.entries[firstIndex];
  for(const ch of first.word)await page.keyboard.press(ch.toLowerCase());
  assert.equal(await page.locator('#crossword .timed-toolbar span').textContent(),first.word.length+' / '+mini.grid.replaceAll('#','').length+' squares');
  await page.waitForFunction(n=>document.querySelectorAll('#crossword .puzzle-cell.found').length>=n,first.word.length);
  assert.equal(await page.locator(`#crossword [data-cell="${first.start}"]`).evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(216, 239, 223)','answers are green');
  await page.locator(`#crossword [data-clue="${firstIndex}"]`).click();
  const before=await page.locator('#crossword .puzzle-cell span').allTextContents();
  await page.keyboard.press('z');await page.keyboard.press('Backspace');
  assert.deepEqual(await page.locator('#crossword .puzzle-cell span').allTextContents(),before,'locked word cannot be edited or erased');
  await page.waitForFunction(async day=>{const d=await(await import('./data-hub.js')).sharedLayer();return (await d.readDoc('timedGames',day+'-crossword-her'))?.solved.length>=1;},day);
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('our-little-list:crossword:'))localStorage.removeItem(k);});
  await page.reload();
  await page.waitForFunction(n=>document.querySelectorAll('#crossword .puzzle-cell.found').length>=n,first.word.length);
  if(await page.locator('#crossword dialog[open]').count())await page.locator('#crossword .crossword-expand').click();
  assert.equal(await page.locator('#word-game,#search-game').count(),0,'crossword typing stays within its dedicated screen');
  for(let i=0;i<mini.entries.length;i++){
   const e=mini.entries[i];if(!await page.locator('#crossword .crossword-keys').count())break;
   await page.locator(`#crossword [data-clue="${i}"]`).click();
   for(let j=0;j<e.word.length;j++){
    if(!await page.locator('#crossword .crossword-keys').count())break;
    const cell=e.start+j*e.step,target=page.locator(`#crossword [data-cell="${cell}"]`);
    if(await target.evaluate(n=>n.classList.contains('found')))continue;
    await target.click();await page.keyboard.press(e.word[j].toLowerCase());
   }
  }
  await page.waitForFunction(n=>document.querySelector('#crossword-summary').textContent.includes(n+' / '+n+' found'),mini.entries.length);
  const expected=timedPoints({day,type:'crossword',total:mini.entries.length,count:mini.entries.length,startedAt:now,finishedAt:now,done:true,complete:true,durationMs:mini.durationMs});
  assert.match(await page.locator('#crossword-summary').textContent(),new RegExp('^'+expected+' points'));
  assert.equal(await page.locator('#crossword .crossword-clues .found').count(),mini.entries.length);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
 }
 assert.deepEqual(errors,[]);
 console.log('THEMED CROSSWORD UI: larger interlocking grids, legacy/new clocks, keyboard right after start, green locks and restored saved credit, full-grid finish with time bonus and 320px layout pass');
}finally{await browser.close();}
