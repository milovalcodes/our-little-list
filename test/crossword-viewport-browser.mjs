import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {mkdir} from 'node:fs/promises';
const engine=process.env.GAME_BROWSER==='webkit'?webkit:chromium;
const browser=await engine.launch(),base='http://127.0.0.1:8777',errors=[];
await mkdir('node_modules/.cache/crossword-viewport',{recursive:true});
try{
 for(const mode of ['practice','daily'])for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(Date.parse('2026-10-20T18:00Z'));
  await page.goto(base+(mode==='practice'?'/practice.html?as=him#crossword-hard':'/activities.html?as=her#crossword'));
  const host=page.locator(mode==='practice'?'#practice-game':'#crossword-game');
  if(mode==='daily')await host.locator('[data-start]:not([disabled])').click();
  // This suite exercises the optional inline board; crossword-play covers the floating view.
  await host.locator('.crossword-expand').click();
  const pane=host.locator('.crossword-viewport'),tools=host.locator('.crossword-board-tools');await pane.waitFor();
  const state=()=>pane.evaluate(p=>({x:p.scrollLeft,y:p.scrollTop,w:p.scrollWidth,h:p.scrollHeight,cw:p.clientWidth,ch:p.clientHeight,cursor:p.querySelector('.cursor')?.getAttribute('aria-label'),clue:p.closest('.game-board-content').querySelector('.crossword-clues [aria-pressed="true"]')?.textContent,zoom:p.parentNode.querySelector('output').value}));
  const button=action=>tools.locator(`[data-board-view="${action}"]`);
  await button('fit').click();let fit=await state();assert.equal(fit.zoom,'100%');assert.ok(fit.w<=fit.cw+1&&fit.h<=fit.ch+1,'Fit shows the entire board in both directions');
  await button('in').click();await button('in').click();await button('in').click();
  assert.ok((await state()).w>fit.cw&&(await state()).h>fit.ch,'zoom makes room to pan in both axes');
  await pane.evaluate(p=>{p.scrollLeft=0;p.scrollTop=0;window.originalPane=p;window.originalSquare=p.querySelector('.puzzle-cell');});
  await pane.scrollIntoViewIfNeeded();
  let box=await pane.boundingBox(),before=await state();
  await page.mouse.move(box.x+box.width*.75,box.y+box.height*.75);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.3,box.y+box.height*.3,{steps:8});await page.mouse.up();
  let after=await state();assert.ok(after.x>before.x+40&&after.y>before.y+40,'drag pans in both axes');assert.equal(after.cursor,before.cursor,'drag never selects a square');assert.equal(after.clue,before.clue,'drag never flips direction');
  if(mode==='daily'){
   await page.evaluate(()=>dispatchEvent(new Event('offline')));
   assert.deepEqual(await state(),after,'a background redraw preserves the manually explored area');
  }
  await host.locator('.game-input-controls>button:not(.game-native-submit)').click();
  const input=host.locator('.game-native-field input');await input.evaluate(n=>window.nativeInput=n);
  await button('in').click();assert.ok(await input.evaluate(n=>n===document.activeElement),'zoom keeps native keyboard focus');
  const zoom=(await state()).zoom;
  await page.keyboard.insertText('x');
  assert.ok(await input.evaluate(n=>n===window.nativeInput&&n===document.activeElement),'typing keeps the same native input');
  assert.ok(await pane.evaluate(p=>p===window.originalPane&&p.contains(window.originalSquare)),'typing keeps viewport and square nodes connected');
  assert.equal((await state()).zoom,zoom,'typing preserves zoom');
  assert.ok(await pane.evaluate(p=>{const a=p.querySelector('.cursor').getBoundingClientRect(),b=p.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom;}),'typing reveals the current square in both axes');
  // Chromium can inject real multi-touch, including capture and click synthesis.
  // WebKit's protocol lacks multi-touch injection; exercise the same pointer
  // transitions there, alongside its real mouse drags and touchscreen taps.
  await button('fit').click();await pane.scrollIntoViewIfNeeded();box=await pane.boundingBox();
  const cdp=engine===chromium?await context.newCDPSession(page):{send:async(_,args)=>pane.evaluate((p,{type,touchPoints})=>{
   const previous=window.qaTouches||[],ending=type==='touchEnd'||type==='touchCancel';
   for(const t of ending?previous:touchPoints)p.dispatchEvent(new PointerEvent(ending?(type==='touchCancel'?'pointercancel':'pointerup'):type==='touchStart'?'pointerdown':'pointermove',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:t.id,clientX:t.x,clientY:t.y,button:0,buttons:ending?0:1}));
   window.qaTouches=touchPoints;
  },args)},cx=box.x+box.width/2,cy=box.y+box.height/2;
  const touches=(distance,dx=0,dy=0)=>[{x:cx-distance+dx,y:cy+dy,id:1},{x:cx+distance+dx,y:cy+dy,id:2}];
  before=await state();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches(25)});
  for(const d of [32,40,50,60])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches(d,-8,-8)});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  after=await state();assert.ok(parseInt(after.zoom)>180,'pinch zooms the board');assert.equal(after.cursor,before.cursor,'pinch does not select a square');assert.equal(after.clue,before.clue,'pinch never flips direction');
  assert.ok(await input.evaluate(n=>n===document.activeElement),'pinch keeps phone keyboard focus');
  assert.equal(await page.evaluate(()=>visualViewport.scale),1,'board pinch leaves page zoom unchanged');
  // A fresh tap immediately after the gesture must work, including on iOS-style clicks.
  await button('fit').click();await pane.scrollIntoViewIfNeeded();
  const square=pane.locator('.puzzle-cell').first();const squareId=await square.getAttribute(mode==='practice'?'data-square':'data-cell');
  await square.tap();assert.equal(await pane.locator('.cursor').getAttribute(mode==='practice'?'data-square':'data-cell'),squareId,'tap selects after a pinch');
  const crossing=await page.evaluate(async mode=>{
   const puzzle=mode==='practice'?(await import('./practice-catalog.js')).practicePuzzle('crossword',50):(await import('./daily-puzzles.js')).timedPuzzle('2026-10-20','crossword');
   const counts=new Map();for(const e of puzzle.entries)for(let i=0;i<e.word.length;i++){const cell=e.start+i*e.step;counts.set(cell,(counts.get(cell)||0)+1);}return [...counts].find(([,n])=>n>1)[0];
  },mode);
  const intersection=pane.locator(`[${mode==='practice'?'data-square':'data-cell'}="${crossing}"]`);await intersection.tap();const across=(await state()).clue;
  await intersection.tap();assert.notEqual((await state()).clue,across,'one tap flips a crossing once');await intersection.tap();assert.equal((await state()).clue,across,'another tap returns to the original direction');
  await button('in').click();await button('in').click();await pane.scrollIntoViewIfNeeded();box=await pane.boundingBox();
  before=await state();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.7,y:box.y+box.height*.7,id:3}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.3,y:box.y+box.height*.3,id:3}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  assert.equal((await state()).cursor,before.cursor,'cancelled touch cannot select');assert.equal(await pane.evaluate(p=>p.classList.contains('is-panning')),false);
  await button('current').click();
  for(const viewport of [{width:844,height:390},{width,height:480},{width,height:844}]){
   await page.setViewportSize(viewport);await button('current').click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'resize never overflows the page');
   assert.ok(await input.evaluate(n=>n===window.nativeInput&&n===document.activeElement),'rotation keeps native typing');
  }
  await button('fit').click();await pane.scrollIntoViewIfNeeded();box=await pane.boundingBox();
  if(engine===chromium){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.keyboard.down('Control');await page.mouse.wheel(0,-80);await page.keyboard.up('Control');}
  else await pane.dispatchEvent('wheel',{deltaY:-80,ctrlKey:true,clientX:box.x+box.width/2,clientY:box.y+box.height/2});
  await page.waitForFunction(()=>parseInt(document.querySelector('.crossword-board-tools output').value)>100);
  assert.equal(await page.evaluate(()=>visualViewport.scale),1,'Ctrl+wheel zoom stays inside the board');
  await pane.focus();await page.keyboard.press('0');assert.equal((await state()).zoom,'100%','keyboard can fit the board');
  await page.keyboard.press('+');assert.ok(parseInt((await state()).zoom)>100,'keyboard can zoom');
  await page.keyboard.press('ArrowRight');assert.ok((await state()).x>0,'keyboard can pan');
  await button('fit').click();await page.screenshot({path:`node_modules/.cache/crossword-viewport/${mode}-${width}.png`});
  if(mode==='practice'){
   await page.locator('[data-practice-tab="search"]').click();await host.locator('.search-grid').waitFor();assert.equal(await host.locator('.crossword-board-tools').count(),0,'switching games disposes viewport');
   await page.locator('[data-practice-tab="crossword"]').click();await pane.waitFor();assert.equal(await host.locator('.crossword-board-tools').count(),1,'returning mounts one viewport');
  }
  console.log(`Crossword viewport: ${engine.name()} ${mode} ${width}px, fit/zoom, drag, pinch, cancellation, typing, redraw, rotation and keyboard passed`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
