// Runs the shipped game and live adapter against an isolated, real nursery
// durable object. No production account, push endpoint, or save is involved.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {StarNursery,freshRecord} from '../worker/src/star-store.js';
import {scenario} from '../little-star/engine.mjs';
const now=Date.parse('2026-10-20T17:00:00Z'),base='http://127.0.0.1:8777',wallNow=Date.now;
Date.now=()=>now;
const browser=await(process.env.STAR_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
const output=new URL('../node_modules/.cache/ui-review/',import.meta.url);await mkdir(output,{recursive:true});
function nursery(){
 const record=freshRecord(now);record.state=scenario('ready',now);record.state.wallets={him:500,her:500};
 const values=new Map([['nursery',record]]);let queue=Promise.resolve();
 return new StarNursery({storage:{transaction(fn){
  const result=queue.then(async()=>{const copy=new Map(structuredClone([...values]));const result=await fn({get:async k=>structuredClone(copy.get(k)),put:async(k,v)=>copy.set(k,structuredClone(v))});values.clear();for(const [k,v] of copy)values.set(k,v);return result;});queue=result.catch(()=>{});return result;
 }}},{});
}
try{
 for(const side of ['her','him']){
  const context=await browser.newContext({viewport:{width:375,height:812},serviceWorkers:'block'}),object=nursery();let broken=false;
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/page-boot.js',r=>r.fulfill({contentType:'text/javascript',body:`export async function bootPage(){return {viewer:'${side}',data:{mode:'firebase',getIdToken:async()=>'qa'}};}`}));
  await context.route('**/push-config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const DELIVERY_URL=location.origin+'/dispatch';"}));
  await context.route('**/star',async route=>{
   if(broken)return route.fulfill({status:502,body:'Gateway unavailable'});
   const input=route.request().postDataJSON(),response=await object.fetch(new Request('https://internal/',{method:'POST',body:JSON.stringify({...input,actor:side})}));
   await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
  });
  await context.addInitScript(()=>{
   const parameter=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
   const node=()=>({connect(target){return target;},gain:parameter(),frequency:parameter(),detune:parameter(),delayTime:parameter(),threshold:parameter(),ratio:parameter(),Q:parameter(),setPeriodicWave(){},start(){},stop(){}});
   window.AudioContext=class{state='suspended';sampleRate=44100;currentTime=0;destination=node();resume(){return Promise.reject(Error('No audio output in QA'));}createGain(){return node();}createOscillator(){return node();}createDelay(){return node();}createDynamicsCompressor(){return node();}createPeriodicWave(){return {};}createBuffer(){return {getChannelData:()=>new Float32Array(26460)};}createBufferSource(){return node();}createBiquadFilter(){return node();}};
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);await page.clock.setFixedTime(now);
  await page.goto(base+'/little-star.html#play');await page.locator('[data-sound]').waitFor();
  assert.equal(await page.locator('[data-tab=play]').getAttribute('aria-pressed'),'true','notification link opens the requested section');
  await page.locator('[data-sound]').focus();await page.keyboard.press('Space');assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'),'true');
  assert.ok(await page.locator('[data-sound]').evaluate(n=>n===document.activeElement),'sound toggle preserves keyboard focus');
  await page.locator('button[data-calm]').click();assert.equal(await page.locator('#little-star-demo').getAttribute('data-calm'),'true');
  await page.reload();await page.locator('[data-sound]').waitFor();
  assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'),'true','sound survives reload');
  assert.equal(await page.locator('button[data-calm]').getAttribute('aria-pressed'),'true','calm mode survives reload');
  for(const width of [320,375,430]){
   await page.setViewportSize({width,height:812});
   for(const tab of ['nursery','play','shop','journal']){
    await page.locator(`[data-tab=${tab}]`).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),side+' '+tab+' fits '+width);
   }
  }
  await page.setViewportSize({width:375,height:812});await page.locator('[data-tab=play]').click();
  await page.screenshot({path:new URL(side+'-little-star.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
  await page.locator('[data-kitchen]').click();await page.locator('.nursery-sheet[open]').waitFor();
  await page.locator('[data-close-sheet]').press('Shift+Tab');assert.ok(await page.evaluate(()=>document.activeElement.checkVisibility()&&!!document.activeElement.closest('.nursery-sheet')),'dialog wraps past closed pantry controls');
  await page.keyboard.press('Escape');await page.locator('.nursery-sheet').waitFor({state:'hidden'});
  assert.ok(await page.locator('[data-kitchen]').evaluate(n=>n===document.activeElement),'kitchen restores focus');
  await page.locator('[data-wallet]').click();await page.locator('.nursery-sheet[open]').waitFor();await page.keyboard.press('Escape');
  await page.locator('[data-game=pairs]').click();await page.locator('.arcade-screen[open]').waitFor();await page.keyboard.press('Escape');await page.locator('.arcade-screen').waitFor({state:'hidden'});
  broken=true;await page.reload();await page.getByRole('button',{name:'Retry connection'}).waitFor();assert.match(await page.locator('#star-connection').innerText(),/nursery could not reply/);
  broken=false;await page.getByRole('button',{name:'Retry connection'}).click();await page.locator('[data-sound]').waitFor();
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Little Star polish: both people, 320/375/430px, saved sound/calm, rejected audio startup, dialog focus, game exit, deep links and reconnect pass');
}finally{Date.now=wallNow;await browser.close();}
