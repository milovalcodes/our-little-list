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
const browser=await (isWebKit?webkit:chromium).launch(),errors=[],transportWarnings=[],wakeRequests=[];
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
  await context.route('https://our-little-list-delivery.emijosevalle.workers.dev/dispatch**',route=>{
    wakeRequests.push({side,url:route.request().url(),method:route.request().method(),body:route.request().postData()});
    return route.fulfill({status:202,contentType:'application/json',body:'{"accepted":true}',headers:{'Access-Control-Allow-Origin':base}});
  });
  await context.route(sdk+'/firebase-auth.js',route=>route.fulfill({contentType:'text/javascript',body:`
    const auth={currentUser:{uid:'${uid}',email:'${side}@example.test',getIdToken:async()=>'demo-browser-token-${side}'}};
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
 const {page:moon}=await phone('him'),{page:sun}=await phone('her');
 await moon.goto(base+'/tasks.html#routines');
 await moon.waitForSelector('.context-add');
 await moon.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer();
   await d.setTo('items','daily-test',{title:'our shared routine',type:'task',due:'',recurrence:'once',routineDays:[0,1,2,3,4,5,6],done:false,addedBy:'him',createdAt:Date.now(),reminderTime:'18:00',reminderOffsets:[60,30,0],reminderTo:'both'});
 });
 await sun.goto(base+'/tasks.html#routines');
 await Promise.all([moon,sun].map(p=>p.waitForSelector('.task-row[data-id=daily-test]')));
 await moon.locator('[data-id=daily-test] .task-check').click();
 await sun.waitForSelector('[data-id=daily-test].done');
 await sun.locator('[data-id=daily-test] .task-check').click();
 await moon.waitForFunction(()=>!document.querySelector('[data-id=daily-test]').classList.contains('done'));
 await sun.locator('[data-id=daily-test] [data-action=help]').click();
 const ping=await moon.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer();
   for(let i=0;i<30;i++){const all=await d.readOnce('outbox');const message=all.find(x=>x.kind==='list-nudge');if(message)return message;await new Promise(r=>setTimeout(r,100));}
 });
 assert.equal(ping.to,'him');assert.equal(new URL(ping.url,base).pathname+new URL(ping.url,base).hash,'/tasks.html#item-daily-test');
 const validation=await sun.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer();
   const {checkId,listDay}=await import('./list-schedule.js');let denied=0;
   for(const action of [
    ()=>d.setTo('routineChecks',checkId('daily-test'),{itemId:'daily-test',day:listDay(),done:true,by:'him',updatedAt:Date.now()}),
    ()=>d.updateIn('items','daily-test',{routineDays:[8]}),
    ()=>d.updateIn('items','daily-test',{reminderTime:'25:90'}),
    ()=>d.updateIn('items','daily-test',{reminderOffsets:[-1]})
   ]){try{await action();}catch(_){denied++;}}
   return denied;
 });
 assert.equal(validation,4,'rules reject impersonation and malformed schedules');
 await moon.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('listReminderEvents','test-event',{createdAt:Date.now()});
 });
 // Exercise the worker's actual REST query, atomic marker+outbox commit and
 // post-completion suppression, against this same demo database only.
 const {listDay,listInstant}=await import('../list-schedule.js');
 const {createClient}=await import('../worker/src/firestore.js');
 const {scheduleListReminders,listReminderWanted}=await import('../worker/src/list-reminders.js');
 const now=Date.now(),day=listDay(now),time=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 await moon.evaluate(async({time,now})=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('items','worker-test',{title:'scheduled test',type:'task',due:'',routineDays:[0,1,2,3,4,5,6],done:false,addedBy:'him',createdAt:now-3600000,reminderTime:time,reminderOffsets:[0],reminderTo:'both'});},{time,now});
 const uid='oLSxADOwjqS04hSS2aHGOcvozmz2';
 const token=Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+project,aud:project,sub:uid,user_id:uid,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')+'.';
 const originalFetch=globalThis.fetch;
 globalThis.fetch=(url,options)=>{const u=String(url);assert.ok(u.startsWith('https://firestore.googleapis.com/v1/projects/demo-little-list/'),'never contact production');return originalFetch(u.replace('https://firestore.googleapis.com','http://'+host),options);};
 try {
  const db=createClient({projectId:project,idToken:token}),household='households/'+uid;
  await scheduleListReminders(db,household,now);await scheduleListReminders(db,household,now);
  const messages=(await db.list(household+'/outbox')).filter(m=>m.ref==='items/worker-test');assert.equal(messages.length,2);
  assert.ok(await listReminderWanted(db,household,messages[0]));
  await moon.evaluate(async day=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('routineChecks','worker-test_'+day,{itemId:'worker-test',day,done:true,by:'him',updatedAt:Date.now()});},day);
  assert.equal(await listReminderWanted(db,household,messages[0]),false);
 }finally{globalThis.fetch=originalFetch;}
 assert.deepEqual(errors,[]);
 const released=await moon.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer();
   await d.setTo('pushSubs','him',{person:'him',subscription:{endpoint:'https://example.test/phone'},updatedAt:Date.now()});
   await d.releasePushEndpoint('him','https://example.test/desktop');
   const kept=(await d.readOnce('pushSubs',{fromServer:true})).some(r=>r.id==='him');
   await d.releasePushEndpoint('him','https://example.test/phone');
   const removed=!(await d.readOnce('pushSubs',{fromServer:true})).some(r=>r.id==='him');
   return {kept,removed};
 });
 assert.deepEqual(released,{kept:true,removed:true},'real SDK sign-out only removes its own endpoint');
 await sun.goto(base+'/activities.html');await sun.waitForSelector('.app-dock');
 for(const [kind,url] of [['note','notes.html#note-notice'],['reaction','status.html#profile-him'],['item','tasks.html#item-notice'],['item-finished','tasks.html#done-notice'],['list-nudge','tasks.html#routines'],['list-reminder','tasks.html#item-notice'],['memory','memories.html#memory-notice'],['date','dates.html#date-notice'],['status','status.html#profile-him'],['arrival','status.html#profile-him-map'],['activities-open','activities.html#daily'],['question-reveal','activities.html#question'],['activity-result','activities.html#search'],['word-week','activities.html#scoreboard-2026-10-05']]){
  const body='test foreground '+kind;
  await moon.evaluate(async({kind,url,body})=>{const d=await(await import('./data-hub.js')).sharedLayer();const result=await d.notify('her',{kind,url,body,title:'A partner update'});if(!result.queued)throw Error('not queued');},{kind,url,body});
  await sun.waitForFunction(body=>document.querySelector('.incoming-note p')?.textContent===body,body);
  assert.ok((await sun.locator('.incoming-note-link').getAttribute('href')).endsWith('/'+url));
  await sun.locator('.incoming-note-close').click();
 }
 console.log('REAL FOREGROUND: all 14 notification kinds arrive on Activities with exact destinations, without refreshing');
 for(let i=0;i<2;i++){
  await moon.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.notify('her',{kind:'note',url:'notes.html',body:'identical but separate',title:'note'});});
  await sun.waitForFunction(()=>document.querySelector('.incoming-note p')?.textContent==='identical but separate');
  await sun.locator('.incoming-note-close').click();
 }
 await sun.evaluate(()=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'littlelist:present-ping',payload:{kind:'note',eventId:'push-first',title:'note',body:'push before snapshot',url:'notes.html'}}})));
 await sun.waitForSelector('.incoming-note');await sun.locator('.incoming-note-close').click();
 await moon.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('outbox','push-first',{to:'her',kind:'note',title:'note',body:'push before snapshot',url:'notes.html',createdAt:Date.now(),sendAt:Date.now()});});
 await sun.waitForTimeout(350);assert.equal(await sun.locator('.incoming-note').count(),0,'push-first and database-first copies share an event identity');
 assert.ok(wakeRequests.some(r=>r.side==='him'&&r.method==='POST'&&r.body===null),'real confirmed writes wake delivery without sending a second message body');
 console.log('REAL FOREGROUND: identical separate notes both show; push/snapshot race deduplicates; confirmed SDK saves wake immediate delivery');
 console.log('REAL ROUTINES: two authenticated phones share completion/undo, real nudge outbox, schedule validation, check ownership and worker marker permissions pass');
} finally {await browser.close();}
