// Two isolated phones, real Firebase SDK + real rules, demo emulator only.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):8089$/,'emulator required; never run against production');
const isWebKit=process.env.GAME_BROWSER==='webkit';
const project='demo-little-list',base='http://127.0.0.1:8777',sdk='https://www.gstatic.com/firebasejs/12.19.0';
const cleared=await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`,{method:'DELETE'});
assert.ok(cleared.ok,'clear demo fixtures');
const browser=await (isWebKit?webkit:chromium).launch(),errors=[],transportWarnings=[];
async function phone(side) {
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  // These contexts stand for two foreground phones, not two tabs competing
  // for one desktop window. Suspension is exercised explicitly below.
  await context.addInitScript(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'}));
  const uid=side==='him'?'oLSxADOwjqS04hSS2aHGOcvozmz2':'cwQndCjlRlcaHasR1xzp9EYICFz2';
  // Block every real app backend. Only the version-pinned public SDK and demo
  // emulator can leave this test's local web server.
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    return url.origin===base||url.origin===`http://${host}`||url.href.startsWith(sdk+'/')?route.fallback():route.abort();
  });
  await context.route('**/firebase-config.js',route=>route.fulfill({contentType:'text/javascript',body:`export const firebaseConfig={apiKey:'demo-key',projectId:'${project}',appId:'demo-app'};`}));
  await context.route(sdk+'/firebase-auth.js',route=>route.fulfill({contentType:'text/javascript',body:`
    const auth={currentUser:{uid:'${uid}',email:'${side}@example.test'}};
    export const getAuth=()=>auth,browserLocalPersistence={};
    export const setPersistence=async()=>{},signInWithEmailAndPassword=async()=>auth.currentUser,signOut=async()=>{};
    export const onAuthStateChanged=(_,callback)=>{queueMicrotask(()=>callback(auth.currentUser));return()=>{};};
  `}));
  await context.route(sdk+'/firebase-firestore.js',route=>route.fulfill({contentType:'text/javascript',body:`
    import * as real from '${sdk}/firebase-firestore.js?emulator-sdk';
    export * from '${sdk}/firebase-firestore.js?emulator-sdk';
    export function initializeFirestore(app,options){
      if(app.options.projectId!=='demo-little-list')throw new Error('production blocked');
      // Windows WebKit's localhost emulator channels need long polling.
      // Chromium retains the production options; no app setting is changed.
      const db=real.initializeFirestore(app,${isWebKit?'{...options,experimentalForceLongPolling:true,experimentalAutoDetectLongPolling:false}':'options'});
      real.connectFirestoreEmulator(db,'127.0.0.1',8089,{mockUserToken:{sub:'${uid}',user_id:'${uid}'}});
      return db;
    }
    export function onSnapshot(ref,...args){
      if(!ref.path?.endsWith('/games'))return real.onSnapshot(ref,...args);
      const [options,next,error]=args;
      window.gameConnections=(window.gameConnections||0)+1;
      const stop=real.onSnapshot(ref,options,snapshot=>{if(!window.pauseGameStream)next(snapshot);},error);
      window.breakGameStream=()=>{stop();error({code:'unavailable'});};
      return stop;
    }
  `}));
  const page=await context.newPage();page.setDefaultTimeout(35000);
  page.on('pageerror',e=>{
    // WebKit reports cancelled cross-origin emulator channels as page errors
    // during navigation/offline tests. Keep those separate, not arbitrary JS
    // errors or production failures; successful catch-up is asserted below.
    if(isWebKit&&/^\/127\.0\.0\.1:8089\/google\.firestore\.v1\.Firestore\/(Write|Listen)\/channel\?.+ due to access control checks\.$/.test(e.message))transportWarnings.push(e.message);
    else errors.push(e.message);
  });
  return {page,context};
}
const get=async(page,name)=>page.evaluate(async name=>(await(await import('./data-hub.js')).sharedLayer()).readOnce(name,{fromServer:true}),name);
async function move(page,cell) {
  await page.waitForFunction(()=>document.querySelector('.game-status')?.textContent==='your turn');
  await page.click(`[data-cell="${cell}"]`);
}
async function choose(page,id){if(await page.locator('[data-game="lobby"]').count())await page.click('[data-game="lobby"]');await page.click(`[data-pick-game="${id}"]`);}
try {
  const {page:moon,context:moonContext}=await phone('him'),{page:sun}=await phone('her');
  await moon.goto(base+'/today.html#game-connect-four');await sun.goto(base+'/today.html#game-connect-four');
  await moon.click('[data-game="start"]');await sun.waitForSelector('.four-board');
  let outbox=await get(sun,'outbox');
  let invite=outbox.find(m=>m.kind==='game');
  assert.equal(invite.to,'her');assert.match(invite.url,/^activities\.html#game-connect-four--/);
  // Separate storage contexts: all propagation below must use Firestore.
  await sun.evaluate(()=>localStorage.setItem('phone-isolation','sun'));
  assert.equal(await moon.evaluate(()=>localStorage.getItem('phone-isolation')),null);
  await move(sun,0);
  await moon.waitForFunction(()=>document.querySelectorAll('.four-slot .game-token').length===1);
  outbox=await get(moon,'outbox');
  assert.ok(outbox.some(m=>m.kind==='game'&&m.to==='him'&&m.ref.endsWith('/1/open')));
  // Sender waiting for their partner still has a Home shortcut.
  await sun.goto(base+'/her.html');
  const homeLink=sun.locator('#home-next-up a[href*="#game-connect-four--"]');
  await homeLink.waitFor();assert.match(await homeLink.textContent(),/waiting for him/);
  await move(moon,1);
  await sun.waitForFunction(()=>[...document.querySelectorAll('#home-next-up a')].some(a=>a.textContent.includes('your turn')&&a.href.includes('game-connect-four--')));
  await homeLink.click();await sun.waitForSelector('.four-board');
  await move(sun,0);await moon.waitForFunction(()=>document.querySelectorAll('.four-slot .game-token').length===3);
  // Navigating to Games shelf resumes the ongoing game even while waiting.
  await sun.goto(base+'/games.html');await choose(sun,'connect-four');await sun.waitForSelector('.four-board');
  await sun.waitForFunction(()=>document.querySelector('.game-status')?.textContent==='waiting for him');
  assert.match(await sun.locator('.game-status').textContent(),/waiting for him/);
  // A terminated listener reattaches without a reload.
  const connections=await sun.evaluate(()=>{const n=window.gameConnections;window.breakGameStream();return n;});
  await sun.waitForFunction(n=>window.gameConnections>n,connections);
  await move(moon,1);
  await sun.waitForFunction(()=>document.querySelectorAll('.four-slot .game-token').length===4);
  // Simulate a silently stalled stream; the visible-page server check catches up.
  await moon.evaluate(()=>{window.pauseGameStream=true;});
  await move(sun,0);
  await moon.waitForFunction(()=>document.querySelectorAll('.four-slot .game-token').length===5,{},{timeout:35000});
  await moon.evaluate(()=>{window.pauseGameStream=false;});
  // Reopening a suspended page also reads the latest board immediately.
  await sun.evaluate(()=>{
    window.pauseGameStream=true;
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.testHidden?'hidden':'visible'});
    window.testHidden=true;document.dispatchEvent(new Event('visibilitychange'));
  });
  await move(moon,1);
  await sun.evaluate(()=>{window.pauseGameStream=false;window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await sun.waitForFunction(()=>document.querySelectorAll('.four-slot .game-token').length===6);
  await move(sun,0);
  await moon.waitForFunction(()=>document.querySelectorAll('.four-slot.winning-cell').length===4);
  await sun.waitForFunction(()=>document.querySelectorAll('.four-slot.winning-cell').length===4);
  outbox=await get(moon,'outbox');
  assert.ok(outbox.some(m=>m.kind==='game'&&m.to==='him'&&m.ref.endsWith('/7/open')));
  // Start another board; bonus boxes do NOT enqueue a misleading turn ping.
  for(const page of [moon,sun])await choose(page,'dots-boxes');
  await moon.click('[data-game="start"]');await sun.waitForSelector('.boxes-board');
  for(const [i,cell]of [0,1,3,4,12,14,13].entries()){
    await move(i%2?moon:sun,cell);
    await (i%2?sun:moon).waitForFunction(ply=>document.querySelectorAll('.box-edge.her,.box-edge.him').length===ply,i+1);
  }
  outbox=await get(moon,'outbox');
  assert.ok(!outbox.some(m=>m.kind==='game'&&m.ref.includes('dots-boxes/')&&m.ref.endsWith('/7/open')));
  assert.equal(await sun.locator('.game-status').textContent(),'your turn');
  await moonContext.setOffline(true);
  await moon.waitForFunction(()=>document.querySelector('#game').textContent.includes('Offline'));
  await moonContext.setOffline(false);
  await moon.waitForFunction(()=>!document.querySelector('.game-connection'));
  await choose(moon,'sun-moon');await moon.click('[data-game="start"]');
  await moon.waitForSelector('.couple-board');
  await moon.goto(base+'/him.html');await sun.goto(base+'/her.html');
  for(const [page,side]of [[moon,'him'],[sun,'her']]){
    await page.waitForFunction(()=>document.querySelectorAll('#home-next-up a[href*="#game"]').length===2);
    const links=await page.locator('#home-next-up a[href*="#game"]').allTextContents();
    assert.ok(links.every(text=>side==='him'?text.includes('waiting for her'):text.includes('your turn')));
    await page.setViewportSize({width:320,height:844});
    await page.locator('.thinking-screen').waitFor({state:'hidden'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'ongoing game rows fit a narrow phone');
    await page.screenshot({path:join(tmpdir(),`little-live-games-${side}.png`)});
  }
  assert.deepEqual(errors,[]);
  console.log('REALTIME FIREBASE: two isolated phones, immediate moves, all ongoing Home games, waiting shortcuts, Games shelf resume, failed/stalled/suspended recovery, winner and correct atomic turn outbox');
  if(transportWarnings.length)console.log(`WebKit emulator transport cancellations handled: ${transportWarnings.length}; all reconnect assertions passed`);
} catch (problem) {
  for(const context of browser.contexts())for(const page of context.pages()) {
    console.error('Demo phone at failure:',await page.evaluate(()=>({url:location.href,game:document.querySelector('#game')?.textContent,connections:window.gameConnections,visible:document.visibilityState})).catch(()=>({closed:true})));
  }
  console.error('Demo script errors:',errors,'emulator transport cancellations:',transportWarnings.length);
  throw problem;
} finally { await browser.close(); }
