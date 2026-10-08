import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];
await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.clock.setFixedTime(new Date('2026-10-08T18:00:00Z'));
try{
 await page.goto(base+'/activities.html?as=him#wordle');
 await page.waitForSelector('.word-keyboard button:not([disabled])');
 const guess=async word=>{for(const letter of word)await page.click('#word-game [data-key="'+letter+'"]');await page.click('#word-game [data-key="↵"]');};
 await guess('zzzzz');assert.match(await page.locator('.word-message').textContent(),/No try used/);assert.equal(await page.locator('.word-grid .correct,.word-grid .present,.word-grid .absent').count(),0);
 for(let i=0;i<5;i++)await page.click('#word-game [data-key="⌫"]');
 const solution=await page.evaluate(async()=>{const {wordForDay}=await import('./daily-words.js');return wordForDay('2026-10-08').word;});
 const wrong=solution==='grape'?'table':'grape';
 // A late confirmation must clear the retry message without spending a second attempt.
 await page.evaluate(async()=>{
  const {sharedLayer}=await import('./data-hub.js'),d=await sharedLayer();
  window.originalGuess=d.submitWordGuess;window.originalTimer=window.setTimeout;
  window.setTimeout=(fn,ms,...args)=>window.originalTimer(fn,ms===20000?30:ms,...args);
  d.submitWordGuess=async options=>{await new Promise(r=>window.originalTimer(r,500));return window.originalGuess(options);};
 });
 await guess(wrong);
 await page.waitForFunction(()=>document.querySelector('.word-message').textContent.includes('waiting for confirmation'));
 await page.waitForFunction(()=>document.querySelectorAll('.word-grid .correct,.word-grid .present,.word-grid .absent').length===5);
 await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');(await sharedLayer()).submitWordGuess=window.originalGuess;window.setTimeout=window.originalTimer;});
 assert.equal((await page.locator('.word-message').textContent()).trim(),'');
 assert.equal(await page.locator('.word-row').nth(1).textContent(),'');
 await guess(wrong);assert.match(await page.locator('.word-message').textContent(),/Already/);
 for(let i=0;i<5;i++)await page.click('#word-game [data-key="⌫"]');
 await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');const d=await sharedLayer();window.saveGuess=d.submitWordGuess;d.submitWordGuess=async()=>{throw Error('network');};});
 await guess(solution);assert.match(await page.locator('.word-message').textContent(),/didn’t save/);
 assert.equal(await page.locator('.word-row').nth(1).textContent(),solution);
 await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js');(await sharedLayer()).submitWordGuess=window.saveGuess;});
 await page.click('#word-game [data-key="↵"]');await page.waitForFunction(()=>document.querySelector('#word-summary').textContent.includes('4 points'));
 await page.reload();await page.waitForFunction(()=>document.querySelector('#word-summary').textContent.includes('4 points'));
 assert.equal(await page.locator('.word-keyboard').count(),0);
 await page.locator('#scoreboard>summary').click();
 assert.match(await page.locator('#weekly-score').textContent(),/☾ 4/);
 for(const [season,date] of [['spooky','2026-10-08T18:00Z'],['normal','2026-11-08T18:00Z'],['christmas','2026-12-08T18:00Z']]){
  await page.evaluate(d=>LittleSeason.refresh(new Date(d)),date);
  await page.setViewportSize({width:320,height:700});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:join(tmpdir(),'little-activities-'+season+'.png'),fullPage:true});
 }
 await page.evaluate(async()=>{
  const {sharedLayer}=await import('./data-hub.js'),data=await sharedLayer();
  for(const [day,both] of [['2026-10-06',true],['2026-10-07',false]]){
   await data.setTo('questions',day,{day,promptId:1,answers:both?{her:{at:2},him:{at:3}}:{her:{at:2}}});
   await data.setTo('questionAnswers',day+'-her',{day,person:'her',text:'sun secret '+day,at:2});
   if(both)await data.setTo('questionAnswers',day+'-him',{day,person:'him',text:'moon memory',at:3});
  }
  await data.setTo('wordWeeks','2026-09-28',{week:'2026-09-28',winners:['him']});
  await data.setTo('wordWeeks','2026-10-05',{week:'2026-10-05',winners:['him']});
 });
 await page.goto(base+'/memories.html?as=him');await page.waitForSelector('[data-open="question-2026-10-06"]');
 await page.evaluate(async()=>{const {sharedLayer}=await import('./data-hub.js'),d=await sharedLayer(),read=d.readDoc;window.reads=[];d.readDoc=async(n,id)=>{window.reads.push(n+'/'+id);return read(n,id);};});
 await page.click('[data-open="question-2026-10-07"]');assert.match(await page.locator('#memory-random').textContent(),/still sealed/);
 assert.ok(!(await page.evaluate(()=>window.reads)).includes('questionAnswers/2026-10-07-her'));
 await page.click('[data-close-memory]');await page.click('[data-open="question-2026-10-06"]');
 await page.waitForFunction(()=>document.querySelector('#memory-random').textContent.includes('sun secret 2026-10-06'));
 assert.match(await page.locator('#memory-random').textContent(),/moon memory/);
 await page.goto(base+'/him.html');await page.waitForSelector('.word-crown small');
 assert.equal(await page.locator('.word-crown small').first().textContent(),'2');
 assert.ok(await page.locator('img[src*="moon-profile"]').first().getAttribute('src'));
 // A tie is playable independently; it must not write to the daily board.
 await page.evaluate(async()=>{
  const {sharedLayer}=await import('./data-hub.js'),d=await sharedLayer();
  await d.removeFrom('wordWeeks','2026-10-05');
  await d.setTo('wordPuzzles','2026-10-05-tie-1',{day:'2026-10-05-tie-1',week:'2026-10-05',word:'jazzy',opensAt:1,closesAt:4102444800000});
  await d.setTo('wordDuels','2026-10-05-tie-1',{week:'2026-10-05',round:1,puzzleId:'2026-10-05-tie-1',scores:{her:8,him:8}});
 });
 await page.goto(base+'/activities.html?as=him#tiebreaker');await page.waitForSelector('.tie-board .word-keyboard button:not([disabled])');
 for(const letter of 'jazzy')await page.click('.tie-board [data-key="'+letter+'"]');await page.click('.tie-board [data-key="↵"]');
 await page.waitForFunction(()=>document.querySelector('.tie-summary').textContent.includes('20 points'));
 assert.match(await page.locator('#word-summary').textContent(),/4 points/);
 await page.goto(base+'/today.html?as=him');assert.equal(await page.locator('#question,#game').count(),0);
 await page.goto(base+'/today.html?as=him#question');await page.waitForURL('**/activities.html?as=him#question');assert.ok(await page.locator('#question-answer').isVisible());
 assert.deepEqual(errors,[]);
 console.log('ACTIVITIES UI: invalid/repeated words, failed-write retry, saved guesses, scores, seasonal 320px layout, private memories, crown overlays, independent ties and old links pass');
}finally{await browser.close();}
