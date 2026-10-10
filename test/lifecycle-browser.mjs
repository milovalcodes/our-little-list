import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';

const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch();
const base='http://127.0.0.1:8777',errors=[];
async function harness(){
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/lifecycle-harness.html',r=>r.fulfill({contentType:'text/html',body:'<body data-viewer="him"></body>'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-10T12:00Z')});
  await page.goto(base+'/lifecycle-harness.html');
  return page;
}
try{
  if(!process.env.AUDIT_CASE||process.env.AUDIT_CASE==='routine'){
    const p=await harness();
    await p.evaluate(async()=>{
      window.routineListeners=[];window.routineSnapshots=[];
      const data={listenToQuery:(name,query,receive,options={})=>{
        const sub={receive,options,stopped:false};routineListeners.push(sub);return()=>{sub.stopped=true;};
      }};
      window.stopRoutines=(await import('./routine-checks.js')).watchRoutineChecks(data,(rows,meta)=>routineSnapshots.push({rows,meta}));
    });
    assert.equal(await p.evaluate(()=>typeof routineListeners[0].options.onError),'function','retry must work even when the caller has no error callback');
    await p.evaluate(()=>routineListeners[0].options.onError(Error('connection failed')));
    await p.clock.fastForward(30001);
    assert.equal(await p.evaluate(()=>routineListeners.length),2,'terminal listener is reattached');
    await p.evaluate(()=>routineListeners[1].receive([{id:'today',done:true}]));
    assert.equal(await p.evaluate(()=>routineSnapshots.at(-1).meta.ready),true);
    await p.evaluate(()=>{routineListeners[0].receive([]);routineListeners[0].options.onError(Error('stale'));});
    assert.equal(await p.evaluate(()=>routineSnapshots.at(-1).rows[0]?.id),'today');
    await p.evaluate(()=>stopRoutines());await p.clock.fastForward(60001);
    assert.equal(await p.evaluate(()=>routineListeners.length),2,'disposed watcher stays stopped');
    await p.context().close();console.log('LIFECYCLE: routines recover without an optional error handler; stale callbacks and cleanup are safe');
  }
  if(!process.env.AUDIT_CASE||process.env.AUDIT_CASE==='presence'){
    const p=await harness();
    await p.evaluate(async()=>{
      window.isHidden=false;Object.defineProperty(document,'hidden',{get:()=>isHidden});window.beats=[];
      (await import('./presence.js')).startPresence({setTo:async(...args)=>beats.push(args)},'him');
    });
    assert.equal(await p.evaluate(()=>beats.length),1);
    await p.evaluate(()=>{isHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
    await p.clock.fastForward(180001);
    assert.equal(await p.evaluate(()=>beats.length),1,'a background tab must not keep claiming the person is online');
    await p.evaluate(()=>{isHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await p.evaluate(()=>beats.length),2,'returning to the app immediately restores presence');
    await p.context().close();console.log('LIFECYCLE: hidden pages stop presence writes and resume on return');
  }
  if(!process.env.AUDIT_CASE||process.env.AUDIT_CASE==='routine-ui'){
    const p=await harness();
    await p.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
    await p.route('**/routine-checks.js',r=>r.fulfill({contentType:'text/javascript',body:`
      export {completeRoutine} from './routine-checks.js?original';
      export function watchRoutineChecks(data,receive){
        (window.routineReceivers??=[]).push(receive);receive([],{ready:false});return()=>{};
      }`}));
    await p.goto(base+'/tasks.html?as=him#routines');await p.waitForSelector('.app-dock');
    await p.evaluate(async()=>{
      const data=await(await import('./data-hub.js')).sharedLayer();
      await data.setTo('items','slow-routine',{title:'saved routine',type:'task',routineDays:[0,1,2,3,4,5,6],done:false,addedBy:'him',createdAt:Date.now()});
    });
    const check=p.locator('[data-id="slow-routine"] .task-check');await check.waitFor();
    assert.equal(await check.isDisabled(),true,'do not overwrite a check before its snapshot arrives');
    assert.match(await p.locator('#item-count').textContent(),/syncing/);
    await p.evaluate(()=>routineReceivers.forEach(cb=>cb([{id:'slow-routine_2026-10-10',done:true,by:'her'}],{ready:true})));
    assert.equal(await check.isEnabled(),true);assert.equal(await p.locator('[data-id="slow-routine"].done').count(),1);
    await p.goto(base+'/him.html?as=him');await p.waitForSelector('.app-dock');
    await p.waitForFunction(()=>window.routineReceivers?.length>0);
    assert.equal(await p.locator('#home-next-up [data-id="slow-routine"]').count(),0,'Home does not invent unfinished routines while loading');
    await p.evaluate(()=>routineReceivers.forEach(cb=>cb([],{ready:true})));
    await p.locator('#home-next-up [data-id="slow-routine"]').waitFor();
    await p.context().close();console.log('LIFECYCLE: List and Home wait for saved routine checks before offering completion');
  }
  if(!process.env.AUDIT_CASE||process.env.AUDIT_CASE==='foreground'){
    const p=await harness();
    await p.route('**/viewer.js',r=>r.fulfill({contentType:'text/javascript',body:"export const awaitViewer=async()=> 'him'; export const partnerOf=()=> 'her';"}));
    await p.route('**/data-hub.js',r=>r.fulfill({contentType:'text/javascript',body:`
      export const sharedLayer=async()=>({mode:'firebase',
        listenToQuery:(name,query,cb)=>{window.outbox=cb;queueMicrotask(()=>cb([window.pendingPing]));return()=>{};},
        listenTo:(name,cb)=>{window.statusSnapshot=cb;return()=>{};}
      });`}));
    await p.evaluate(async()=>{
      window.sounds=0;window.playLittleSound=()=>sounds++;
      window.pendingPing={id:'startup-note',to:'him',kind:'note',title:'A note',body:'hello',url:'notes.html#note-startup',createdAt:Date.now(),sendAt:Date.now()};
      await import('./live-notes.js');
    });
    await p.waitForFunction(()=>typeof statusSnapshot==='function');
    await p.evaluate(()=>statusSnapshot([]));
    await p.waitForFunction(()=>document.querySelector('.incoming-note p')?.textContent==='hello',{},{timeout:3000});
    await p.evaluate(()=>outbox([pendingPing]));
    assert.equal(await p.evaluate(()=>sounds),1,'duplicate snapshots do not make another sound');
    await p.context().close();console.log('LIFECYCLE: a note arriving before status finishes loading is not lost or duplicated');
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
