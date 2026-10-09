import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const base='http://127.0.0.1:8777',errors=[];
try {
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);
 await page.clock.install({time:new Date('2026-10-09T18:00Z')});await page.goto(base+'/tasks.html?as=him#routines');
 await page.click('.context-add');await page.fill('#shared-task-title','feed the cat');
 for(const day of [0,1,2,3,4])await page.uncheck('#routine-days input[value="'+day+'"]');
 await page.click('#task-composer summary');assert.equal(await page.locator('#task-options').isVisible(),false);assert.equal(await page.locator('#repeat-options').isVisible(),false);await page.fill('#task-composer [name=reminderTime]','15:00');await page.click('#shared-task-form [type=submit]');
 const row=page.locator('.task-row',{hasText:'feed the cat'});await row.waitFor();
 assert.match(await row.textContent(),/Fri · Sat/);assert.equal(await page.locator('[data-tab=asks]').count(),0);
 await row.locator('.task-check').click();await page.waitForFunction(()=>document.querySelector('.task-row.done'));
 await page.reload();await page.waitForSelector('.task-row.done');
 await row.locator('.task-check').click();await page.waitForFunction(()=>!document.querySelector('.task-row.done'));
 await page.evaluate(async()=>{window.pings=[];const d=await(await import('./data-hub.js')).sharedLayer();d.notify=async(to,m)=>{pings.push({to,...m});return {queued:true};};});
 await row.locator('[data-action=help]').click();await page.waitForFunction(()=>pings.length===1);
 assert.equal(await page.evaluate(()=>pings[0].to),'her');assert.match(await page.evaluate(()=>pings[0].url),/^tasks.html#item-/);
 await row.locator('.task-title').click();await page.fill('[data-edit-task] [name=title]','feed both cats');await page.click('[data-edit-task] [type=submit]');
 await page.waitForFunction(()=>document.querySelector('.task-row').textContent.includes('feed both cats'));
 await page.goto(base+'/today.html?as=him');await page.locator('#home-next-up [data-inline-action=finish]').first().click();
 await page.goto(base+'/tasks.html?as=him#routines');await page.waitForSelector('.task-row.done');
 await page.clock.fastForward(10*3600000+31000);await page.waitForFunction(()=>!document.querySelector('.task-row.done'));
 assert.equal(await page.locator('.task-check').isEnabled(),true,'Saturday resets');
 await page.clock.fastForward(24*3600000);await page.waitForFunction(()=>document.querySelector('.task-check').disabled);
 // A late old-day write does not check off or uncheck a different day.
 await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();const item=(await d.readOnce('items'))[0];await d.setTo('routineChecks',item.id+'_2026-10-09',{itemId:item.id,day:'2026-10-09',done:true,by:'her',updatedAt:Date.now()});await d.setTo('help','old-ask',{from:'her',to:'him',title:'old water reminder',state:'open',createdAt:Date.now()});});
 await page.goto(base+'/tasks.html?as=him#ask-old-ask');await page.waitForSelector('.task-row.is-deep-linked');
 assert.match(await page.locator('.is-deep-linked').textContent(),/old water reminder/);
 await page.locator('[data-legacy-id=old-ask] .task-check').click();await page.goto(base+'/tasks.html?as=him#ask-old-ask');await page.waitForSelector('.task-row.done.is-deep-linked');
 await page.setViewportSize({width:320,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('ROUTINE UI: create/edit, selected days, reminders, shared daily check, reload, Today completion, midnight, off days, nudge destination, preserved asks and 320px layout pass');
}finally{await browser.close();}
