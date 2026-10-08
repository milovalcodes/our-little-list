import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const base='http://127.0.0.1:8777';
const browser=await (process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const errors=[];
try {
  for(const side of ['her','him']) {
    const context=await browser.newContext({viewport:{width:320,height:700},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
    await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
    const go=async path=>{await page.goto(`${base}/${path}?as=${side}`);await page.waitForSelector('.app-dock');await page.locator('.thinking-screen').waitFor({state:'hidden'});};
    await go('games.html');
    assert.deepEqual(await page.locator('.dock-item>span').allTextContents(),['home','list','activities','today','more']);
    assert.equal(await page.locator('.dock-item[aria-current="page"]>span').textContent(),'activities');
    assert.equal(await page.locator('.context-add').count(),0);
    await page.waitForSelector('.game-shelf-item');
    for(const [season,date] of [['normal','2026-11-15T12:00:00-05:00'],['spooky','2026-10-15T12:00:00-04:00'],['christmas','2026-12-15T12:00:00-05:00']]) {
      await page.evaluate(date=>window.LittleSeason.refresh(new Date(date)),date);
      const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,view:innerWidth,last:document.querySelector('.game-shelf-item:last-child').getBoundingClientRect().bottom,dock:document.querySelector('.app-dock').getBoundingClientRect().top}));
      assert.ok(layout.width<=layout.view+2 && layout.last<layout.dock,`${side}/${season}: whole shelf fits above dock`);
      await page.screenshot({path:join(tmpdir(),`little-games-shelf-${side}-${season}.png`)});
    }
    await page.click('[data-pick-game="connect-four"]');
    assert.equal(await page.locator('#game h2').textContent(),'Four in a Row');
    assert.equal(await page.locator('.game-room-intro').isVisible(),false);
    await page.goBack();await page.waitForSelector('.game-shelf-item');
    await page.goForward();await page.waitForSelector('[data-game="start"]');
    await page.click('[data-game="start"]');await page.waitForSelector('.four-board');
    assert.equal(await page.locator('.game-rules').getAttribute('open'),null);
    assert.equal(await page.locator('[data-game="close"]').isVisible(),false);
    await page.click('[data-game="lobby"]');
    assert.match(await page.locator('[data-pick-game="connect-four"]').textContent(),/waiting for/);
    await page.reload();await page.waitForSelector('[data-pick-game="connect-four"]');
    assert.match(await page.locator('[data-pick-game="connect-four"]').textContent(),/waiting for/);
    await page.click('[data-pick-game="connect-four"]');await page.waitForSelector('.four-board');
    await page.locator('.game-rules summary').click();
    await page.click('[data-game="close"]');assert.equal(await page.locator('[data-game="close"]').textContent(),'yes, end this round');
    await page.click('[data-game="cancel"]');assert.equal(await page.locator('.game-rules').getAttribute('open'),'');
    await go('today.html');assert.equal(await page.locator('#game').count(),0);assert.equal(await page.locator('.context-add').count(),0);
    // A stale bookmark or an old notification opened into an existing Today tab.
    await page.evaluate(()=>{location.hash='game-connect-four';});
    await page.waitForURL('**/activities.html?as='+side+'#game-connect-four');await page.waitForSelector('.four-board');
    for(const name of ['tasks','dates','memories']) {
      await go(name+'.html');await page.waitForSelector('.context-add');
      const rects=await page.evaluate(()=>Object.fromEntries(['h1','.context-add','.topbar-search'].map(s=>{const r=document.querySelector('.feature-hero '+s).getBoundingClientRect();return[s,{x:r.x,right:r.right,width:r.width,height:r.height}];})));
      assert.ok(rects.h1.right<=rects['.context-add'].x+1 && rects['.context-add'].right<=rects['.topbar-search'].x+1,`${name}: heading and actions do not overlap`);
      assert.ok(rects['.context-add'].height>=44,`${name}: usable add target`);
      if(name==='tasks'){
        for(const tab of ['grocery','asks','done','tasks']){
          await page.click(`[data-tab="${tab}"]`);
          await page.waitForFunction(hidden=>document.querySelector('.context-add').hidden===hidden,tab==='done');
        }
      }
    }
    await go('notes.html');assert.equal(await page.locator('.context-add').count(),0);assert.ok(await page.locator('#note-quick-text').isVisible());
    await go('status.html');assert.equal(await page.locator('.profile-actions a[href*="game"],.profile-actions [data-edit-profile-status]').count(),0);
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log('GAMES NAVIGATION: dedicated dock, seasonal shelf, history, old links, saved rounds, contextual add, uncluttered profile and 320px layout');
} finally {await browser.close();}
