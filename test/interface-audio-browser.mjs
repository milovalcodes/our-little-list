import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {SOUND_FILES} from '../interface-audio.js';
const base='http://127.0.0.1:8777',errors=[];
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:320,height:812}});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const requests=[];page.on('request',r=>{if(r.url().endsWith('.wav'))requests.push(r.url());});
  await page.goto(base+'/phone-check.html?as=her#feel');
  await page.locator('#feel summary').click();
  // Wait for the disclosure before interacting with its native range control.
  await page.waitForFunction(()=>document.querySelector('#feel details')?.open);
  assert.equal(requests.length,0,'muted page does not request audio');
  assert.equal(await page.locator('[data-comfort=typing]').count(),0);
  await page.locator('[data-sound-volume]').fill('20');
  assert.equal(await page.locator('.sound-volume output').textContent(),'20%');
  await page.reload();await page.locator('#feel').waitFor();assert.equal(await page.locator('[data-sound-volume]').inputValue(),'20');
  // Decode the real shipped samples without playing through the user's speakers.
  const clips=await page.evaluate(async files=>{
   const Audio=window.OfflineAudioContext||window.webkitOfflineAudioContext;
   if(!Audio)return null;
   const audio=new Audio(1,44100,44100);
   const result=[];
   for(const name of files){const r=await fetch('./audio/interface/'+name+'.wav');if(!r.ok)throw Error(name);const b=await audio.decodeAudioData(await r.arrayBuffer());result.push({name,duration:b.duration,peak:Math.max(...b.getChannelData(0).map(Math.abs))});}
   return result;
  },SOUND_FILES);
  if(clips){assert.equal(clips.length,12);assert.ok(clips.every(c=>c.duration>.05&&c.duration<1&&c.peak>.1&&c.peak<.65));}
  else {
   assert.equal(await page.evaluate(async()=>{const {playInterfaceSound}=await import('./interface-audio.js');return playInterfaceSound('tap',()=>({sound:true,typing:true,volume:.2}));}),false);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();console.log(engine.name()+': '+(clips?'real WAV decoding and bounded peaks/durations':'this runtime lacks Web Audio; graceful unavailable-audio handling')+', muted fetching, optional clicks and saved volume pass');
 }finally{await browser.close();}
}
assert.deepEqual(errors,[]);
