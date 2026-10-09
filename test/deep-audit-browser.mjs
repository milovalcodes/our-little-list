import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8777',browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),failures=[],errors=[];
async function open(path){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/'+path);await page.waitForSelector('.app-dock');await page.locator('.thinking-screen').waitFor({state:'hidden'});return page;
}
async function check(name,run){try{await run();console.log('DEEP AUDIT: '+name);}catch(e){failures.push(name+': '+e.message);console.error(failures.at(-1));}}
try{
 await check('Activities presents tappable pings without stealing game focus',async()=>{
  const p=await open('activities.html?as=him');
  const shown=await p.evaluate(()=>new Promise(resolve=>{
    const c=new MessageChannel();c.port1.onmessage=e=>{c.port1.close();c.port2.close();resolve(e.data.shown);};
    navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'littlelist:present-ping',payload:{title:'A new memory',body:'an afternoon out',kind:'memory',url:'memories.html#memory-new'}},ports:[c.port2]}));
  }));
  assert.equal(shown,true);
  assert.ok((await p.locator('.incoming-note-link').getAttribute('href')).endsWith('/memories.html#memory-new'));
  await p.context().close();
 });
 await check('a same-page notice reopens its exact note without losing a draft',async()=>{
  const p=await open('notes.html');
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('notes','ping-target',{sender:'him',recipient:'her',body:'original',createdAt:Date.now(),read:true});location.hash='note-ping-target';});
  await p.fill('#note-quick-text','keep this draft');
  await p.evaluate(()=>{document.querySelector('.is-deep-linked')?.classList.remove('is-deep-linked');navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'littlelist:present-ping',payload:{title:'A reaction',kind:'reaction',body:'a heart',url:'notes.html#note-ping-target'}}}));});
  await p.click('.incoming-note-link');
  await p.waitForSelector('[data-id="ping-target"].is-deep-linked');
  assert.equal(await p.locator('#note-quick-text').inputValue(),'keep this draft');
  await p.context().close();
 });
 await check('foreground push suppression requires the exact displayed popup',async()=>{
  const p=await open('him.html?as=him');await p.waitForTimeout(200);
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.addTo('notes',{sender:'her',recipient:'him',body:'notification receipt test',mood:'heart',read:false,createdAt:Date.now()});});
  await p.waitForSelector('.incoming-note');
  const result=await p.evaluate(async()=>{
   const href=document.querySelector('.incoming-note-link').href;
   const ask=body=>new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=e=>{c.port1.close();c.port2.close();resolve(e.data.shown);};navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'littlelist:was-ping-shown',payload:{kind:'note',url:href,body}},ports:[c.port2]}));});
   return [await ask('notification receipt test'),await ask('a different note')];
  });
  assert.deepEqual(result,[true,false]);await p.context().close();
 });
 await check('a reopened sheet survives an earlier close animation',async()=>{
  const p=await open('him.html?as=him');
  await p.click('[data-open-sheet="more"]');
  await p.evaluate(()=>{document.querySelector('#sheet-more [data-close-sheet]').click();document.querySelector('.topbar-search').click();});
  await p.waitForTimeout(350);
  assert.equal(await p.locator('.sheet-scrim').isVisible(),true);
  assert.equal(await p.locator('#sheet-search').isVisible(),true);
  await p.evaluate(()=>{document.querySelector('#sheet-search [data-close-sheet]').click();document.querySelector('.topbar-search').click();});
  await p.waitForTimeout(350);assert.equal(await p.locator('#sheet-search').isVisible(),true);
  await p.context().close();
 });
 await check('old unread notes stay badged behind newer read notes',async()=>{
  const p=await open('him.html?as=him');
  await p.evaluate(async()=>{
   const d=await(await import('./data-hub.js')).sharedLayer();
   await d.setTo('notes','old-unread',{sender:'her',recipient:'him',body:'still waiting',read:false,createdAt:1});
   for(let i=0;i<55;i++)await d.setTo('notes','new-read-'+i,{sender:'her',recipient:'him',body:'read already',read:true,createdAt:100+i});
  });
  await p.waitForTimeout(150);
  assert.equal(await p.locator('.app-dock a[href="notes.html"] .attention-badge').count(),1);
  await p.context().close();
 });
 await check('your own profile does not acknowledge the partner profile',async()=>{
  const p=await open('him.html?as=him');
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('statuses','her',{person:'her',text:'coffee',category:'craving',emoji:'☕',state:'online',updatedAt:Date.now(),updateKind:'manual'});});
  await p.waitForSelector('[data-open-sheet="more"] .attention-badge');
  await p.goto(base+'/status.html?as=him#profile-him');await p.waitForSelector('.status-avatar');await p.waitForTimeout(150);
  assert.equal(await p.locator('[data-open-sheet="more"] .attention-badge').count(),1);
  await p.click('#profile-tabs a[href="#profile-her"]');
  await p.waitForFunction(()=>!document.querySelector('[data-open-sheet="more"] .attention-badge'));
  await p.context().close();
 });
 await check('notes hidden behind a sheet are not read',async()=>{
  const p=await open('notes.html?as=him');await p.click('[data-open-sheet="more"]');
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('notes','covered',{sender:'her',recipient:'him',body:'not seen yet',read:false,createdAt:Date.now()});});
  await p.waitForSelector('[data-id="covered"]');await p.waitForTimeout(200);
  assert.equal(await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();return(await d.readDoc('notes','covered')).read;}),false);
  await p.click('#sheet-more [data-close-sheet]');
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('our-little-list-notes-v1')).items.find(n=>n.id==='covered')?.read);
  await p.context().close();
 });
 await check('status chips keep their category when the editor is opened again',async()=>{
  const p=await open('status.html?as=him');
  await p.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('statuses','him',{person:'him',text:'old song',category:'listening to',emoji:'🎧',state:'online',updatedAt:Date.now(),updateKind:'manual'});});
  await p.locator('.is-me').click({position:{x:200,y:40}});await p.locator('.status-suggestions summary').click();await p.locator('.energy-choice').first().click();
  assert.equal(await p.locator('#status-category').inputValue(),'feeling');
  await p.locator('.is-me').click({position:{x:200,y:40}});
  assert.equal(await p.locator('#status-category').inputValue(),'feeling');
  await p.context().close();
 });
 await check('practice restart resets the selected clue too',async()=>{
  const p=await open('practice.html?as=him#crossword');await p.click('[data-clue="3"]');
  p.once('dialog',d=>d.accept());await p.click('#practice-restart');
  assert.equal(await p.locator('[data-clue="0"]').getAttribute('aria-pressed'),'true');
  await p.context().close();
 });
 await check('badges wait for snapshots, ignore hidden tabs and recover after errors',async()=>{
  const p=await open('him.html?as=him');
  await p.route('**/audit-harness.html',r=>r.fulfill({contentType:'text/html',body:'<nav class="app-dock"><a href="tasks.html">list</a><a href="notes.html">notes</a><a href="activities.html">activities</a><button class="dock-item" data-open-sheet="more">more</button></nav>'}));
  await p.clock.setFixedTime(new Date('2026-10-09T18:00Z'));await p.goto(base+'/audit-harness.html');
  await p.evaluate(async()=>{
   window.listeners={};window.badgeCalls=[];window.testHidden=false;
   Object.defineProperty(document,'hidden',{get:()=>window.testHidden,configurable:true});
   Object.defineProperty(navigator,'setAppBadge',{value:n=>{badgeCalls.push(n);return Promise.resolve();},configurable:true});
   Object.defineProperty(navigator,'clearAppBadge',{value:()=>{badgeCalls.push(0);return Promise.resolve();},configurable:true});
   const listen=(name,cb,opt={})=>{(listeners[name]??=[]).push({cb,opt});return()=>{};};
   const data={mode:'firebase',listenTo:listen,listenToQuery:(name,query,cb,opt)=>listen(name,cb,opt)};
   (await import('./navigation-attention.js')).startNavigationAttention({data,viewer:'him',page:'home'});
   for(const [name,subs] of Object.entries(listeners))if(!['notes','routineChecks'].includes(name))subs.at(-1).cb(name==='items'?[{id:'routine',routineDays:[0,1,2,3,4,5,6],done:false}]:[]);
  });
  await p.waitForTimeout(50);
  assert.equal(await p.locator('a[href="tasks.html"] .attention-badge').count(),0,'no phantom unchecked routines while checks load');
  assert.deepEqual(await p.evaluate(()=>badgeCalls),[],'partial reads never clear the app badge');
  await p.evaluate(()=>{listeners.routineChecks.at(-1).cb([]);listeners.notes.at(-1).cb([{id:'n',recipient:'him',read:false}]);});
  await p.waitForFunction(()=>badgeCalls.at(-1)===2);
  await p.evaluate(()=>{testHidden=true;listeners.notes.at(-1).cb([]);});await p.waitForTimeout(50);
  assert.equal(await p.evaluate(()=>badgeCalls.at(-1)),2,'hidden tabs cannot rewrite the installed badge');
  await p.evaluate(()=>{testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await p.waitForFunction(()=>badgeCalls.at(-1)===1);
  await p.evaluate(()=>{window.oldNote=listeners.notes.at(-1);oldNote.opt.onError(Error('terminal'));dispatchEvent(new Event('online'));listeners.notes.at(-1).cb([{recipient:'him',read:false}]);oldNote.opt.onError(Error('obsolete'));});
  await p.waitForFunction(()=>badgeCalls.at(-1)===2);
  await p.evaluate(()=>{window.oldDaily=listeners.wordPuzzles.at(-1);window.oldChecks=listeners.routineChecks.at(-1);});
  await p.clock.setFixedTime(new Date('2026-10-10T18:00Z'));
  await p.evaluate(()=>{
   dispatchEvent(new Event('online'));
   for(const name of ['routineChecks','questions','wordResults','timedResults','wordPuzzles','timedPuzzles'])listeners[name].at(-1).cb([]);
   oldDaily.opt.onError(Error('yesterday'));oldChecks.cb([{id:'routine_2026-10-10',done:true}]);
  });
  await p.waitForTimeout(50);
  assert.equal(await p.locator('a[href="tasks.html"] .attention-badge').count(),1,'yesterday callback cannot replace today checks');
  assert.equal(await p.evaluate(()=>badgeCalls.at(-1)),2);
  await p.context().close();
 });
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
}finally{await browser.close();}
