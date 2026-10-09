import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777';
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(8000);
 await page.clock.setFixedTime(new Date('2026-10-09T18:00Z'));
 await page.goto(base+'/him.html?as=him');await page.waitForSelector('.app-dock');
 assert.equal(await page.locator('.app-dock a[href="today.html"]').count(),0);
 assert.equal(await page.locator('.more-grid a[href="notes.html"]').count(),0);
 assert.equal(await page.locator('.app-dock a[href="notes.html"] .attention-badge').count(),0);
 assert.equal(await page.locator('.dock-item i').first().evaluate(el=>getComputedStyle(el,'::after').content),'none');
 await page.evaluate(async()=>{
  const d=await(await import('./data-hub.js')).sharedLayer(),now=Date.now();
  await d.setTo('notes','new-note',{sender:'her',recipient:'him',body:'only in notes please',createdAt:now,read:false});
  await d.setTo('items','new-task',{type:'task',title:'new task',addedBy:'her',createdAt:now,done:false});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;canvas.getContext('2d').fillRect(0,0,16,16);
  await d.setTo('profilePhotos','him',{person:'him',photo:canvas.toDataURL('image/jpeg'),updatedAt:now});
 });
 await page.waitForSelector('.app-dock a[href="notes.html"] .attention-badge');
 await page.waitForSelector('.app-dock a[href="tasks.html"] .attention-badge');
 assert.equal(await page.locator('.app-dock a[href="notes.html"] .attention-badge').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 122, 24)');
 assert.equal(await page.locator('#sky-note-star').count(),0);
 await page.evaluate(()=>document.querySelector('.incoming-note')?.remove());
 await page.waitForSelector('#sky-person-him .has-alter-ego');
 await page.locator('.thinking-screen').waitFor({state:'hidden'});
 const avatar=page.locator('#sky-person-him .sky-avatar');
 await avatar.tap();assert.equal(await avatar.getAttribute('aria-pressed'),'true');assert.match(page.url(),/him.html/);
 await page.waitForTimeout(500);await avatar.dblclick();await page.waitForURL('**/status.html#profile-him');
 await page.waitForSelector('.status-avatar');assert.equal(await page.locator('#profile-notes').count(),0);
 await page.goto(base+'/today.html?as=him#focus');await page.waitForURL('**/him.html#focus');await page.waitForSelector('#sheet-focus:not([hidden])');
 await page.click('#sheet-focus [data-close-sheet]');
 await page.goto(base+'/today.html?as=him#new');await page.waitForURL('**/him.html#new');await page.waitForSelector('#new[open]');
 const note=await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();return(await d.readOnce('notes'))[0];});assert.equal(note.read,false);
 assert.equal(await page.locator('#activity-list').getByText('only in notes please').count(),0);
 await page.click('.app-dock a[href="tasks.html"]');await page.waitForSelector('.task-row');await page.waitForFunction(()=>!document.querySelector('.app-dock a[href="tasks.html"] .attention-badge'));
 await page.click('.app-dock a[href="notes.html"]');await page.waitForSelector('.note-thread-row');await page.waitForFunction(()=>!document.querySelector('.app-dock a[href="notes.html"] .attention-badge'));
 await page.goto(base+'/him.html');await page.waitForSelector('.app-dock');await page.locator('.thinking-screen').waitFor({state:'hidden'});await page.screenshot({path:join(tmpdir(),'little-home-declutter.png'),fullPage:true});
 for(const type of ['word','search','crossword']){
  await page.goto(base+'/practice.html#'+type);await page.waitForSelector('#practice-game[aria-busy=false]');
  await page.locator('.thinking-screen').waitFor({state:'hidden'});
  await page.screenshot({path:join(tmpdir(),'little-practice-'+type+'.png'),fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('Declutter: meaningful orange badges, real-time clearing, single flip/double profile, no duplicated notes, preserved Today/focus links and no accidental receipts pass');
}finally{await browser.close();}
