import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {join} from 'node:path';import {tmpdir} from 'node:os';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const now=Date.parse('2026-10-09T18:00Z');await page.clock.setFixedTime(now);
try{
 await page.goto(base+'/activities.html?as=him#search');await page.locator('#search [data-start]:not([disabled])').waitFor();
 assert.match(await page.locator('#search .timed-ready').textContent(),/50 points/);
 await page.click('#search [data-start]');await page.locator('#search .puzzle-cell').first().waitFor();
 const puzzle=await page.evaluate(async()=>{const{timedPuzzle}=await import('./daily-puzzles.js');return timedPuzzle('2026-10-09','search');});
 await page.evaluate(()=>{window.trace=[];for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>window.trace.push({type,target:e.target.outerHTML.slice(0,130),x:e.clientX,y:e.clientY,hit:document.elementFromPoint(e.clientX,e.clientY)?.outerHTML.slice(0,130)}),true);});
 for(const [i,e]of puzzle.entries.entries()){
  await page.locator('#search .puzzle-cell:not([disabled])').first().waitFor();
  const start=page.locator(`#search [data-cell="${e.start}"]`),end=page.locator(`#search [data-cell="${e.start+(e.word.length-1)*e.step}"]`);
  await start.scrollIntoViewIfNeeded();const a=await start.boundingBox(),b=await end.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:5});await page.mouse.up();
  try{await page.waitForFunction(n=>document.querySelectorAll('#search .search-words .found').length===n,i+1,{timeout:5000});}catch(error){console.error('drag failed',i,e.word,a,b,await page.locator('#search .timed-feedback').textContent(),await page.evaluate(()=>window.trace.slice(-4)));await page.screenshot({path:join(tmpdir(),'little-timed-failure.png'),fullPage:true});throw error;}
 }
 assert.match(await page.locator('#search-summary').textContent(),/50 points/);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#search-summary').textContent.includes('50 points'));
 await page.locator('#crossword>summary').click();await page.click('#crossword [data-start]');
 const cross=await page.evaluate(async()=>{const{timedPuzzle}=await import('./daily-puzzles.js');return timedPuzzle('2026-10-09','crossword');});
 // Letter-by-letter entry: wrong squares are never flagged while competing.
 const typeWord=async i=>{
  await page.locator(`#crossword [data-clue="${i}"]`).click();
  if(await page.locator('#crossword .puzzle-cell.cursor').getAttribute('data-cell')!==String(cross.entries[i].start))await page.locator(`#crossword [data-cell="${cross.entries[i].start}"]`).click();
  for(const ch of cross.entries[i].word)await page.keyboard.press(ch.toLowerCase());
 };
 const savedWords=()=>page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();return (await d.readDoc('timedGames','2026-10-09-crossword-him'))?.solved.length||0;});
 await page.locator('#crossword [data-clue="0"]').click();await page.keyboard.press('z');await page.keyboard.press('z');
 assert.equal(await page.locator('#crossword .timed-feedback').textContent(),'','no check while competing');
 assert.equal(await page.locator('#crossword .found,#crossword .missed-word').count(),0);
 assert.match(await page.locator('#crossword .timed-toolbar').textContent(),/2 \/ \d+ squares/);
 for(let i=0;i<2;i++)await typeWord(i);
 for(let tries=0;await savedWords()<2;tries++){assert.ok(tries<50,'correct words are saved silently');await page.waitForTimeout(100);}
 assert.equal(await page.locator('#crossword .found').count(),0,'saved words stay unmarked until the round ends');
 // Reload preserves the server-style start time, typed squares and saved words.
 const squares=await page.locator('#crossword .timed-toolbar span').textContent();
 await page.reload();if(!await page.locator('#crossword').evaluate(d=>d.open))await page.locator('#crossword>summary').click();
 await page.waitForFunction(text=>document.querySelector('#crossword .timed-toolbar span')?.textContent===text,squares);
 await page.clock.setFixedTime(now+120001);
 await page.waitForFunction(()=>document.querySelector('#crossword-summary').textContent.includes('points'));
 const points=Math.round(2/cross.entries.length*50);
 assert.match(await page.locator('#crossword-summary').textContent(),new RegExp(points+' points'));
 assert.equal(await page.locator('#crossword .crossword-keys').count(),0);
 assert.equal(await page.locator('#crossword .crossword-clues .found').count(),2);
 assert.ok(await page.locator('#crossword .puzzle-cell.missed-word').count()>0,'wrong and empty squares are marked after the round');
 // A saved partner round unlocks the process without reloading; direct read only after both end.
 await page.evaluate(async({cross,now})=>{const{sharedLayer}=await import('./data-hub.js'),d=await sharedLayer();const{newTimedGame,timedSummary}=await import('./timed-game.js');const g={...newTimedGame(cross,'her',now),done:true,complete:false,finishedAt:now+120000,solved:[0],foundAt:[12000]};await d.setTo('timedGames','2026-10-09-crossword-her',g);await d.setTo('timedResults','2026-10-09-crossword-her',timedSummary(g));},{cross,now});
 await page.locator('#crossword .timed-route:last-child li').waitFor();
 assert.equal(await page.locator('[data-peek]').count(),0,'finished routes reveal automatically');
 assert.match(await page.locator('#crossword .timed-route:last-child').textContent(),new RegExp(cross.entries[0].word));
 for(const width of [320,390]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
 await page.screenshot({path:join(tmpdir(),'little-timed-puzzles.png'),fullPage:true});
 // A fresh, empty board expires to exactly zero, never a participation point.
 await page.goto('about:blank');await page.clock.setFixedTime(now+86400000);await page.goto(base+'/activities.html?as=him#search');await page.click('#search [data-start]');await page.locator('#search .puzzle-grid').waitFor();await page.clock.setFixedTime(now+86400000+120001);await page.waitForFunction(()=>document.querySelector('#search-summary').textContent.includes('0 points'));
 const tieWord=await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer(),{wordForTie}=await import('./daily-words.js'),{timedPuzzle}=await import('./daily-puzzles.js');const word=wordForTie('2026-10-05',1,Date.now());await d.setTo('wordPuzzles',word.day,word);for(const type of ['search','crossword'])await d.setTo('timedPuzzles',word.day+'-'+type,timedPuzzle(word.day,type,Date.now()));await d.setTo('wordDuels',word.day,{week:'2026-10-05',round:1,puzzleId:word.day,format:'trio',scoreVersion:2,scores:{her:400,him:400}});return word;});
 await page.evaluate(()=>location.hash='tiebreaker');await page.locator('[data-trio="wordle"]>summary').click();
 for(const letter of tieWord.word)await page.click(`[data-trio="wordle"] [data-key="${letter}"]`);await page.click('[data-trio="wordle"] [data-key="↵"]');
 await page.waitForFunction(()=>document.querySelector('.trio-score').textContent.includes('☾ 600'));
 assert.equal(await page.locator('#tiebreaker [data-trio]').count(),3);
 await page.locator('[data-trio="search"]>summary').click();assert.match(await page.locator('[data-trio="search"] .timed-ready').textContent(),/100 points/);
 assert.match(await page.locator('[data-trio="search"] .puzzle-theme').textContent(),/hard/);
 assert.deepEqual(errors,[]);console.log('TIMED UI: real drag play, full/partial/zero scores, wrong answers, reload-safe timer, live reveal, hard trio UI and 320px layout pass');
}finally{await browser.close();}
