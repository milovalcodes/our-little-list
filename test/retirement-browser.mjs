import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.APP_TEST_URL||'http://127.0.0.1:8777';
mkdirSync('node_modules/.cache/retirement',{recursive:true});
for(const [engine,launcher] of Object.entries({chromium,webkit})){
 const browser=await launcher.launch();
 try{for(const side of ['her','him'])for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[],requested=[];
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requested.push(new URL(r.url()).pathname));
  await page.clock.setFixedTime(new Date('2026-10-24T18:00Z'));
  await page.addInitScript(()=>localStorage.setItem('our-little-list-couple-profile-v1',JSON.stringify({sunName:'Anely',moonName:'Emilio'})));
  await page.goto(`${base}/activities.html?as=${side}&game=crossword#crossword`);
  await page.locator('#question-answer').waitFor();assert.equal(new URL(page.url()).searchParams.has('game'),false);
  assert.equal(await page.locator('#wordle,#search,#crossword,#practice,#tiebreaker,#admin-games,.activity-game-link').count(),0);
  await page.evaluate(async()=>{
   const data=await(await import('./data-hub.js')).sharedLayer();
   await data.setTo('wordWeeks','2026-10-12',{week:'2026-10-12',scoreVersion:2,format:'trio',round:0,scores:{her:520,him:480},winners:['her'],settledAt:Date.parse('2026-10-19T13:00Z')});
   await data.setTo('wordWeeks','2026-09-28',{week:'2026-09-28',scores:{her:3,him:6},winners:['him'],settledAt:Date.parse('2026-10-05T13:00Z')});
  });
  await page.locator('#win-2026-10-12').waitFor();assert.match(await page.locator('#wins-history').textContent(),/Anely won/);assert.match(await page.locator('#win-2026-09-28').textContent(),/Emilio won/);
  await page.fill('#question-answer','A little time together');await page.click('#question-save');await page.locator('#question-edit').waitFor();
  assert.match(await page.locator('#question-answers').textContent(),/A little time together/);
  await page.evaluate(async side=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.answerQuestion('2026-10-24',side==='her'?'him':'her','Partner answer',Date.now()+1000);},side);
  await page.locator('#question-reveal').waitFor();await page.click('#question-reveal');await page.waitForFunction(()=>document.getElementById('question-answers').textContent.includes('Partner answer'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  if(width===390)await page.screenshot({path:`node_modules/.cache/retirement/${engine}-${side}.png`,fullPage:true});
  for(const path of [`${side}.html`,'phone-check.html','memories.html','guide.html','practice.html','games.html']){
   await page.goto(`${base}/${path}?as=${side}`);await page.locator('.app-dock').waitFor();
   if(path==='phone-check.html'){
    await page.locator('[data-category=questions]').waitFor({state:'attached'});assert.equal(await page.locator('[data-category="questions"]').count(),1);assert.equal(await page.locator('[data-category="gameTurns"],[data-category="gameStreaks"],[data-comfort="colours"],[data-comfort="typing"]').count(),0);
   }
   if(['practice.html','games.html'].includes(path))assert.equal(new URL(page.url()).pathname,'/activities.html');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${engine}/${side}/${width}/${path} reflow`);
  }
  assert.ok(!requested.some(p=>/\/(daily-word|timed-games|round-engine|weekly-tracker|practice)\.js$/.test(p)));
  assert.deepEqual(errors,[],`${engine}/${side}/${width}`);await context.close();
  console.log(`Activities retirement ${engine} ${side} ${width}px passed`);
 }}finally{await browser.close();}
}
