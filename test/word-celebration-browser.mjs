import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777';
const errors=[];
async function phone(motion='no-preference'){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:motion});
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-10-09T18:00Z'));
 await page.goto(base+'/activities.html?as=him#wordle');
 await page.waitForSelector('.word-keyboard button:not([disabled])');
 return {page,context};
}
async function finish(page,tries,win=true){
 await page.evaluate(async({tries,win})=>{
  const d=await(await import('./data-hub.js')).sharedLayer(),day='2026-10-09';
  await d.setTo('wordPuzzles',day,{day,word:'apple',opensAt:1,closesAt:4102444800000});
  if(tries>1)await d.setTo('wordGames',day+'-him',{day,person:'him',guesses:['grape','table','crane','beach'].slice(0,tries-1),done:false,won:false,updatedAt:1});
 },{tries,win});
 if(tries>1)await page.waitForFunction(n=>document.querySelectorAll('#word-game .word-grid .absent,#word-game .word-grid .present,#word-game .word-grid .correct').length===(n-1)*5,tries);
 for(const letter of win?'apple':'crown')await page.click('#word-game [data-key="'+letter+'"]');
 await page.click('#word-game [data-key="↵"]');
}
async function settle(page,winner='him'){
 await page.evaluate(async winner=>{
  const d=await(await import('./data-hub.js')).sharedLayer();
  await d.setTo('wordWeeks','2026-09-28',{week:'2026-09-28',winners:[winner],scores:{her:30,him:30},settledAt:Date.now()-7*86400000});
  await d.setTo('wordWeeks','2026-10-05',{week:'2026-10-05',winners:[winner],scores:{her:30,him:30},settledAt:Date.now(),tieRound:2});
 },winner);
}
try{
 for(const [tries,win,tier] of [[1,true,'jackpot'],[2,true,'brilliant'],[3,true,'win'],[4,true,'win'],[5,true,'win'],[5,false,'miss']]){
  const {page,context}=await phone();await finish(page,tries,win);
  await page.waitForSelector('.word-finale-'+tier);
  const pieces=await page.locator('.word-confetti').count();
  assert.equal(pieces,tier==='jackpot'?64:tier==='brilliant'?24:0);
  assert.equal(await page.locator('.word-finale').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  if(!win)assert.match(await page.locator('.word-message').textContent(),/you did your best :c.*APPLE/);
  await page.evaluate(()=>{window.finale=document.querySelector('.word-finale');dispatchEvent(new Event('littlelist:profile'));});
  assert.ok(await page.evaluate(()=>window.finale===document.querySelector('.word-finale')),'redraw never restarts finale');
  await page.waitForTimeout(750);
  await page.screenshot({path:join(tmpdir(),'word-finale-'+tier+'.png')});
  await page.reload();await page.waitForSelector('.word-message');
  assert.equal(await page.locator('.word-finale').count(),0,'finished board never replays on reload');
  await context.close();
 }
 const {page,context}=await phone();
 await page.goto(base+'/him.html');await page.waitForSelector('.app-dock');
 // Pending ties have no settled record and must never crown someone.
 await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('wordDuels','2026-10-05-tie-1',{week:'2026-10-05',round:1,puzzleId:'2026-10-05-tie-1',scores:{her:20,him:20}});});
 assert.equal(await page.locator('.word-coronation').count(),0);
 await page.evaluate(()=>{const draft=document.createElement('textarea');draft.id='test-draft';document.body.append(draft);draft.focus();});
 await settle(page);
 await page.waitForTimeout(1500);
 assert.equal(await page.locator('.word-coronation').count(),0,'never interrupt a draft');
 await page.evaluate(()=>document.getElementById('test-draft').remove());
 await page.setViewportSize({width:320,height:700});
 await page.waitForSelector('.word-coronation[open]');
 assert.equal(await page.locator('.word-coronation').getAttribute('aria-labelledby'),'word-coronation-title');
 await page.waitForSelector('.word-coronation.is-crowned');
 assert.match(await page.locator('.coronation-result').textContent(),/him takes the crown after the tie-break/);
 assert.match(await page.locator('.coronation-streak').textContent(),/2 weeks/);
 assert.equal(await page.locator('[data-score="him"]').textContent(),'30');
 assert.equal(await page.locator('.coronation-confetti .word-confetti').count(),84);
 const overflow=await page.locator('.word-coronation').evaluate(d=>new Promise(resolve=>{
  const start=performance.now();let widest=0;
  function sample(){widest=Math.max(widest,d.scrollWidth-d.clientWidth);if(performance.now()-start<1200)requestAnimationFrame(sample);else resolve(widest);}
  sample();
 }));
 assert.ok(overflow<=1,'no sideways overflow at any animation frame: '+overflow);
 await page.screenshot({path:join(tmpdir(),'word-coronation-moon.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('.word-coronation').count(),0);
 assert.ok(!await page.locator('body').evaluate(b=>b.classList.contains('has-word-coronation')));
 await page.reload();await page.waitForSelector('.app-dock');
 await page.clock.runFor(1500);assert.equal(await page.locator('.word-coronation').count(),0,'ceremony remembered after navigation');
 await context.close();
 const reduced=await phone('reduce');await finish(reduced.page,1);
 await reduced.page.waitForFunction(()=>document.querySelector('.word-message').textContent.includes('how did you even do that'));
 assert.equal(await reduced.page.locator('.word-finale').count(),0,'reduced motion preserves text without confetti');
 await reduced.page.goto(base+'/her.html?as=her');await reduced.page.waitForSelector('.app-dock');
 await reduced.page.evaluate(()=>LittleSeason.refresh(new Date('2026-12-09T18:00Z')));
 await settle(reduced.page,'her');await reduced.page.waitForSelector('.word-coronation.is-finished');
 assert.equal(await reduced.page.locator('.word-confetti').count(),0);
 assert.equal(await reduced.page.locator('[data-score="her"]').textContent(),'30');
 assert.equal(await reduced.page.locator('.coronation-crown').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.match(await reduced.page.locator('.coronation-portrait img').getAttribute('src'),/christmas/);
 await reduced.page.screenshot({path:join(tmpdir(),'word-coronation-sun-christmas.png')});
 await reduced.page.click('.coronation-close');await reduced.context.close();
 const guarded=await phone('reduce');await settle(guarded.page);await guarded.page.waitForSelector('.word-coronation[open]');
 await guarded.page.keyboard.type('grape');
 assert.equal(await guarded.page.locator('#word-game .word-grid .word-row').first().textContent(),'','modal keystrokes never edit the game underneath');
 await guarded.page.click('.coronation-close');await guarded.page.keyboard.type('grape');
 assert.equal(await guarded.page.locator('#word-game .word-grid .word-row').first().textContent(),'grape','normal keyboard play resumes after closing');
 await guarded.context.close();
 assert.deepEqual(errors,[]);
 console.log('WORD CELEBRATIONS UI: all six results, nonblocking layers, no redraw/reload replay, settled tie ceremony, crown streak, score reveal, skip, focus cleanup, 320px layout and reduced motion pass');
}finally{await browser.close();}
