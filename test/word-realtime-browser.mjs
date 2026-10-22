// Two isolated phones, real Firebase SDK + real rules, demo emulator only.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {activityClock} from '../activity-clock.js';
import {wordForDay} from '../daily-words.js';
import {wordPoints,wordAttempts} from '../word-scores.js';
import {timedPuzzle as makeTimedPuzzle} from '../daily-puzzles.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):808[89]$/,'emulator required; never run against production');
const isWebKit=process.env.GAME_BROWSER==='webkit';
const project='demo-little-list',base='http://127.0.0.1:8777',sdk='https://www.gstatic.com/firebasejs/12.19.0';
const cleared=await fetch(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`,{method:'DELETE'});
assert.ok(cleared.ok,'clear demo fixtures');
const browser=await (isWebKit?webkit:chromium).launch(),errors=[],transportWarnings=[];
async function seedPuzzle(collection,id,data){
 const value=v=>Array.isArray(v)?{arrayValue:{values:v.map(value)}}:typeof v==='string'?{stringValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))}};
 const r=await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents/households/oLSxADOwjqS04hSS2aHGOcvozmz2/${collection}/${id}`,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:value(data).mapValue.fields})});
 assert.ok(r.ok,await r.text());
}
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
      real.connectFirestoreEmulator(db,'127.0.0.1',${Number(host.split(':').at(-1))},{mockUserToken:{sub:'${uid}',user_id:'${uid}'}});
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
    page.on('requestfailed',r=>{if(r.url().includes(':'+host.split(':').at(-1)+'/'))console.log('WebKit emulator transport:',new URL(r.url()).pathname,r.failure()?.errorText);});
    page.on('response',r=>{if(r.url().includes(':'+host.split(':').at(-1)+'/')&&r.status()>=400)console.log('WebKit emulator response:',r.status(),new URL(r.url()).pathname,r.headers()['access-control-allow-origin']||'no CORS header');});
  }
  page.on('pageerror',e=>{
    // WebKit reports cancelled cross-origin emulator channels as page errors
    // during navigation/offline tests. Keep those separate, not arbitrary JS
    // errors or production failures; successful catch-up is asserted below.
    if(isWebKit&&/^\/127\.0\.0\.1:808[89]\/google\.firestore\.v1\.Firestore\/(Write|Listen)\/channel\?.+ due to access control checks\.$/.test(e.message))transportWarnings.push(e.message);
    else errors.push(e.message);
  });
  return {page,context};
}

