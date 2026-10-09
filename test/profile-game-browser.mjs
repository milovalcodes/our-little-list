import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://127.0.0.1:8777';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
const errors=[];
await context.route('**/firebase-config.js',route=>route.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.fallback():route.abort());
const moon=await context.newPage(),sun=await context.newPage();
for(const page of [moon,sun]){page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);}
async function capture(page,name,selector){
  await page.locator('.thinking-screen').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!document.body.classList.contains('sheet-open'));
  await page.locator('.app-sheet:not([hidden])').waitFor({state:'hidden'});
  if(selector)await page.evaluate(s=>window.scrollTo(0,document.querySelector(s).getBoundingClientRect().top+scrollY-14),selector);
  else await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:join(tmpdir(),name)});
}
try{
  await moon.goto(base+'/him.html?as=him');
  await moon.waitForSelector('.app-dock');
  await moon.click('#sky-person-him .sky-person-label');
  await moon.waitForSelector('[data-profile-owner="true"]');
  assert.equal(await moon.locator('#sheet-quick-status').count(),0);
  await moon.click('.person-status-card.is-me');
  await moon.fill('#status-text','making tea');await moon.click('#status-save');
  await moon.click('#profile-tabs a[href$="profile-her"]');
  await moon.waitForSelector('[data-profile-owner="false"]');
  assert.ok(await moon.locator('body.him-theme').count());
  assert.ok(!await moon.locator('.status-editor').isVisible());
  assert.ok(!await moon.locator('#location-action').isVisible());
  await moon.click('[data-open-quick="note"]');
  await moon.fill('#quick-text','tea for two');await moon.click('#quick-submit');
  await moon.waitForFunction(()=>JSON.parse(localStorage.getItem('our-little-list-notes-v1')||'{"items":[]}').items.some(n=>n.body==='tea for two'&&n.sender==='him'&&n.recipient==='her'));
  await capture(moon,'little-profile-partner.png');
  await moon.goto(base+'/status.html?as=him#profile-him');
  await moon.waitForSelector('.person-status-card');
  assert.match(await moon.locator('#status-pair').innerText(),/making tea/);
  await capture(moon,'little-profile-own.png');
  console.log('ok profiles preserve the viewer, hide partner controls, and send to the right person');

  await moon.evaluate(()=>localStorage.setItem('our-little-list-items-v1',JSON.stringify({items:[{id:'old-task',title:'already finished',type:'task',done:true,createdAt:1,doneAt:2}]})));
  await moon.goto(base+'/tasks.html?as=him#item-old-task');
  await moon.waitForSelector('.task-row.is-deep-linked');
  assert.match(await moon.locator('.tab.active').innerText(),/done/i);
  await moon.evaluate(()=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'OPEN_NOTIFICATION',url:location.href}})));
  await moon.waitForSelector('.task-row.is-deep-linked');
  await moon.goto(base+'/today.html?as=him#focus');
  await moon.waitForSelector('#sheet-focus:not([hidden])');
  for(const page of [moon,sun])assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  assert.deepEqual(errors,[]);
  console.log('ok stale task ping, repeated notification target, focus link and phone-width layout');
} finally { await browser.close(); }
