// Exercise an installed app upgrading while its HTTP cache is still fresh.
// No production accounts, messages, or services are involved.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';

const original=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
let generation=1,failAsset=false;
const server=createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/service-worker.js'){
    res.setHeader('Content-Type','text/javascript');res.setHeader('Cache-Control','no-store');
    return res.end(original.replace(/our-little-list-v\d+/,'our-little-list-v'+generation)
      .replace(/importScripts\([^;]+;/g,'')
      .replace(/const ASSETS = \[[\s\S]*?\n\];/,"const ASSETS = ['./', './app.js'];"));
  }
  if(path==='/app.js'){
    if(failAsset){res.writeHead(503,{'Cache-Control':'no-store'});return res.end('offline for a moment');}
    res.setHeader('Content-Type','text/javascript');res.setHeader('Cache-Control','public, max-age=3600');
    return res.end(`window.loadedGeneration=${generation};`);
  }
  res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');
  res.end('<!doctype html><title>Update test</title><script src="/app.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await (process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
try{
  const page=await browser.newPage();
  await page.goto(base);
  await page.evaluate(()=>localStorage.setItem('keep-my-preferences','yes'));
  assert.equal(await page.evaluate(()=>window.loadedGeneration),1);
  await page.evaluate(async()=>{await navigator.serviceWorker.register('/service-worker.js');await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  generation=2;
  await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
  await page.waitForFunction(async()=>(await caches.keys()).includes('our-little-list-v2')&&!(await caches.keys()).includes('our-little-list-v1'));
  const cached=await page.evaluate(async()=>await (await (await caches.open('our-little-list-v2')).match('/app.js')).text());
  assert.match(cached,/loadedGeneration=2/,'a new shell must not precache the old, still-fresh HTTP response');
  await page.reload();
  assert.equal(await page.evaluate(()=>window.loadedGeneration),2,'running code must match the activated release');
  assert.equal(await page.evaluate(()=>localStorage.getItem('keep-my-preferences')),'yes');
  generation=3;failAsset=true;
  await page.evaluate(async()=>{
    const reg=await navigator.serviceWorker.getRegistration();await reg.update();
    const installing=reg.installing;
    if(installing&&installing.state!=='redundant')await new Promise(resolve=>installing.addEventListener('statechange',()=>{if(installing.state==='redundant')resolve();}));
  });
  assert.ok(await page.evaluate(async()=>(await caches.keys()).includes('our-little-list-v2')),'failed upgrades preserve the working offline shell');
  // Failed addAll creates an empty candidate cache: its mere presence cannot
  // mean this version is active. The live controller still serves v2.
  const activeVersion=await page.evaluate(()=>new Promise(resolve=>{
    const channel=new MessageChannel();channel.port1.onmessage=event=>{channel.port1.close();resolve(event.data.version);};
    navigator.serviceWorker.controller.postMessage('littlelist:get-version',[channel.port2]);
  }));
  assert.equal(activeVersion,2,'version comes from the active worker, never a failed candidate cache');
  await page.context().setOffline(true);
  assert.match(await page.evaluate(async()=>await (await (await caches.open('our-little-list-v2')).match('/app.js')).text()),/loadedGeneration=2/);
  console.log('UPDATE FRESHNESS: warm-cache upgrade loads fresh code; failed upgrades keep the previous offline app and preferences');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