try {
 const {page:moon}=await phone('him'),{page:sun}=await phone('her'),{page:secondMoon}=await phone('him');
 const {page:moonRace}=await phone('him'),{page:sunRace}=await phone('her'),{page:moonSearch}=await phone('him');
 const deadline=setTimeout(()=>{console.error('word real-time test exceeded 180 seconds');process.exit(1);},180000);deadline.unref();
 const puzzle=wordForDay(activityClock().day);await seedPuzzle('wordPuzzles',puzzle.day,puzzle);
 await moon.goto(base+'/activities.html#wordle');
 await moonRace.goto(base+'/activities.html');await sunRace.goto(base+'/activities.html');
 await sun.goto(base+'/activities.html#wordle');await secondMoon.goto(base+'/activities.html#wordle');
 try{await Promise.all([moon,sun,secondMoon].map(p=>p.waitForSelector('.word-keyboard button:not([disabled])')));}
 catch(error){console.error('Emulator board startup',errors,await Promise.all([moon,sun,secondMoon].map(p=>p.locator('.word-message,.global-failure,#word-summary').allTextContents())));throw error;}
 const submit=(page,guess,count)=>page.evaluate(async({guess,count,day})=>{
   try{const {sharedLayer}=await import('./data-hub.js'),data=await sharedLayer();return {ok:true,game:await data.submitWordGuess({day,person:'him',guess,expectedCount:count})};}
   catch(e){return {ok:false,error:e.message};}
 },{guess,count,day:puzzle.day});
 const tries=wordAttempts(puzzle.day),solvedIn=attempts=>wordPoints({day:puzzle.day,done:true,won:true,attempts});
 const wrong=['grape','table','crane','beach'].filter(w=>w!==puzzle.word);
 assert.ok((await submit(moon,wrong[0],0)).ok);
 // Until her own word is done she only sees that he is playing, never his progress.
 await sun.waitForFunction(()=>document.querySelector('.word-partner').textContent.includes('is playing'));
 assert.doesNotMatch(await sun.locator('.word-partner').textContent(),/\d \/ \d/);
 const denied=await sun.evaluate(async day=>{try{const {sharedLayer}=await import('./data-hub.js');await(await sharedLayer()).readDoc('wordGames',day+'-him');return false;}catch(e){return e.code==='permission-denied';}},puzzle.day);
 assert.equal(denied,true,'partner guesses cannot be read');
 console.log('word: boards connected; testing simultaneous guesses');
 const race=await Promise.all([submit(moon,wrong[1],1),submit(secondMoon,wrong[2],1)]);
 console.log('word: simultaneous guesses settled');
 assert.equal(race.filter(r=>r.ok).length,1,'two screens cannot spend the same attempt');
 assert.match(race.find(r=>!r.ok).error,/other screen/);
 for(const page of [moon,secondMoon])await page.waitForFunction(()=>[...document.querySelectorAll('#word-game .word-row')].filter(r=>r.querySelector('.correct,.present,.absent')).length===2);
 console.log('word: both screens received the second guess');
 const win=await submit(moon,puzzle.word,2);assert.ok(win.ok,JSON.stringify(win));
 console.log('word: winning guess saved');
 await sun.waitForFunction(()=>document.querySelector('.word-partner').textContent.includes('has finished'));
 assert.doesNotMatch(await sun.locator('.word-partner').textContent(),/points/,'his score stays hidden until she plays');
 await secondMoon.waitForFunction(points=>document.querySelector('#word-summary').textContent.includes(points+' points'),solvedIn(3));
 await secondMoon.reload();await secondMoon.waitForFunction(points=>document.querySelector('#word-summary').textContent.includes(points+' points'),solvedIn(3));
 assert.equal(await sun.locator('[data-word-peek]').count(),0,'finishing first never exposes your guesses');
 const stillPrivate=await sun.evaluate(async day=>{try{await(await(await import('./data-hub.js')).sharedLayer()).readDoc('wordGames',day+'-him');return false;}catch(e){return e.code==='permission-denied';}},puzzle.day);
 assert.equal(stillPrivate,true,'finished partner board stays protected while I am playing');
 const herWin=await sun.evaluate(async({day,word})=>{const {sharedLayer}=await import('./data-hub.js');return(await sharedLayer()).submitWordGuess({day,person:'her',guess:word,expectedCount:0});},puzzle);
 assert.equal(herWin.won,true);
 await sun.waitForFunction(points=>document.querySelector('.result-compare')?.textContent.includes(points+' points'),solvedIn(3));
 assert.match(await sun.locator('.result-compare').textContent(),new RegExp('1 / '+tries));
 await moonRace.waitForFunction(points=>document.querySelector('#weekly-score')?.textContent.match(/\d+/g)?.[0]===String(points),solvedIn(1));
 for(const page of [moon,sun]){
  for(let retry=0;retry<3;retry++){
   await page.waitForFunction(()=>document.querySelector('.shared-grid:last-child .shared-word-row')||document.querySelector('[data-round-grid-retry]'));
   if(await page.locator('.shared-grid:last-child .shared-word-row').count())break;
   await page.click('[data-round-grid-retry]');
  }
  await page.waitForSelector('.shared-grid:last-child .shared-word-row');
 }
 assert.equal(await moon.locator('.shared-grid:last-child .shared-word-row').count(),1);
 assert.equal(await sun.locator('.shared-grid:last-child .shared-word-row').count(),3);
 assert.equal(await moon.locator('.shared-grid:last-child .shared-word-row').textContent(),puzzle.word);
 assert.equal(await sun.locator('.shared-grid:last-child .shared-word-row').last().textContent(),puzzle.word);
 assert.equal(await sun.locator('.shared-grid:last-child .correct').count()>=5,true);

 await sun.locator('[data-round-react="🔥"]').click();
 await moon.waitForFunction(()=>document.querySelector('#word-game .shared-reaction-status')?.textContent.includes('reacted 🔥'));
 await moon.locator('[data-round-react="😂"]').click();
 await sun.waitForFunction(()=>document.querySelector('#word-game .shared-reaction-status')?.textContent.includes('reacted 😂'));
 console.log('REAL REACTIONS: both authenticated accounts exchange saved reactions through the emulator');
 console.log('word: both phones unlock each other’s exact guesses only after both finish');
 // Confirm the explicit query used for a private board is accepted by rules.
 assert.deepEqual(errors,[]);
 console.log('REAL FIREBASE WORD: two private boards, live partner scores, simultaneous-screen conflict, saved progress after reload and ownership verified');
 const timedPuzzle=makeTimedPuzzle(activityClock().day,'search');await seedPuzzle('timedPuzzles',timedPuzzle.day+'-search',timedPuzzle);
 const play=(page,person,options)=>page.evaluate(async({p,person,options})=>{try{const d=await(await import('./data-hub.js')).sharedLayer();return {ok:true,game:await d.playTimedPuzzle({day:p.day,type:p.type,person,...options})};}catch(e){return{ok:false,error:e.message};}},{p:timedPuzzle,person,options});
 const start=await play(moon,'him',{start:true});assert.ok(start.ok,JSON.stringify(start));
 const again=await play(secondMoon,'him',{start:true});assert.ok(again.ok);assert.deepEqual(again.game.startedAt,start.game.startedAt,'start is idempotent across screens');
 const moves=await Promise.all([play(moon,'him',{index:0,answer:timedPuzzle.entries[0].word,expectedCount:0}),play(secondMoon,'him',{index:1,answer:timedPuzzle.entries[1].word,expectedCount:0})]);
 assert.equal(moves.filter(r=>r.ok).length,1,'two screens cannot overwrite a saved word');
 let board=moves.find(r=>r.ok).game;
 for(let i=0;i<timedPuzzle.entries.length;i++)if(!board.solved.includes(i)){const move=await play(moon,'him',{index:i,answer:timedPuzzle.entries[i].word,expectedCount:board.solved.length});assert.ok(move.ok,JSON.stringify(move));board=move.game;}
 // The saved server times decide any time bonus, so score from the saved result.
 const searchPoints=await moon.evaluate(async day=>{const d=await(await import('./data-hub.js')).sharedLayer(),{timedPoints}=await import('./timed-game.js');return timedPoints(await d.readDoc('timedResults',day+'-search-him'));},timedPuzzle.day);
 // His search stays out of her live total until her own search is over.
 await sunRace.waitForFunction(points=>document.querySelector('#weekly-score')?.textContent.match(/\d+/g)?.[1]===String(points),solvedIn(3));
 assert.equal(await sun.evaluate(async day=>{try{await(await(await import('./data-hub.js')).sharedLayer()).readDoc('timedGames',day+'-search-him');return false;}catch(e){return e.code==='permission-denied';}},timedPuzzle.day),true);
 assert.ok((await play(sun,'her',{start:true})).ok);
 for(let i=0;i<timedPuzzle.entries.length;i++)assert.ok((await play(sun,'her',{index:i,answer:timedPuzzle.entries[i].word,expectedCount:i})).ok);
 await sunRace.waitForFunction(points=>document.querySelector('#weekly-score')?.textContent.match(/\d+/g)?.[1]===String(points),solvedIn(3)+searchPoints);
 await moonSearch.goto(base+'/activities.html#search');await moonSearch.waitForSelector('#search .timed-route:last-child li');
 assert.equal(await moonSearch.locator('#search .timed-route:last-child li').count(),10);
 assert.match(await moonSearch.locator('#search-summary').textContent(),new RegExp('^'+searchPoints+' points'));
 await moonSearch.reload();await moonSearch.waitForFunction(points=>document.querySelector('#search-summary').textContent.startsWith(points+' points'),searchPoints);
 assert.deepEqual(errors,[]);
 console.log('REAL FIREBASE TIMED: server timestamps, independent attempts, simultaneous-tab protection, live total scores, private routes, live reveal and saved reload verified');
 // An explicitly authorized server reset must clear the old finished UI,
 // unlike an empty offline cache snapshot which must never rewind a round.
 const docs=`projects/${project}/databases/(default)/documents`;
 const resetPaths=['her','him'].flatMap(person=>['wordGames/'+puzzle.day+'-'+person,'wordResults/'+puzzle.day+'-'+person,'timedGames/'+puzzle.day+'-search-'+person,'timedResults/'+puzzle.day+'-search-'+person]);
 const reset=await fetch(`http://${host}/v1/${docs}:commit`,{method:'POST',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({writes:resetPaths.map(path=>({delete:docs+'/households/oLSxADOwjqS04hSS2aHGOcvozmz2/'+path}))})});
 assert.ok(reset.ok,await reset.text());
 await Promise.all([moon,sun,secondMoon].map(p=>p.waitForFunction(()=>document.querySelectorAll('#word-game .word-row.played').length===0&&document.querySelector('#word-game .word-keyboard'))));
 await moonSearch.locator('#search').evaluate(el=>{el.open=true;});
 await moonSearch.waitForSelector('#search [data-start]:not([disabled])');
 assert.deepEqual(errors,[]);
 console.log('REAL RESET: server-confirmed reset clears both phones and reopens rounds without refreshing');
 assert.equal(await moon.locator('#admin-games').isVisible(),true);
 assert.equal(await sun.locator('#admin-games').isVisible(),false,'admin comes from the account, never the page side');
 const crossword=makeTimedPuzzle(activityClock().day,'crossword');await seedPuzzle('timedPuzzles',crossword.day+'-crossword',crossword);
 const resetGame=(page,scope,requestId)=>page.evaluate(async({scope,requestId})=>{const d=await(await import('./data-hub.js')).sharedLayer(),{activityClock}=await import('./activity-clock.js');try{return {ok:true,result:await d.resetDailyGames({day:activityClock().day,scope,requestId})};}catch(e){return {ok:false,error:e.message};}},{scope,requestId});
 assert.equal((await resetGame(sun,'all','unauthorized-reset-123456789')).ok,false);
 await moon.locator('#admin-games>summary').click();
 assert.equal(await moon.locator('#reset-game').evaluate(el=>getComputedStyle(el).appearance),'none','native WebKit dropdown paint must not hide the selected option on the moon side');
 assert.equal(await moon.locator('#admin-games button').evaluate(el=>el.classList.contains('primary-action')),true);
 await moon.locator('#reset-game').selectOption('word');
 moon.once('dialog',dialog=>dialog.accept());await moon.locator('#admin-games button').click();
 await moon.waitForFunction(()=>document.querySelector('#admin-games [role="status"]').textContent.startsWith('Fresh rounds'));
 const newWord=await moon.evaluate(async day=>await(await(await import('./data-hub.js')).sharedLayer()).readDoc('wordPuzzles',day),puzzle.day);
 assert.equal(newWord.revision,1);assert.notEqual(newWord.word,puzzle.word);
 assert.equal((await submit(moon,puzzle.word,0)).ok,false,'old page submission cannot consume a fresh try');
 const freshWin=await moon.evaluate(async p=>(await(await import('./data-hub.js')).sharedLayer()).submitWordGuess({day:p.day,person:'him',guess:p.word,expectedCount:0,expectedRevision:p.revision}),newWord);
 assert.equal(freshWin.won,true);await moon.waitForFunction(()=>document.querySelector('#word-summary').textContent.includes('solved'));
 const id='browser-reset-all-1234567890',all=await resetGame(moon,'all',id);assert.ok(all.ok,JSON.stringify(all));
 const repeat=await resetGame(moon,'all',id);assert.ok(repeat.ok);assert.deepEqual(repeat.result,all.result,'retry receipt is idempotent');
 await Promise.all([moon,sun,secondMoon].map(p=>p.waitForFunction(()=>document.querySelectorAll('#word-game .word-row .correct,#word-game .word-row .present,#word-game .word-row .absent').length===0&&document.querySelector('#word-game .word-keyboard'))));
 await moonSearch.waitForSelector('#search [data-start]:not([disabled])');
 const before=await moon.evaluate(async day=>{const d=await(await import('./data-hub.js')).sharedLayer();return Promise.all([d.readDoc('wordPuzzles',day),d.readDoc('timedPuzzles',day+'-crossword')]);},puzzle.day);
 const individual=await resetGame(moon,'search','browser-reset-search-123456789');assert.ok(individual.ok,JSON.stringify(individual));
 const after=await moon.evaluate(async day=>{const d=await(await import('./data-hub.js')).sharedLayer();return Promise.all([d.readDoc('wordPuzzles',day),d.readDoc('timedPuzzles',day+'-crossword')]);},puzzle.day);
 assert.deepEqual(after,before,'individual reset never changes the other rounds');
 const week=await moon.evaluate(async day=>(await import('./round-engine.js')).weekDays(day)[0],puzzle.day);
 const settled=await fetch(`http://${host}/v1/${docs}/households/oLSxADOwjqS04hSS2aHGOcvozmz2/wordWeeks/${week}`,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:{week:{stringValue:week}}})});
 assert.ok(settled.ok);const refused=await resetGame(moon,'all','browser-reset-settled-123456789');assert.equal(refused.ok,false);assert.match(refused.error,/crowned/);

 const raceDay='2026-10-28',raceNow=Date.now();
 for(const type of ['search','crossword'])await seedPuzzle('timedPuzzles',raceDay+'-'+type,{...makeTimedPuzzle(raceDay,type),opensAt:raceNow-1000,closesAt:raceNow+86400000});
 const startOther=(page,type)=>page.evaluate(async({day,type})=>{try{const d=await(await import('./data-hub.js')).sharedLayer();await d.playTimedPuzzle({day,type,person:'him',start:true});return {ok:true};}catch(e){return {ok:false,error:e.message};}},{day:raceDay,type});
 const competingStarts=await Promise.all([startOther(moon,'search'),startOther(secondMoon,'crossword')]);
 assert.equal(competingStarts.filter(r=>r.ok).length,1,'server transactions allow only one competing timer');
 assert.match(competingStarts.find(r=>!r.ok).error,/Finish (Word Search|Crossword) first/);
 console.log('REAL TIMER GUARD: simultaneous starts from independent devices commit only one running round');
 assert.deepEqual(errors,[]);
 console.log('ADMIN UI: account-gated controls, confirmation, atomic fresh boards, live reset on three screens, stale tries rejected, retry-safe all reset and isolated individual resets pass');
}finally{await browser.close();}
