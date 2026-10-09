import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8777';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
try{
 for(const side of ['her','him']){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.fallback():route.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/notes.html?as='+side);await page.waitForSelector('.app-dock');await page.locator('.thinking-screen').waitFor({state:'hidden'});
  await page.evaluate(async side=>{
    const d=await(await import('./data-hub.js')).sharedLayer();
    await d.setTo('notes','touch-note',{sender:side,recipient:side==='her'?'him':'her',body:'A note',createdAt:Date.now(),read:true});
  },side);
  const heading=page.locator('h1');await heading.dblclick();
  assert.equal(await page.evaluate(()=>getSelection().toString()),'','double-tap title does not select it');
  const policies=await page.evaluate(()=>{
    const style=el=>{const css=getComputedStyle(el);return {select:css.userSelect||css.webkitUserSelect,callout:css.getPropertyValue('-webkit-touch-callout'),touch:css.touchAction};};
    return {heading:style(document.querySelector('h1')),input:style(document.querySelector('#note-quick-text')),dock:style(document.querySelector('.dock-item')),viewport:document.querySelector('meta[name="viewport"]').content};
  });
  assert.equal(policies.heading.select,'none');assert.equal(policies.input.select,'text');assert.equal(policies.dock.select,'none');
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(policies.viewport),'pinch zoom retained');
  // Desktop WebKit lacks the iOS-only callout property. Check it when exposed,
  // otherwise verify the shipped rule instead of pretending this is an iPhone.
  if(policies.heading.callout)assert.equal(policies.heading.callout,'none');
  assert.match(readFileSync(new URL('../styles.css',import.meta.url),'utf8'),/:where\(h1,[\s\S]*?-webkit-touch-callout:none;/);
  await page.fill('#note-quick-text','editable words');await page.locator('#note-quick-text').evaluate(input=>{input.focus();input.setSelectionRange(0,8);});
  assert.equal(await page.locator('#note-quick-text').evaluate(input=>input.selectionEnd-input.selectionStart),8);
  const row=page.locator('[data-id="touch-note"]');
  await row.locator('.row-more').click();
  assert.equal(await row.getByRole('menuitem',{name:'copy',exact:true}).count(),0,'no new Copy menu');
  await row.getByRole('menuitem',{name:'edit',exact:true}).click();
  const editor=row.locator('textarea');
  assert.equal(await editor.evaluate(el=>getComputedStyle(el).userSelect||getComputedStyle(el).webkitUserSelect),'text');
  const nativeMenuAllowed=await editor.evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})));
  assert.equal(nativeMenuAllowed,true,'editing context menu is not intercepted');
  await row.locator('[data-cancel-note]').click();
  // Scrolling or cancelling a finger must cancel a pending long-press menu.
  await row.locator('p').evaluate(el=>{
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,isPrimary:true,button:0,clientX:100,clientY:200}));
    document.dispatchEvent(new Event('scroll'));
  });await page.waitForTimeout(650);assert.equal(await row.locator('.row-context-menu').count(),0);
  await row.locator('p').evaluate(el=>{
    el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,isPrimary:true,button:0,clientX:100,clientY:200}));
    document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true}));
  });await page.waitForTimeout(650);assert.equal(await row.locator('.row-context-menu').count(),0);
  await row.locator('.row-more').focus();await page.keyboard.press('Enter');
  assert.equal(await row.locator('.row-more').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
  assert.equal(await row.locator('.row-more').getAttribute('aria-expanded'),'false');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('TOUCH POLISH: both sides, no title selection, iOS callout policy, editable selection/paste, unchanged note actions, cancelled holds, keyboard menus and zoom pass');
}finally{await browser.close();}
