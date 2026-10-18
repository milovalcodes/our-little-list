import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777',day='2026-10-20',now=Date.parse(day+'T18:00Z'),errors=[];
await mkdir('node_modules/.cache/shared-round',{recursive:true});
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce',isMobile:true,hasTouch:true});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(now);
  await page.goto(base+'/activities.html?as=her#search');await page.locator('#search [data-start]').click();await page.locator('#search .puzzle-grid').waitFor();
  await page.locator('#crossword>summary').click();await page.waitForFunction(()=>document.querySelector('#crossword [data-start]').disabled);
  assert.match(await page.locator('#crossword [data-start]').textContent(),/Finish Word Search first/);
  const conflict=await page.evaluate(async day=>{const data=await(await import('./data-hub.js')).sharedLayer();try{await data.playTimedPuzzle({day,type:'crossword',person:'her',start:true});return 'started';}catch(e){return e.message;}},day);
  assert.match(conflict,/Finish Word Search first/,'data layer rejects bypassing the disabled button');
  const otherTab=await context.newPage();await otherTab.clock.setFixedTime(now);await otherTab.goto(base+'/activities.html?as=her#crossword');await otherTab.locator('#crossword [data-continue-round]').waitFor();
  assert.equal(await otherTab.locator('#crossword [data-start]').isDisabled(),true,'another tab sees the same guard');
  await otherTab.close();
  await page.locator('#crossword [data-continue-round]').click();assert.equal(await page.locator('#search').evaluate(n=>n.open),true);
  await page.clock.setFixedTime(now+300001);await page.waitForFunction(()=>!document.querySelector('#crossword [data-start]').disabled);
  await page.locator('#crossword [data-start]').click();await page.locator('#crossword .crossword-viewport').waitFor();
  // The selected word, not the blank top-left corner, is framed on start.
  const framing=await page.locator('#crossword .crossword-viewport').evaluate(p=>{const r=p.getBoundingClientRect(),cells=[...p.querySelectorAll('.chosen')].map(n=>n.getBoundingClientRect());return {width:r.width,wordWidth:Math.max(...cells.map(c=>c.right))-Math.min(...cells.map(c=>c.left)),visible:cells.every(c=>c.left>=r.left&&c.right<=r.right+1&&c.top>=r.top&&c.bottom<=r.bottom+1)};});
  if(framing.wordWidth<framing.width-16)assert.ok(framing.visible,'active word fits within viewport');
  await context.close();
  const shared=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await shared.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await shared.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const a=await shared.newPage();a.on('pageerror',e=>errors.push(e.message));await a.clock.setFixedTime(now);await a.goto(base+'/activities.html?as=her#wordle');
  await a.locator('#word-game .word-grid').waitFor();
  await a.evaluate(async day=>{const d=await(await import('./data-hub.js')).sharedLayer(),p=(await import('./daily-words.js')).wordForDay(day),{wordSummary}=await import('./word-game.js');await d.setTo('wordPuzzles',day,p);const g={day,person:'her',guesses:[p.word],won:true,done:true,updatedAt:Date.now()};await d.setTo('wordGames',day+'-her',g);await d.setTo('wordResults',day+'-her',wordSummary(g));},day);
  assert.equal(await a.locator('[data-shared-round]').count(),0,'no reveal before partner finishes');
  await a.evaluate(async day=>{const d=await(await import('./data-hub.js')).sharedLayer(),p=(await import('./daily-words.js')).wordForDay(day),{wordSummary}=await import('./word-game.js');const g={day,person:'him',guesses:['zzzzz',p.word],won:true,done:true,updatedAt:Date.now()};await d.setTo('wordGames',day+'-him',g);await d.setTo('wordResults',day+'-him',wordSummary(g));},day);
  await a.locator('.shared-grids').waitFor();await a.locator('[data-shared-round]').scrollIntoViewIfNeeded();
  assert.match(await a.locator('.shared-round-result').textContent(),/You take this round/);
  assert.equal(await a.locator('.shared-grid .word-tile').count(),15);
  assert.equal(await a.locator('.is-revealing').count(),0,'reduced motion skips reveal animation');
  await a.locator('[data-round-react="🔥"]').click();await a.waitForFunction(()=>document.querySelector('[data-round-react="🔥"]').getAttribute('aria-pressed')==='true');
  const b=await shared.newPage();b.on('pageerror',e=>errors.push(e.message));await b.clock.setFixedTime(now);await b.goto(base+'/activities.html?as=him#wordle');await b.locator('.shared-grids').waitFor();
  assert.match(await b.locator('.shared-reaction-status').textContent(),/reacted 🔥/,'partner sees saved reaction');
  await b.locator('[data-round-react="😂"]').click();await a.waitForFunction(()=>document.querySelector('.shared-reaction-status').textContent.includes('reacted 😂'));
  await a.reload();await a.locator('.shared-grids').waitFor();assert.equal(await a.locator('[data-round-react="🔥"]').getAttribute('aria-pressed'),'true','reaction survives reload');
  assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await a.locator('.thinking-screen').waitFor({state:'hidden'});
  await a.locator('[data-shared-round]').scrollIntoViewIfNeeded();await a.screenshot({path:`node_modules/.cache/shared-round/results-${width}.png`});
  await a.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer(),save=d.saveGameReaction.bind(d);d.saveGameReaction=async item=>{await new Promise(resolve=>window.releaseReaction=resolve);return save(item);};});
  await a.locator('[data-round-react="👑"]').click();await a.locator('#wordle>summary').click();
  await a.evaluate(()=>window.releaseReaction());
  await a.waitForFunction(()=>document.querySelector('[data-round-react="👑"]')?.getAttribute('aria-pressed')==='true');
  assert.ok(await a.locator('#wordle>summary').evaluate(n=>n===document.activeElement),'a delayed save must not steal focus from a closed card');
  await a.locator('#wordle>summary').click();
  await a.evaluate(async day=>{const d=await(await import('./data-hub.js')).sharedLayer(),p=(await import('./daily-words.js')).wordForDay(day);await d.setTo('wordPuzzles',day,{...p,revision:1});},day);
  await a.waitForFunction(()=>!document.querySelector('[data-shared-round]'));
  await b.waitForFunction(()=>!document.querySelector('[data-shared-round]'));
  await shared.close();console.log(`SHARED ROUND ${width}px: timer guard across tabs, expiry, word framing, two grids, shared reactions, reload and reset isolation pass`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
