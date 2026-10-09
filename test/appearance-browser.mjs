import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8777';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
try {
  for (const side of ['her','him']) for (const month of ['01','10','12']) {
    const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
    await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
    let release;
    await context.route('**/firebase-config.js',async r=>{await new Promise(resolve=>{release=resolve;});await r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'});});
    await context.addInitScript(({side})=>{
      localStorage.setItem('our-little-list-side',side);
      localStorage.setItem('our-little-list-couple-profile-v1',JSON.stringify({sunName:'Anely',moonName:'Emilio'}));
      window.paintFrames=[];
      function frame(){
        if(document.body){const loader=document.querySelector('.thinking-screen');window.paintFrames.push({theme:document.body.className,greeting:document.getElementById('sky-greeting')?.textContent,paper:getComputedStyle(document.body).getPropertyValue('--paper'),loader:!!loader});}
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },{side});
    const page=await context.newPage();await page.clock.setFixedTime(new Date(`2026-${month}-15T18:00Z`));
    for (const file of [side,'tasks','activities','today','status','notes','dates','memories','phone-check','guide']) {
      release=null;
      await page.goto(`${base}/${file}.html`,{waitUntil:'commit'});
      await page.waitForSelector('.thinking-screen');
      await page.waitForFunction(()=>window.paintFrames?.filter(f=>f.loader).length>=3);
      const frames=await page.evaluate(()=>window.paintFrames);
      assert.ok(frames.length);
      for(const f of frames){
        assert.ok(f.theme.includes(side+'-theme'),`${side}/${month}/${file}: wrong initial theme ${f.theme}`);
        if(f.greeting)assert.equal(f.greeting,side==='him'?'hi Emilio':'hi Anely');
        if(side==='him'&&f.loader){const rgb=f.paper.match(/[\d.]+/g).map(Number);assert.ok(rgb.slice(0,3).every(n=>n<100),`moon loader paper should be dark: ${f.paper}`);}
      }
      // A stale cosmetic hint must never prevent the real account theme winning.
      await page.evaluate(side=>window.LittleAppearance.setSide(side==='him'?'her':'him'),side);
      assert.ok(await page.evaluate(side=>document.body.classList.contains((side==='him'?'her':'him')+'-theme'),side));
      release?.();
    }
    await context.close();
  }
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  await context.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw new Error('storage unavailable');}});});
  const page=await context.newPage();await page.goto(base+'/him.html?as=him',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#sky-greeting').textContent(),'hi you');assert.ok(await page.locator('body').evaluate(b=>b.classList.contains('him-theme')));
  await context.close();
  console.log('FIRST PAINT: both sides, all shared pages, three seasons, slow account startup, cached names and unavailable storage pass');
} finally {await browser.close();}
