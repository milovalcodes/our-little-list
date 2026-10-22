import axe from 'axe-core';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {weeklyRounds} from '../round-engine.js';
import {wordForDay} from '../daily-words.js';
async function audit(page,selector){await page.addScriptTag({content:axe.source});const result=await page.evaluate(async selector=>await axe.run(document.querySelector(selector),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}),selector);assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})),[]);}
const base='http://127.0.0.1:8777',day='2026-10-20',errors=[];
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce',isMobile:true,hasTouch:true});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(Date.parse(day+'T18:00Z'));
  await page.goto(base+'/activities.html?as=her#wordle');
  const dock=page.locator('.app-dock');await page.locator('#word-game .game-input-controls>button:not(.game-native-submit)').waitFor();await dock.waitFor({state:'hidden'});
  await page.locator('#word-game .game-input-controls>button:not(.game-native-submit)').click();
  const wordInput=page.locator('#word-game input');await wordInput.evaluate(n=>window.originalWordInput=n);
  await page.keyboard.insertText('ab');assert.equal(await page.locator('#word-game .word-row').first().innerText(),'A\nB');
  await page.keyboard.press('Backspace');assert.equal((await page.locator('#word-game .word-row').first().textContent()).toLowerCase(),'a');
  await wordInput.evaluate(n=>n.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true})));assert.equal(await page.locator('#word-game .word-row').first().textContent(),'');
  await page.keyboard.insertText(wordForDay(day).word);assert.ok(await wordInput.evaluate(n=>n===window.originalWordInput&&n===document.activeElement),'input remains focused and connected across redraws');
  await audit(page,'#word-game');await page.keyboard.press('Enter');await page.locator('#word-game .daily-results').waitFor();await dock.waitFor();
  await page.goto(base+'/activities.html?as=her#crossword');
  const mini=weeklyRounds(day)[day].crossword;
  await page.evaluate(async p=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('timedPuzzles',p.day+'-crossword',p);},mini);
  await page.locator('#crossword [data-start]:not([disabled])').click();await page.locator('#crossword .cursor').waitFor();await dock.waitFor({state:'hidden'});
  await page.locator('#crossword .crossword-expand').click();
  const activeClue=Number(await page.locator('#crossword .crossword-clues [aria-pressed="true"]').getAttribute('data-clue'));
  const clueSnapshot=await page.locator('#crossword [data-flip]').ariaSnapshot();
  assert.ok(clueSnapshot.includes(mini.entries[activeClue].clue),'the current clue is included in its screen-reader name: '+clueSnapshot);
  await page.locator('#crossword .game-input-controls>button:not(.game-native-submit)').click();const input=page.locator('#crossword input');await input.evaluate(n=>window.originalCrosswordInput=n);
  await page.keyboard.insertText('ab');assert.match(await page.locator('#crossword .timed-toolbar span').textContent(),/^2 \/ /);
  await input.evaluate(n=>n.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true})));assert.match(await page.locator('#crossword .timed-toolbar span').textContent(),/^1 \/ /);
  await page.locator('#crossword [data-clue="1"]').click();assert.ok(await input.evaluate(n=>n===window.originalCrosswordInput&&n===document.activeElement),'clue changes retain native keyboard');
  const focusCell=page.locator('#crossword [data-focus-cell]').first();const cellIndex=await focusCell.getAttribute('data-focus-cell');await focusCell.click();assert.equal(await page.locator('#crossword .cursor').getAttribute('data-cell'),cellIndex);
  await page.keyboard.insertText('xy');assert.ok(await input.evaluate(n=>n===document.activeElement));
  await audit(page,'#crossword-game');await page.setViewportSize({width,height:480});
  await page.locator('#crossword .puzzle-grid').evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+scrollY));
  const clue=await page.locator('#crossword .crossword-current').boundingBox();assert.ok(clue.y>=0&&clue.y<60,'current clue stays at the top while board scrolls');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.QA_SCREENSHOTS){await mkdir('node_modules/.cache/clarity-visual',{recursive:true});await page.screenshot({path:`node_modules/.cache/clarity-visual/crossword-${width}.png`});}
  await page.locator('.activity-back').click();await dock.waitFor();assert.equal(await page.locator('#crossword input').count(),0);
  // Closing a card does not pause its clock. Let this round expire before
  // starting the next timed accessibility fixture.
  await page.clock.setFixedTime(Date.parse(day+'T18:06Z'));
  await page.setViewportSize({width,height:844});await page.goto(base+'/activities.html?as=her#search');await page.locator('#search [data-start]:not([disabled])').click();await page.locator('#search .search-grid').waitFor();await dock.waitFor({state:'hidden'});
  await page.locator('#search .search-grid').evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+scrollY));const words=await page.locator('#search .search-words').boundingBox();const searchBoard=await page.locator('#search .search-grid').boundingBox();assert.ok(words.y>=0&&words.y<=searchBoard.y,'search words remain visible above the board');
  await audit(page,'#search-game');await page.locator('.activity-back').click();await dock.waitFor();await page.goto(base+'/practice.html?as=her#word');
  await page.locator('#practice-game .game-input-controls>button:not(.game-native-submit)').click();await page.keyboard.insertText('abc');
  assert.equal(await page.locator('[data-draft-row]').textContent(),'abc');assert.ok(await page.locator('#practice-game input').evaluate(n=>n===document.activeElement));
  await page.goto(base+'/practice.html?as=her#crossword');
  await page.locator('#practice-game .crossword-expand').click();
  await page.locator('#practice-game .game-input-controls>button:not(.game-native-submit)').click();await page.keyboard.insertText('ab');
  assert.ok(await page.locator('#practice-game input').evaluate(n=>n===document.activeElement));
  await page.locator('#practice-game [data-entry="1"]').click();assert.ok(await page.locator('#practice-game input').evaluate(n=>n===document.activeElement));
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PHONE GAME CONTROLS: native insertion, deletion, submit, stable focus, dock lifecycle, sticky clues/search words and narrow keyboard viewport pass');
}finally{await browser.close();}
