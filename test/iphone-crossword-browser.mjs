import {chromium,webkit} from 'playwright';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {practicePuzzle} from '../practice-catalog.js';
const engine=process.env.GAME_BROWSER==='chromium'?chromium:webkit;
const browser=await engine.launch(),base='http://127.0.0.1:8777',errors=[],failures=[];
const check=(ok,label)=>{if(!ok)failures.push(label);};
await mkdir('node_modules/.cache/iphone-qa',{recursive:true});
try{
 for(const [width,side,level] of [[320,'her','hard'],[390,'him','normal'],[430,'him','hard']]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/practice.html?as=${side}#crossword-${level}`);
  const host=page.locator('#practice-game'),dock=page.locator('.app-dock');await host.locator('.cursor').waitFor();
  await host.locator('.crossword-expand').click(); // Preserve coverage of the optional inline view.
  const label=`${engine.name()} ${width} ${side} ${level}`;
  check(!await dock.isVisible(),label+': dock hidden during unfinished practice crossword');
  const arrow=await host.locator('[data-step="1"]').boundingBox();check(arrow.width>=44&&arrow.height>=44,label+': clue arrows have full touch targets');
  const puzzle=practicePuzzle('crossword',level==='hard'?50:0);
  const rightmost=[...puzzle.grid].flatMap((c,i)=>c==='#'?[]:[i]).sort((a,b)=>b%puzzle.size-a%puzzle.size)[0];
  const visibleCursor=()=>host.locator('.puzzle-scroll').evaluate(p=>{const a=p.querySelector('.cursor').getBoundingClientRect(),b=p.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;});
  await host.locator(`[data-square="${rightmost}"]`).tap();
  await page.keyboard.press('x');
  check(await visibleCursor(),label+': grid keeps the selected square visible after typing');
  await host.locator('.game-input-controls>button:not(.game-native-submit)').tap();
  const input=host.locator('input');await input.evaluate(n=>window.qaInput=n);
  for(const dimensions of [{width,height:480},{width:844,height:390},{width,height:844}]){
   await page.setViewportSize(dimensions);
   await host.locator('[data-entry="1"]').tap();await page.keyboard.insertText('ab');
   await input.evaluate(n=>n.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true})));
   check(await input.evaluate(n=>n===window.qaInput&&n===document.activeElement),label+': native input survives orientation, clue changes and deletion');
   check(await host.locator('.crossword-focus').evaluate(p=>{const a=p.querySelector('.current').getBoundingClientRect(),b=p.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;}),label+': current letter remains visible in the answer strip');
   check(!await dock.isVisible(),label+': keyboard viewport has no dock');
   // Scroll to the visible frame, not the zoomed canvas inside it. Wait for
   // the page's smooth scroll to settle before measuring the sticky clue.
   await host.locator('.crossword-viewport').evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+scrollY+70));
   await page.waitForFunction(()=>{const r=document.querySelector('#practice-game .crossword-current').getBoundingClientRect();return r.top>=0&&r.top<60;});
   const clue=await host.locator('.crossword-current').boundingBox();
   check(clue.y>=0&&clue.y<60&&clue.height<dimensions.height/2,label+': sticky clue fits shortened viewport');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+': no page-wide horizontal overflow');
  }
  await page.screenshot({path:`node_modules/.cache/iphone-qa/${engine.name()}-${width}-${level}.png`});
  await host.locator('.game-input-controls>button:not(.game-native-submit)').tap();
  check(!await dock.isVisible(),label+': dock stays out of the way when returning to game keys');
  if(width===320){
   for(let i=0;i<puzzle.entries.length;i++){
    if(!await host.locator('.crossword-keys').count())break;
    const entry=puzzle.entries[i];await host.locator(`[data-entry="${i}"]`).tap();
    for(let j=0;j<entry.word.length;j++){
     if(!await host.locator('.crossword-keys').count())break;
     const cell=entry.start+j*entry.step,target=host.locator(`[data-square="${cell}"]`);
     if(await target.evaluate(n=>n.classList.contains('found')))continue;
     await target.evaluate(n=>n.click());await page.keyboard.press(entry.word[j].toLowerCase());
    }
   }
   await host.locator('[data-feedback]').filter({hasText:'all found'}).waitFor();
   check(await dock.isVisible(),label+': completing the crossword restores navigation');
  }
  await page.locator('[data-practice-tab="search"]').tap();await page.locator('.search-grid').waitFor();
  check(await dock.isVisible(),label+': leaving crossword restores navigation');
  if(width===320){
   // The longest practice clue, enlarged while the keyboard leaves little room.
   await page.locator('[data-practice-tab="crossword"]').tap();
   await page.waitForFunction(()=>document.querySelector('#practice-title')?.textContent==='Crossword');
   await page.locator('#practice-picker').selectOption('52');
   await host.locator('[data-entry="6"]').tap();await host.locator('.game-input-controls>button:not(.game-native-submit)').tap();
   await page.setViewportSize({width:320,height:480});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.documentElement.style.scrollBehavior='auto';});
   await page.waitForTimeout(400); // Let WebKit finish the text-size/viewport reflow before the user scrolls.
   await host.locator('.crossword-viewport').evaluate(n=>window.scrollTo(0,n.getBoundingClientRect().top+scrollY+50));
   await page.waitForTimeout(350);
   const clue=await host.locator('.crossword-current').boundingBox();
   check(clue.y>=0&&clue.y<60&&clue.height<240,label+': enlarged clue leaves room for the board');
   check(await host.locator('[data-flip]').evaluate(n=>{n.scrollTop=n.scrollHeight;return n.scrollTop>0;}),label+': enlarged clue can be scrolled to its end');
   await page.keyboard.insertText('x');
   check(await host.locator('[data-flip]').evaluate(n=>n.scrollTop>0),label+': typing preserves the long clue scroll position');
   check(await input.evaluate(n=>n===document.activeElement),label+': enlarged clue retains native typing');
   await page.screenshot({path:`node_modules/.cache/iphone-qa/${engine.name()}-large-text-clue.png`});
  }
  await context.close();
 }
 console.log(JSON.stringify({engine:engine.name(),failures,errors}));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
 console.log('IPHONE CROSSWORD: small/large phones, both profiles, normal/hard boards, landscape, shortened keyboard viewport, sticky clues, stable native input, horizontal cursor visibility and dock lifecycle pass');
}finally{await browser.close();}
