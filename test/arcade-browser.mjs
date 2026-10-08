import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base='http://127.0.0.1:8777',browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];
await context.route('**/firebase-config.js',route=>route.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.fallback():route.abort());
const moon=await context.newPage(),sun=await context.newPage();
for(const page of [moon,sun]){page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);}
const read=(id)=>moon.evaluate(key=>JSON.parse(localStorage.getItem('our-little-list-games-v1')).items.find(g=>g.id===key),id);
async function move(page,id,cell,ply){
  await page.waitForFunction(()=>document.querySelector('.game-status')?.textContent==='your turn');
  await page.click(`[data-cell="${cell}"]`);
  await page.waitForFunction(({id,ply})=>JSON.parse(localStorage.getItem('our-little-list-games-v1')).items.find(g=>g.id===id)?.ply===ply,{id,ply});
  await page.waitForFunction(()=>!document.querySelector('.game-hint')?.textContent.includes('sending your move'));
}
async function choose(page,id){if(await page.locator('[data-game="lobby"]').count())await page.click('[data-game="lobby"]');await page.click(`[data-pick-game="${id}"]`);}
try{
  await moon.goto(base+'/today.html?as=him#game-connect-four');
  await sun.goto(base+'/today.html?as=her#game-connect-four');
  await moon.click('[data-game="start"]');
  await sun.waitForSelector('.four-board');
  for(let round=1;round<=3;round++){
    for(const [i,col]of [0,1,0,1,0,1,0].entries())await move(i%2?moon:sun,'connect-four',col,i+1);
    assert.equal((await read('connect-four')).score.her,round);
    await moon.waitForFunction(()=>document.querySelectorAll('.four-slot.winning-cell').length===4);
    if(round<3)await moon.click('[data-game="start"]');
  }
  assert.equal((await read('connect-four')).wins.her,1);
  await moon.click('[data-game="start"]');
  await moon.waitForFunction(()=>JSON.parse(localStorage.getItem('our-little-list-games-v1')).items.find(g=>g.id==='connect-four').score.her===0);
  assert.equal((await read('connect-four')).score.her,0);
  await choose(moon,'dots-boxes');await choose(sun,'dots-boxes');
  await moon.click('[data-game="start"]');
  for(const [i,edge]of [0,1,3,4,12,14,13].entries())await move(i%2?moon:sun,'dots-boxes',edge,i+1);
  await sun.waitForFunction(()=>document.querySelector('.game-turn-hint')?.textContent==='box claimed. go again!');
  assert.equal((await read('dots-boxes')).turn,'her');
  assert.equal(await sun.locator('.box-owned.her').count(),2);
  const remaining=Array.from({length:24},(_,i)=>i).filter(i=>![0,1,3,4,12,14,13].includes(i));
  for(const edge of remaining){const game=await read('dots-boxes');await move(game.turn==='her'?sun:moon,'dots-boxes',edge,game.ply+1);}
  const boxes=await read('dots-boxes');assert.equal(Object.keys(boxes.boxes).length,9);assert.equal(boxes.score[boxes.winner],1);
  // A notification in an already-open tab selects its own game, not the last game viewed.
  const four=await read('connect-four');
  await moon.evaluate(round=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'OPEN_NOTIFICATION',url:`${location.origin}/games.html${location.search}#game-connect-four--${round}`}})),four.round);
  await moon.waitForSelector('.four-board');assert.equal(await moon.locator('#game h2').textContent(),'Four in a Row');
  await moon.reload();await moon.waitForSelector('.four-board');
  assert.equal((await read('connect-four')).wins.her,1);assert.equal((await read('dots-boxes')).ply,24);
  await choose(moon,'sun-moon');await moon.click('[data-game="start"]');
  await moon.waitForSelector('.couple-board');
  assert.equal((await read('sun-moon')).ply,0);assert.equal((await read('dots-boxes')).ply,24);
  // Home's waiting turn opens the correct game without changing the signed-in side.
  await sun.goto(base+'/her.html?as=her');await sun.waitForSelector('a[href*="game-connect-four--"]');
  await sun.click('a[href*="game-connect-four--"]');await sun.waitForSelector('.four-board');
  assert.ok(await sun.locator('body.her-theme').count());
  for(const width of [390,320])for(const page of [moon,sun]){
    await page.setViewportSize({width,height:844});
    for(const id of ['connect-four','dots-boxes','sun-moon']){
      await choose(page,id);
      await page.locator('.thinking-screen').waitFor({state:'hidden'});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${id} fits ${width}`);
      const missing=await page.locator('#game button').evaluateAll(buttons=>buttons.filter(b=>!b.getAttribute('aria-label')&&!b.textContent.trim()).length);assert.equal(missing,0);
      await page.evaluate(()=>window.scrollTo(0,document.querySelector('#game').getBoundingClientRect().top+scrollY-64));
      await page.screenshot({path:join(tmpdir(),`little-arcade-${id}-${page===moon?'moon':'sun'}-${width}.png`)});
    }
  }
  await choose(sun,'connect-four');await context.setOffline(true);
  await sun.waitForFunction(()=>document.querySelectorAll('.four-column:not(:disabled)').length===0);
  assert.equal(await sun.locator('.four-column:not(:disabled)').count(),0);
  await context.setOffline(false);
  await sun.locator('.game-rules summary').click();await sun.click('[data-game="close"]');await sun.click('[data-game="close"]');
  await sun.waitForFunction(()=>document.querySelector('.game-status')?.textContent==='put away for now');
  assert.equal((await read('connect-four')).wins.her,1);
  assert.deepEqual(errors,[]);
  console.log('ARCADE BROWSER: paired turns, full match, rematch, box chains, game switching, exact notification, reload, Home link, 12 phone views and offline controls');
}finally{await browser.close();}
