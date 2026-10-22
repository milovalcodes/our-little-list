import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {mkdir} from 'node:fs/promises';
import axe from 'axe-core';
const engine=process.env.GAME_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch(),base=process.env.GAME_BASE||'http://127.0.0.1:8777',errors=[];
await mkdir('node_modules/.cache/crossword-play',{recursive:true});
try{
 for(const [mode,side,width,height] of [['daily','her',320,568],['daily','him',390,667],['practice','her',430,932],['practice','him',844,390],['daily','him',1280,800]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<1000,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
  await page.clock.setFixedTime(Date.parse('2026-10-20T18:00Z'));
  await page.goto(base+(mode==='daily'?`/activities.html?as=${side}#crossword`:`/practice.html?as=${side}#crossword-hard`));
  const host=page.locator(mode==='daily'?'#crossword-game':'#practice-game');
  if(mode==='daily')await host.locator('[data-start]:not([disabled])').click();
  const dialog=host.locator('dialog[open]');await dialog.waitFor();
  const bounds=()=>dialog.evaluate(d=>Object.fromEntries(['.crossword-viewport','.crossword-current','.crossword-keys','.crossword-focus'].map(s=>{const r=d.querySelector(s).getBoundingClientRect();return [s,{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}];})));
  const fits=async(native=false)=>{
   await page.waitForFunction(({width,height})=>innerWidth===width&&innerHeight===height&&Math.abs(document.querySelector('dialog[open]').getBoundingClientRect().height-height)<2,page.viewportSize());
   const boxes=await bounds(),screen=page.viewportSize();
   for(const [name,r] of Object.entries(boxes)){if(native&&name==='.crossword-keys')continue;assert.ok(r.y>=0&&r.x>=0&&r.bottom<=screen.height+1&&r.right<=screen.width+1,`${mode}/${side}/${width}: ${name} fits ${JSON.stringify(r)}`);}
   const board=boxes['.crossword-viewport'],clue=boxes['.crossword-current'],keys=boxes['.crossword-keys'];
   assert.ok(board.height>=70,'board retains useful space');
   assert.ok(board.right<=clue.x+1||board.bottom<=clue.y+1,'clue never covers the board');
   if(!native){assert.ok(clue.bottom<=keys.y+1,'clue above keyboard');assert.ok(keys.height>=138,'full-height touch keys');}
  };
  await fits();
  assert.equal(await host.locator('input').evaluate(n=>n===document.activeElement),false,'game keys do not open the phone keyboard');
  await host.locator('[data-flip]').evaluate(n=>{window.stableClue=n;window.stableKeys=[...document.querySelectorAll('.crossword-keys button')];window.scrollBefore=scrollY;});
  const original=await bounds(),key=letter=>host.locator(mode==='daily'?`[data-ckey="${letter}"]`:`[data-letter="${letter}"]`);
  for(const letter of 'QWERTY')await key(letter).tap();
  assert.deepEqual(await bounds(),original,'typing and automatic clue advance leave the layout still');
  assert.ok(await host.locator('[data-flip]').evaluate(n=>n===window.stableClue&&window.stableKeys.every(k=>k.isConnected)&&scrollY===window.scrollBefore),'clue and keys remain connected, with no page jump');
  // A save landing while a finger is down must not discard that key press.
  const box=await key('Z').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  if(mode==='daily')await page.evaluate(()=>dispatchEvent(new Event('offline')));
  await page.mouse.up();
  assert.ok((await host.locator('.puzzle-cell span').allTextContents()).includes('Z'),'pressed key survives background repaint');
  await key('⌫').tap();await fits();
  await host.locator('.crossword-clues-toggle').click();
  await host.locator(mode==='daily'?'[data-clue="1"]':'[data-entry="1"]').click();
  assert.equal(await dialog.evaluate(n=>n.classList.contains('show-clues')),false,'choosing a clue returns to the board');
  await key('A').tap();await fits();
  if(width===320){await page.addScriptTag({content:axe.source});assert.deepEqual(await dialog.evaluate(async d=>(await axe.run(d,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))),[],'expanded play accessibility');}
  await page.screenshot({path:`node_modules/.cache/crossword-play/${engine.name()}-${mode}-${side}-${width}.png`});
  await host.locator('.game-input-controls>button:not(.game-native-submit)').click();
  const input=host.locator('input');await input.evaluate(n=>window.stableInput=n);
  await page.setViewportSize({width:390,height:480});await page.keyboard.insertText('xy');await fits(true);
  assert.ok(await input.evaluate(n=>n===window.stableInput&&n===document.activeElement),'optional native keyboard keeps its input');
  await host.locator('.crossword-clues-toggle').click();await host.locator(mode==='daily'?'[data-clue="2"]':'[data-entry="2"]').click();
  assert.ok(await input.evaluate(n=>n===document.activeElement),'clue selection preserves native focus');
  await host.locator('.game-input-controls>button:not(.game-native-submit)').click();
  await page.setViewportSize({width:844,height:390});await fits();
  await host.locator('.crossword-expand').click();await dialog.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('crossword-play-open')),false,'Back unlocks the page');
  await host.locator('.crossword-expand').click();await dialog.waitFor();
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await host.locator('.crossword-expand').click();await dialog.waitFor();
  if(width===320||width===430){
   const puzzle=await page.evaluate(async mode=>mode==='daily'?(await import('./daily-puzzles.js')).timedPuzzle('2026-10-20','crossword'):(await import('./practice-catalog.js')).practicePuzzle('crossword',50),mode);
   for(const [i,entry] of puzzle.entries.entries()){
    if(!await dialog.count())break;
    await host.locator('.crossword-clues-toggle').click();await host.locator(mode==='daily'?`[data-clue="${i}"]`:`[data-entry="${i}"]`).click();
    const attr=mode==='daily'?'data-cell':'data-square';
    for(let j=0;j<entry.word.length;j++){
     if(!await dialog.count())break;
     const cell=entry.start+j*entry.step,target=host.locator(`[${attr}="${cell}"]`);
     if(await target.evaluate(n=>n.classList.contains('found')))continue;
     await target.evaluate(n=>n.click());await page.keyboard.press(entry.word[j].toLowerCase());
    }
    if(i===0&&await dialog.count()){
     const target=host.locator(`[${attr}="${entry.start}"]`);
     assert.ok(await target.evaluate(n=>n.classList.contains('found')),mode+' answer turns green');
     await target.evaluate(n=>n.click());const saved=await target.textContent();
     await page.keyboard.press('z');await page.keyboard.press('Backspace');
     assert.equal(await target.textContent(),saved,mode+' locked answer survives typing/deletion');
    }
   }
   await host.locator(mode==='daily'?'.daily-results':'[data-feedback]').filter(mode==='daily'?{}:{hasText:'all found'}).waitFor();
   await dialog.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('crossword-play-open')),false,'solving the board exits floating play');
  }else if(mode==='daily'){
   await page.clock.setFixedTime(Date.parse('2026-10-20T18:10Z'));
   await host.locator('.daily-results').waitFor();await dialog.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('crossword-play-open')),false,'expiry exits play and restores results');
  }else{
   await host.locator('.crossword-expand').click();await page.locator('[data-practice-tab="search"]').click();
   await host.locator('.search-grid').waitFor();
   assert.equal(await host.locator('dialog').count(),0,'switching practice games disposes the play view');
  }
  await context.close();console.log(`Steady crossword: ${engine.name()} ${mode}/${side} ${width}×${height}, rapid keys, save during press, clue list, native option, rotation and exit passed`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
// Keep real touch activation and resume coverage in the existing daily CI entry.
await import('./crossword-navigation-browser.mjs');
