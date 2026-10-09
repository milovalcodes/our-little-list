import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {practicePuzzle} from '../practice-catalog.js';
import {entryCells} from '../daily-puzzles.js';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const base='http://127.0.0.1:8777',errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await page.goto(base+'/practice.html?as=him#word');await page.waitForSelector('[data-key]');
 await page.click('[data-hint]');assert.match(await page.locator('[data-hints]').textContent(),new RegExp(practicePuzzle('word',0).clue.replace(/[.*+?^$()|[\]\\]/g,'\\$&')));
 await page.keyboard.type('zzzzz');await page.keyboard.press('Enter');assert.match(await page.locator('[data-feedback]').textContent(),/No try used/);
 for(let i=0;i<5;i++)await page.keyboard.press('Backspace');
 await page.keyboard.type('apple');await page.keyboard.press('Enter');
 const first=page.locator('.word-row').first();await first.evaluate(el=>{window.firstWordRow=el;});
 await page.keyboard.type('a');assert.equal(await first.evaluate(el=>el===window.firstWordRow),true,'typing preserves coloured DOM');
 await page.reload();await page.waitForSelector('[data-key]');assert.equal(await page.locator('[data-draft-row]').textContent(),'a');
 assert.ok((await page.locator('[data-hints]').textContent()).length>0);
 await page.keyboard.press('Backspace');await page.keyboard.type(practicePuzzle('word',0).word.toLowerCase());await page.keyboard.press('Enter');
 assert.match(await page.locator('[data-feedback]').textContent(),/got it/);
 await page.click('#practice-next');assert.equal(await page.locator('#practice-picker').inputValue(),'1');
 const wrong=['apple','beach','lemon','grape','candy'].filter(w=>w!==practicePuzzle('word',1).word.toLowerCase());
 for(const word of wrong){await page.keyboard.type(word);await page.keyboard.press('Enter');}
 assert.match(await page.locator('[data-feedback]').textContent(),/It was/);
 page.once('dialog',d=>d.accept());await page.click('#practice-restart');await page.waitForSelector('[data-key]');
 assert.equal(await page.locator('.word-tile.correct').count(),1,'only legend is coloured after restart');
 await page.click('[data-practice-tab=search]');await page.waitForSelector('.search-grid');
 const search=practicePuzzle('search',0);
 for(let i=0;i<search.entries.length;i++){
  const cells=entryCells(search,i);
  await page.locator('[data-cell="'+cells[0]+'"]').click();await page.locator('[data-cell="'+cells.at(-1)+'"]').click();
 }
 assert.match(await page.locator('[data-feedback]').textContent(),/all found/);
 await page.reload();await page.waitForSelector('.search-grid');assert.match(await page.locator('[data-feedback]').textContent(),/all found/);
 await page.click('[data-practice-tab=crossword]');await page.waitForSelector('.crossword-grid');
 await page.clock.install();await page.clock.fastForward(180000);
 const crossword=practicePuzzle('crossword',0);
 await page.fill('#practice-answer','ZZZZZ');await page.locator('.crossword-answer button').click();assert.match(await page.locator('[data-feedback]').textContent(),/Not quite/);
 for(let i=0;i<crossword.entries.length;i++){
  await page.locator('[data-clue="'+i+'"]').click();await page.fill('#practice-answer',crossword.entries[i].word);await page.locator('.crossword-answer button').click();
 }
 assert.match(await page.locator('[data-feedback]').textContent(),/all found/);
 await page.selectOption('#practice-picker','99');await page.click('#practice-next');assert.equal(await page.locator('#practice-picker').inputValue(),'0');
 await page.goto(base+'/activities.html?as=him#practice');await page.waitForSelector('#practice-links a');
 assert.match(await page.locator('#practice-links').textContent(),/1 finished/);
 const competitive=await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();return Promise.all(['wordGames','wordResults','timedGames','timedResults'].map(k=>d.readOnce(k)));});
 assert.ok(competitive.every(rows=>rows.length===0));
 await page.goto(base+'/practice.html?as=her#word');await page.waitForSelector('[data-key]');assert.match(await page.locator('#practice-progress').textContent(),/0 finished/);
 for(const type of ['word','search','crossword']){
  await page.goto(base+'/practice.html?as=him#'+type);await page.waitForSelector('#practice-game[aria-busy=false]');
  await page.setViewportSize({width:320,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 assert.deepEqual(errors,[]);console.log('Practice UI: clues, invalid/repeated-safe guesses, stable tiles, saves, win/loss/retry, both boards, no timer, no score writes, side separation and 320px pass');
}finally{await browser.close();}
