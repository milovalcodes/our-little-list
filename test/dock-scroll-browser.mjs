import {chromium,webkit,devices} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const base=process.env.DOCK_BASE||'http://127.0.0.1:8777';
const output=process.env.QA_SCREENSHOTS?pathToFileURL(resolve(process.env.QA_SCREENSHOTS)+'/'):new URL('../node_modules/.cache/dock-review/',import.meta.url);
await mkdir(output,{recursive:true});
for(const [engine,device] of [[webkit,'iPhone 13'],[chromium,'Pixel 7']]){
 const browser=await engine.launch();
 try{
  for(const side of ['her','him']){
   const context=await browser.newContext({...devices[device],serviceWorkers:'block'});
   await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
   await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.clock.setFixedTime(new Date('2026-10-21T18:00Z'));
   for(const file of ['activities','notes','tasks',side,'guide']){
    await page.goto(`${base}/${file}.html?as=${side}`);
    const dock=page.locator('.app-dock');await dock.waitFor();
    await page.locator('.thinking-screen').waitFor({state:'hidden'});
    assert.equal(await dock.locator(':scope > .dock-item > svg').count(),5);
    assert.equal(await dock.getAttribute('data-viewport-anchored')!==null,engine===webkit);
    for(const size of [{width:390,height:844},{width:844,height:390},{width:320,height:568}]){
     await page.setViewportSize(size);
     // Emulate the inset reserved by the iPhone home indicator.
     await dock.evaluate(n=>n.style.setProperty('--dock-bottom-gap','34px'));
     for(const y of [0,380,100000,180,0]){
      await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);
      await page.waitForFunction(()=>{
       const box=document.querySelector('.app-dock').getBoundingClientRect();
       return Math.abs(box.bottom+34-(visualViewport.offsetTop+visualViewport.height))<2;
      });
      if(file==='activities'&&side==='her'&&engine===webkit&&size.width===390&&[0,380,100000].includes(y))await page.screenshot({path:new URL('dock-'+(y===0?'question':y===380?'map':'games')+'.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${device}/${side}/${file}: horizontal overflow`);
      if(file==='activities'&&y===100000)assert.ok(await page.evaluate(()=>document.querySelector('.activity-practice-link').getBoundingClientRect().bottom<document.querySelector('.app-dock').getBoundingClientRect().top),'last practice link stays above navigation at the bottom');
     }
    }
    if(file==='activities'){
     await page.setViewportSize({width:390,height:844});
     await page.locator('#practice').scrollIntoViewIfNeeded();
     await page.waitForFunction(()=>Math.abs(document.querySelector('.app-dock').getBoundingClientRect().bottom+34-visualViewport.height-visualViewport.offsetTop)<2);
     await page.screenshot({path:new URL(`${engine.name()}-${side}.png`,output).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
     // The game can hide the dock and then restore it after scrolling/resizing.
     await page.goto(`${base}/activities.html?as=${side}#wordle`);await page.locator('#word-game.game-active').waitFor();
     assert.equal(await dock.isVisible(),false);
     await page.setViewportSize({width:390,height:420});
     await page.locator('.activity-back').click();await page.locator('.crown-map').waitFor();await dock.evaluate(n=>n.style.setProperty('--dock-bottom-gap','34px'));
     await dock.waitFor();
     await page.waitForFunction(()=>Math.abs(document.querySelector('.app-dock').getBoundingClientRect().bottom+34-visualViewport.height-visualViewport.offsetTop)<2);
     await page.setViewportSize({width:390,height:844});
     await page.getByRole('button',{name:'more',exact:true}).click();
     await page.locator('#sheet-more.is-open').waitFor();
     await page.locator('#sheet-more [data-close-sheet]').click();
     await page.locator('#sheet-more').waitFor({state:'hidden'});
    }
   }
   assert.deepEqual(errors,[]);await context.close();
  }
 }finally{await browser.close();}
}
console.log('DOCK: Chromium/Android and WebKit/iPhone, both themes, five destinations, scroll reversal, bottom, rotation, home inset, keyboard resize and game/sheet restoration pass');
