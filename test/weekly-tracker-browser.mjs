import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {join} from 'node:path';import {tmpdir} from 'node:os';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
try{
 for(const side of ['her','him']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  // The separate ceremony test covers the modal; this is a previously-seen recap.
  await context.addInitScript(side=>localStorage.setItem('our-little-list-coronation-v1:'+side+':2026-10-05','seen'),side);
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.setFixedTime(new Date('2026-10-12T18:00Z'));
  await page.goto(base+'/activities.html?as='+side+'#scoreboard');
  await page.waitForSelector('#score-week');
  await page.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer(),day='2026-10-09',at=Date.parse(day+'T18:00Z');
   for(const [person,attempts]of [['her',1],['him',2]])await d.setTo('wordResults',day+'-'+person,{day,person,attempts,done:true,won:true,updatedAt:at});
   for(const [person,type,count,total]of [['her','search',10,10],['her','crossword',3,6],['him','search',6,10],['him','crossword',6,6]])await d.setTo('timedResults',day+'-'+type+'-'+person,{day,person,type,count,total,done:true,complete:count===total,startedAt:at-120000,finishedAt:at,closesAt:at+3600000});
   await d.setTo('wordWeeks','2026-10-05',{week:'2026-10-05',end:'2026-10-11',format:'trio',scoreVersion:2,round:0,scores:{her:175,him:120},winners:['her'],settledAt:at});
  });
  if(await page.locator('.coronation-close').count())await page.locator('.coronation-close').click();
  await page.selectOption('#score-week','2026-10-05');
  await page.waitForFunction(()=>document.querySelector('#weekly-score').textContent.includes('☀ 175 · ☾ 120'));
  assert.match(await page.locator('.score-winning-edge').textContent(),/Little Word.*60 more points/);
  assert.match(await page.locator('.score-source-search').textContent(),/50.*30/s);
  await page.locator('[data-score-detail="2026-10-09"]>summary').click();
  assert.match(await page.locator('[data-score-detail="2026-10-09"]').textContent(),/3 \/ 6 words/);
  assert.equal(await page.locator('.score-avatar .word-crown').count(),0);
  await page.reload();await page.waitForFunction(()=>document.querySelector('#weekly-score').textContent.includes('☀ 175'));
  await page.locator('.thinking-screen').waitFor({state:'detached'});
  assert.equal(await page.locator('#score-week').inputValue(),'2026-10-05','notification/history link remembers the recap week');
  for(const [theme,date]of [['spooky','2026-10-12T18:00Z'],['christmas','2026-12-12T18:00Z'],['normal','2026-11-12T18:00Z']]){
   await page.evaluate(date=>LittleSeason.refresh(new Date(date)),date);
   await page.setViewportSize({width:320,height:740});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   await page.locator('#weekly-board').screenshot({path:join(tmpdir(),`little-weekly-${side}-${theme}.png`)});
  }
  await page.selectOption('#score-week','2026-10-12');
  await page.waitForFunction(()=>document.querySelector('#weekly-score').textContent.includes('☀ 0 · ☾ 0'));
  await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('wordResults','2026-10-12-him',{day:'2026-10-12',person:'him',attempts:2,done:true,won:true,updatedAt:Date.now()});});
  await page.waitForFunction(()=>document.querySelector('#weekly-score').textContent.includes('☾ 40'));
  await page.locator('[data-score-detail="2026-10-12"]>summary').click();
  await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('wordResults','2026-10-12-her',{day:'2026-10-12',person:'her',attempts:3,done:true,won:true,updatedAt:Date.now()});});
  await page.waitForFunction(()=>document.querySelector('#weekly-score').textContent.includes('☀ 30'));
  assert.equal(await page.locator('[data-score-detail="2026-10-12"]').getAttribute('open'),'','live points retain the expanded day');
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('WEEKLY UI: source tallies, archived recaps, biggest edge, exact-week links, live totals, preserved expansion and six seasonal mobile views pass');
}finally{await browser.close();}
