import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const context=await browser.newContext({viewport:{width:320,height:700},serviceWorkers:'block',reducedMotion:'no-preference'});
await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.clock.setFixedTime(new Date('2026-10-08T18:00:00Z'));
try {
 for(const side of ['her','him']){
  await page.goto(base+'/activities.html?as='+side+'#wordle');
  await page.waitForSelector('.word-keyboard button:not([disabled])');
  await page.evaluate(async person=>{
   const d=await(await import('./data-hub.js')).sharedLayer(),day='2026-10-08';
   await d.setTo('wordPuzzles',day,{day,word:'apple',opensAt:1,closesAt:4102444800000});
   await d.setTo('wordGames',day+'-'+person,{day,person,guesses:['allee','grape'],done:false,won:false,updatedAt:1});
  },side);
  await page.waitForSelector('.word-keyboard [data-key="g"].absent');
  assert.equal(await page.locator('.word-keyboard [data-key="l"]').getAttribute('class'),'present ','an extra L cannot erase a known L');
  assert.match(await page.locator('.word-keyboard [data-key="a"]').getAttribute('class'),/correct/,'later yellow cannot erase earlier correct');
  assert.match(await page.locator('.word-keyboard [data-key="g"]').getAttribute('aria-label'),/not in the word/);
  for(const [season,date] of [['normal','2026-11-08T18:00Z'],['spooky','2026-10-08T18:00Z'],['christmas','2026-12-08T18:00Z']]){
   await page.evaluate(d=>LittleSeason.refresh(new Date(d)),date);
   const colors=await page.evaluate(()=>Object.fromEntries(['g','l','a','z'].map(letter=>{
    const b=document.querySelector('.word-keyboard [data-key="'+letter+'"]'),c=getComputedStyle(b);
    return [letter,{bg:c.backgroundColor,fg:c.color,disabled:b.disabled}];
   })));
   assert.equal(new Set(Object.values(colors).map(c=>c.bg)).size,4,side+' '+season+': all four key states are distinct');
   assert.ok(colors.g.bg.match(/\d+/g).slice(0,3).every(n=>Number(n)<55),'absent key is near black');
   assert.equal(colors.g.disabled,false,'darkened letters remain usable in another guess');
   // Normal-motion phones must not replay old reveal effects on every keystroke.
   await page.click('.word-keyboard [data-key="b"]');
   assert.ok(await page.locator('.word-row').nth(2).textContent()==='b');
   const previous=await page.locator('.word-grid .correct,.word-grid .present,.word-grid .absent').evaluateAll(nodes=>nodes.map(n=>({animation:getComputedStyle(n).animationName,opacity:getComputedStyle(n).opacity})));
   assert.ok(previous.length===10&&previous.every(n=>n.animation==='none'&&n.opacity==='1'),'old guesses never blink while typing');
   await page.click('.word-keyboard [data-key="⌫"]');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   await page.locator('#wordle').screenshot({path:join(tmpdir(),'word-keys-'+side+'-'+season+'.png')});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('WORD KEYBOARD: four distinct states, dark absent letters, repeated-letter precedence, accessible labels and 320px layout on both sides in all three themes');
}finally{await browser.close();}
