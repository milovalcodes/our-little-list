import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777',errors=[];
const output=new URL('../node_modules/.cache/ui-review/',import.meta.url);await mkdir(output,{recursive:true});
try{
 for(const side of ['her','him']){
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  // Exercise the SFX envelope without requiring an audio device on CI or on
  // Windows WebKit. Browser gestures, preferences and motion gates stay real.
  await context.addInitScript(()=>{
   window.soundCount=0;
   window.AudioContext=class{state='running';currentTime=0;destination={};resume(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:.2});}createGain(){return{gain:{value:0},connect(){return this;},disconnect(){}};}createBufferSource(){return{connect(){},disconnect(){},start(){window.soundCount++;},stop(){this.onended?.();}};}};
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);await page.clock.setFixedTime(Date.parse('2026-10-20T18:00Z'));
  for(const file of [side,'activities','tasks','notes','dates','memories','status','phone-check','practice']){
   await page.goto(`${base}/${file}.html?as=${side}`);await page.locator('.app-dock').waitFor();await page.locator('.thinking-screen').waitFor({state:'hidden'});
   for(const width of [320,375,430,1024]){
    await page.setViewportSize({width,height:812});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${file} ${side} ${width} overflow`);
    const header=await page.evaluate(()=>{
     const hero=document.querySelector('.feature-hero');if(!hero)return null;
     const heading=hero.querySelector('h1').getBoundingClientRect(),bounds=hero.getBoundingClientRect();
     const caption=hero.querySelector('.life-page-caption')?.getBoundingClientRect();
     const controls=[...hero.querySelectorAll('.context-add,.topbar-search')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect());
     return {aligned:Math.abs(heading.left-bounds.left)<2,contained:controls.every(r=>r.right<=bounds.right+1&&r.left>=heading.right-1),captionBelow:!caption||caption.top>=Math.max(heading.bottom,...controls.map(r=>r.bottom))-1};
    });
    if(header)assert.deepEqual(header,{aligned:true,contained:true,captionBelow:true},`${file} ${side} ${width}: title, actions and caption must not collide`);
   }
   await page.setViewportSize({width:375,height:812});
   if([side,'activities','tasks','notes','dates','memories','phone-check'].includes(file))await page.screenshot({path:new URL(side+'-'+file+'.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
  }
  await page.goto(`${base}/tasks.html?as=${side}`);await page.locator('.app-dock').waitFor();await page.locator('[data-empty-add]').waitFor();await page.locator('[data-empty-add]').click();await page.locator('#task-composer.is-open').waitFor();
  await page.waitForFunction(()=>document.activeElement?.id==='shared-task-title');
  await page.locator('#task-composer').evaluate(n=>n.focus());await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>document.activeElement!==document.querySelector('#task-composer')&&!!document.activeElement.closest('.app-sheet')),'Shift+Tab from the sheet itself stays inside: '+await page.evaluate(()=>document.activeElement.outerHTML.slice(0,300)));
  await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('.app-sheet')),'Tab stays in the sheet');
  await page.keyboard.press('Escape');await page.locator('#task-composer').waitFor({state:'hidden'});assert.ok(await page.locator('[data-empty-add]').evaluate(n=>n===document.activeElement),'closing returns focus');
  await page.locator('[data-tab=routines]').click();await page.locator('[data-empty-add]').click();await page.locator('#routine-days').waitFor();await page.keyboard.press('Escape');
  await page.goto(`${base}/phone-check.html?as=${side}#feel`);await page.locator('#feel summary').click();
  assert.equal(await page.locator('#feel [data-comfort=sound]').isChecked(),false,'sounds begin muted');
  await page.locator('#feel [data-comfort=sound]').check();await page.waitForFunction(()=>window.soundCount>0);
  const immediateSave=await page.evaluate(async()=>{
   const audio=await import('./interface-audio.js');await audio.primeInterfaceAudio();audio.stopInterfaceAudio();
   await new Promise(r=>setTimeout(r,200));
   const before=window.soundCount,button=document.createElement('button');document.body.append(button);
   button.click();document.dispatchEvent(new CustomEvent('littlelist:feedback',{detail:{kind:'save'}}));
   await new Promise(r=>setTimeout(r,50));button.remove();return window.soundCount-before;
  });
  assert.equal(immediateSave,2,'a fast confirmed save is not swallowed by the preceding tap');
  await page.locator('#feel [data-comfort=sound]').uncheck();const count=await page.evaluate(()=>window.soundCount);
  await page.locator('#feel [data-comfort=motion]').uncheck();assert.equal(await page.locator('html').getAttribute('data-quiet-motion'),'');assert.equal(await page.evaluate(()=>window.soundCount),count);
  await page.reload();await page.locator('#feel').waitFor();assert.equal(await page.locator('html').getAttribute('data-quiet-motion'),'');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#feel summary').click();await page.locator('#feel [data-comfort=sound]').check();await page.waitForFunction(()=>window.soundCount>0); // Explicit audio preference is independent from motion.
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('App life: both themes, nine destinations, 320/375/430/1024px, header alignment, empty actions, sheet focus, muted defaults, saved comfort and reduced motion pass');
}finally{await browser.close();}
