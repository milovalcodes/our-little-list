import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const engines=process.env.GAME_BROWSER?[process.env.GAME_BROWSER==='webkit'?webkit:chromium]:[chromium,webkit];
for(const engine of engines){
const browser=await engine.launch(),base='http://127.0.0.1:8777',errors=[];
try{
 for(const mode of ['daily','practice'])for(const [side,width,level,day] of [['her',320,'normal','2026-10-20'],['him',390,'hard','2026-10-18']]){
  const context=await browser.newContext({viewport:{width,height:740},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(Date.parse(day+'T18:00Z'));
  await page.goto(base+(mode==='daily'?`/activities.html?as=${side}#crossword`:`/practice.html?as=${side}#crossword-${level}`));
  const host=page.locator(mode==='daily'?'#crossword-game':'#practice-game');
  if(mode==='daily')await host.locator('[data-start]:not([disabled])').tap();
  await host.locator('dialog[open]').waitFor();
  const zoom=host.locator('.crossword-board-tools output');
  const zoomBefore=Number((await zoom.textContent()).replace('%',''));
  const zoomIn=host.getByRole('button',{name:'Zoom in',exact:true});await zoomIn.tap();
  const zoomAfter=Number((await zoom.textContent()).replace('%',''));
  assert.ok(Math.abs(zoomAfter-zoomBefore*1.25)<=1,'zoom responds once to a touch tap');
  await zoomIn.dispatchEvent('click',{bubbles:true,detail:1});
  assert.equal(Number((await zoom.textContent()).replace('%','')),zoomAfter,'a compatibility click cannot apply a touch twice');
  for(const cancel of ['pointercancel','pointermove']){
   await zoomIn.dispatchEvent('pointerdown',{pointerId:99,pointerType:'touch',isPrimary:true,clientX:10,clientY:10,bubbles:true,cancelable:true});
   await zoomIn.dispatchEvent(cancel,{pointerId:99,pointerType:'touch',clientX:30,clientY:10,bubbles:true});
   await zoomIn.dispatchEvent('pointerup',{pointerId:99,pointerType:'touch',clientX:30,clientY:10,bubbles:true});
   await zoomIn.dispatchEvent('click',{bubbles:true,detail:1});
   assert.equal(Number((await zoom.textContent()).replace('%','')),zoomAfter,'cancelled or dragged touches do not activate a key');
  }
  const puzzle=await page.evaluate(async({mode,day,level})=>mode==='daily'?(await import('./daily-puzzles.js')).timedPuzzle(day,'crossword'):(await import('./practice-catalog.js')).practicePuzzle('crossword',level==='hard'?50:0),{mode,day,level});
  const cells=i=>Array.from({length:puzzle.entries[i].word.length},(_,j)=>puzzle.entries[i].start+j*puzzle.entries[i].step);
  const entry=puzzle.entries.findIndex((e,i)=>cells(i).some(c=>puzzle.entries.some((other,j)=>j!==i&&cells(j).includes(c))));
  const crossing=cells(entry).find(c=>puzzle.entries.some((e,j)=>j!==entry&&cells(j).includes(c)));
  const clueAttribute=mode==='daily'?'data-clue':'data-entry',cellAttribute=mode==='daily'?'data-cell':'data-square';
  const selected=()=>host.locator('.crossword-clues [aria-pressed="true"]').getAttribute(clueAttribute);
  const choose=async i=>{await host.locator('.crossword-clues-toggle').tap();await host.locator(`[${clueAttribute}="${i}"]`).tap();};
  const key=k=>host.locator(`[${mode==='daily'?'data-ckey':'data-letter'}="${k}"]`);
  for(const native of [false,true]){
   if(native){await host.getByRole('button',{name:'Use phone keyboard',exact:true}).tap();await page.setViewportSize({width,height:480});}
   await choose(entry);
   const strip=host.locator(`[data-focus-cell="${crossing}"]`);
   await strip.tap();await strip.tap();
   assert.equal(await selected(),String(entry),'repeated answer-strip taps stay in the current word');
   if(native)assert.ok(await host.locator('input').evaluate(n=>n===document.activeElement),'strip taps retain native input focus');
   // The board keeps its deliberate tap-again direction toggle.
   await host.locator(`[${cellAttribute}="${crossing}"]`).tap();
   assert.notEqual(await selected(),String(entry),'retapping the board crossing switches direction');
   await choose(entry);
   const step=host.locator(`[${mode==='daily'?'data-clue-step':'data-step'}="1"]`);
   await step.tap();assert.notEqual(await selected(),String(entry),'next clue responds to touch');
   if(native){
    assert.ok(await host.locator('input').evaluate(n=>n===document.activeElement),'clue navigation retains native focus');
    await page.keyboard.insertText('xy');
    const count=await host.locator('.puzzle-cell span').evaluateAll(nodes=>nodes.filter(n=>n.textContent).length);
    await page.keyboard.press('Backspace');
    assert.equal(await host.locator('.puzzle-cell span').evaluateAll(nodes=>nodes.filter(n=>n.textContent).length),count-1,'native backspace removes one letter');
    await host.locator('.crossword-expand').tap();
    await host.locator('input').tap();
    const beforeSubmit=await selected();await host.locator('.game-native-submit').tap();
    assert.notEqual(await selected(),beforeSubmit,'native Next clue button responds to touch in inline view');
    assert.ok(await host.locator('input').evaluate(n=>n===document.activeElement),'Next clue retains native focus');
    await host.locator('.crossword-expand').tap();
    await host.getByRole('button',{name:'Game keys',exact:true}).tap();await page.setViewportSize({width,height:740});
   }
  }
  // Enter a correct first across answer, then reload saved progress.
  const first=puzzle.entries.map((e,i)=>({e,i})).filter(v=>v.e.step===1).sort((a,b)=>a.e.start-b.e.start)[0].i;
  await choose(first);
  for(const [j,c] of cells(first).entries()){
   const target=host.locator(`[data-focus-cell="${c}"]`);
   if(await target.evaluate(n=>n.classList.contains('found')))continue;
   await target.tap();await key(puzzle.entries[first].word[j]).tap();
  }
  assert.ok(await host.locator(`[${cellAttribute}="${puzzle.entries[first].start}"]`).evaluate(n=>n.classList.contains('found')),'correct answer is locked');
  await page.reload();await host.locator('dialog[open] .cursor').waitFor();
  assert.equal(await host.locator('.puzzle-cell.cursor').evaluate(n=>n.classList.contains('found')),false,'resuming selects an editable square');
  const resumed=await host.locator('.puzzle-cell.cursor').getAttribute(cellAttribute);
  await key('Z').tap();
  assert.equal(await host.locator(`[${cellAttribute}="${resumed}"] span`).textContent(),'Z','first keystroke after resume is accepted');
  console.log(`${engine.name()} ${mode}/${side}/${level}: strip taps, board direction, native typing/deletion, clue navigation and saved-progress resume passed`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
}
