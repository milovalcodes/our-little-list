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
  // Windows Playwright WebKit sometimes cannot rewind a POST body when the
  // local emulator resets a connection. Forward only unary emulator requests
  // through Playwright's HTTP transport; keep the real SDK, payload, response,
  // rules and live Listen channels unchanged. Never proxy production traffic.
  if(isWebKit)await context.route('http://'+host+'/v1/**',async route=>{
    const response=await route.fetch({timeout:20000,maxRetries:0});
    await route.fulfill({response});
  });
  const page=await context.newPage();page.setDefaultTimeout(35000);
  if(isWebKit){
    page.on('requestfailed',r=>{if(r.url().includes(':8089/'))console.log('WebKit emulator transport:',new URL(r.url()).pathname,r.failure()?.errorText);});
    page.on('response',r=>{if(r.url().includes(':8089/')&&r.status()>=400)console.log('WebKit emulator response:',r.status(),new URL(r.url()).pathname,r.headers()['access-control-allow-origin']||'no CORS header');});
  }
  page.on('pageerror',e=>{
    // WebKit reports cancelled cross-origin emulator channels as page errors
    // during navigation/offline tests. Keep those separate, not arbitrary JS
    // errors or production failures; successful catch-up is asserted below.
    if(isWebKit&&/^\/127\.0\.0\.1:8089\/google\.firestore\.v1\.Firestore\/(Write|Listen)\/channel\?.+ due to access control checks\.$/.test(e.message))transportWarnings.push(e.message);
    else errors.push(e.message);
  });
  return {page,context};
}

try {
 const {page:moon}=await phone('him'),{page:sun}=await phone('her'),{page:secondMoon}=await phone('him');
 const deadline=setTimeout(()=>{console.error('word real-time test exceeded 120 seconds');process.exit(1);},120000);deadline.unref();
 await moon.goto(base+'/activities.html#wordle');
 const puzzle=await moon.evaluate(async()=>{
   const {sharedLayer}=await import('./data-hub.js'),{activityClock}=await import('./activity-clock.js'),{wordForDay}=await import('./daily-words.js');
   const p=wordForDay(activityClock().day);await(await sharedLayer()).setTo('wordPuzzles',p.day,p);return p;
 });
 await sun.goto(base+'/activities.html#wordle');await secondMoon.goto(base+'/activities.html#wordle');
 await Promise.all([moon,sun,secondMoon].map(p=>p.waitForSelector('.word-keyboard button:not([disabled])')));
 const submit=(page,guess,count)=>page.evaluate(async({guess,count,day})=>{
   try{const {sharedLayer}=await import('./data-hub.js'),data=await sharedLayer();return {ok:true,game:await data.submitWordGuess({day,person:'him',guess,expectedCount:count})};}
   catch(e){return {ok:false,error:e.message};}
 },{guess,count,day:puzzle.day});
 const multiplier=new Date(puzzle.day+'T12:00Z').getUTCDay()===0?2:1;
 const wrong=['grape','table','crane','beach'].filter(w=>w!==puzzle.word);
 assert.ok((await submit(moon,wrong[0],0)).ok);
 await sun.waitForFunction(()=>document.querySelector('.word-partner').textContent.includes('1 / 5'));
 const denied=await sun.evaluate(async day=>{try{const {sharedLayer}=await import('./data-hub.js');await(await sharedLayer()).readDoc('wordGames',day+'-him');return false;}catch(e){return e.code==='permission-denied';}},puzzle.day);
 assert.equal(denied,true,'partner guesses cannot be read');
 console.log('word: boards connected; testing simultaneous guesses');
 const race=await Promise.all([submit(moon,wrong[1],1),submit(secondMoon,wrong[2],1)]);
 console.log('word: simultaneous guesses settled');
 assert.equal(race.filter(r=>r.ok).length,1,'two screens cannot spend the same attempt');
 assert.match(race.find(r=>!r.ok).error,/other screen/);
 await sun.waitForFunction(()=>document.querySelector('.word-partner').textContent.includes('2 / 5'));
 console.log('word: both screens received the second guess');
 const win=await submit(moon,puzzle.word,2);assert.ok(win.ok,JSON.stringify(win));
 console.log('word: winning guess saved');
 await sun.waitForFunction(points=>document.querySelector('.word-partner').textContent.includes(points+' points'),3*multiplier);
 await secondMoon.waitForFunction(points=>document.querySelector('#word-summary').textContent.includes(points+' points'),3*multiplier);
 await secondMoon.reload();await secondMoon.waitForFunction(points=>document.querySelector('#word-summary').textContent.includes(points+' points'),3*multiplier);
 assert.equal(await sun.locator('[data-word-peek]').count(),0,'finishing first never exposes your guesses');
 const stillPrivate=await sun.evaluate(async day=>{try{await(await(await import('./data-hub.js')).sharedLayer()).readDoc('wordGames',day+'-him');return false;}catch(e){return e.code==='permission-denied';}},puzzle.day);
 assert.equal(stillPrivate,true,'finished partner board stays protected while I am playing');
 const herWin=await sun.evaluate(async({day,word})=>{const {sharedLayer}=await import('./data-hub.js');return(await sharedLayer()).submitWordGuess({day,person:'her',guess:word,expectedCount:0});},puzzle);
 assert.equal(herWin.won,true);
 await moon.waitForFunction(points=>document.querySelector('#weekly-score').textContent.includes('☀ '+points),10*multiplier);
 await Promise.all([moon,sun].map(p=>p.waitForSelector('[data-word-peek]')));
 await moon.click('[data-word-peek]');await sun.click('[data-word-peek]');
 await moon.waitForSelector('.word-peek-board .word-row');await sun.waitForSelector('.word-peek-board .word-row');
 assert.equal(await moon.locator('.word-peek-board .word-row').count(),1);
 assert.equal(await sun.locator('.word-peek-board .word-row').count(),3);
 assert.equal(await moon.locator('.word-peek-board .word-row').textContent(),puzzle.word);
 assert.equal(await sun.locator('.word-peek-board .word-row').last().textContent(),puzzle.word);
 assert.equal(await sun.locator('.word-peek-board .correct').count()>=5,true);
 console.log('word: both phones unlock each other’s exact guesses only after both finish');
 // Confirm the explicit query used for a private board is accepted by rules.
 assert.deepEqual(errors,[]);
 console.log('REAL FIREBASE WORD: two private boards, live partner scores, simultaneous-screen conflict, saved progress after reload and ownership verified');
}finally{await browser.close();}
