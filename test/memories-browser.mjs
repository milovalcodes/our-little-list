import {chromium,webkit} from 'playwright';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
try{
 const context=await browser.newContext({viewport:{width:320,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-10-12T18:00Z'));
 await page.addInitScript(()=>localStorage.setItem('our-little-list-couple-profile-v1',JSON.stringify({sunName:'Anely',moonName:'Emilio'})));
 await page.goto(base+'/memories.html?as=him');await page.locator('[data-memory-category="app"]').waitFor();
 await page.evaluate(async()=>{
  const d=await(await import('./data-hub.js')).sharedLayer();
  for(const [week,winner,date]of [['2026-09-21','her','2026-09-27'],['2026-09-28','him','2026-10-04']])await d.setTo('wordWeeks',week,{week,winners:[winner],scores:{her:winner==='her'?60:20,him:winner==='him'?60:20},settledAt:Date.parse(date+'T18:00Z')});
  await d.setTo('memories','manual',{text:'a personal little note',addedBy:'him',createdAt:Date.parse('2026-10-09T18:00Z')});
  await d.setTo('memories','date-fixture',{text:'we did: picnic',dateId:'picnic',addedBy:'her',createdAt:Date.parse('2026-10-10T18:00Z')});
 });
 await page.waitForSelector('[data-id="manual"]');assert.equal(await page.locator('.crown-memory').count(),0);
 await page.click('[data-memory-category="app"]');await page.waitForSelector('.crown-memory');
 assert.equal(await page.locator('.crown-memory').count(),2);assert.match(await page.locator('#memory-list').textContent(),/Anely was crowned queen/);assert.match(await page.locator('#memory-list').textContent(),/Emilio was crowned king/);
 await page.evaluate(async()=>{(await import('./profile-store.js')).saveCachedProfile({sunName:'Anely updated',moonName:'Emilio updated'});});
 assert.match(await page.locator('#memory-list').textContent(),/Anely updated was crowned queen/);assert.match(await page.locator('#memory-list').textContent(),/Emilio updated was crowned king/);
 assert.equal(await page.locator('#memory-list [data-id="manual"]').count(),0);assert.equal(await page.locator('#memory-list [data-id="date-fixture"]').count(),1);
 await page.click('[data-open="crown-2026-09-28"]');assert.match(await page.locator('#memory-random').textContent(),/Oct 4, 2026/);assert.equal(await page.locator('#memory-random a').getAttribute('href'),'activities.html#scoreboard-2026-09-28');await page.click('[data-close-memory]');
 await page.click('.context-add');await page.fill('#memory-date','2024-06-01');await page.fill('#memory-text','our first tiny picnic');await page.setInputFiles('#memory-photo',fileURLToPath(new URL('../sun-profile.png',import.meta.url)));await page.click('#memory-save');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('our-little-list-memories-v1')).items.some(m=>m.text==='our first tiny picnic'&&m.hasPhoto));
 assert.equal(await page.locator('[data-memory-category="yours"]').getAttribute('aria-pressed'),'true');
 const card=page.locator('.memory-card').filter({hasText:'our first tiny picnic'});assert.match(await card.textContent(),/Jun 1, 2024/);assert.equal(await card.locator('img').count(),1);
 assert.match(await page.locator('#memory-list .memory-card').last().textContent(),/our first tiny picnic/);
 await page.goto(base+'/memories.html?as=him#memory-crown-2026-09-28');await page.waitForSelector('[data-id="crown-2026-09-28"]');assert.equal(await page.locator('[data-memory-category="app"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('.crown-memory').count(),2,'reload cannot create another crown memory');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);
 console.log('MEMORIES UI: category separation, king/queen history, dated crown links, backdated photo+description, chronological order and deep links pass');
}finally{await browser.close();}
