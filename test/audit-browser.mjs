import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8777';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
await context.route('**/firebase-config.js',route=>route.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.fallback():route.abort());
const errors=[];
context.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);});
const moon=await context.newPage(),sun=await context.newPage();
const stored=(page,name)=>page.evaluate(name=>JSON.parse(localStorage.getItem(`our-little-list-${name}-v1`)||'{"items":[]}').items,name);
try{
  await moon.goto(base+'/today.html?as=him#question');await sun.goto(base+'/today.html?as=her#question');
  await moon.fill('#question-answer','moon original');await moon.click('#question-save');
  await sun.fill('#question-answer','sun original');await sun.click('#question-save');
  await moon.waitForFunction(()=>document.querySelector('#question-answers').textContent.includes('sun original'));
  await sun.click('#question-reveal');await sun.click('#question-edit');await sun.fill('#question-answer','sun corrected');await sun.click('#question-save');
  await moon.waitForFunction(()=>document.querySelector('#question-answers').textContent.includes('sun corrected'));
  assert.ok(!(await moon.locator('#question-answers').textContent()).includes('sun original'));
  console.log('ok edited daily answers refresh on the other phone without reloading');

  // Hold our write's acknowledgement while the partner answers: a late
  // completion must not put the old question markers back over that snapshot.
  await moon.evaluate(async()=>{
    const data=await (await import('./data-hub.js')).sharedLayer();
    const questions=await data.readOnce('questions');const q=questions[0];
    await data.setTo('questions',q.id,{...q,answers:{him:{at:1},her:{at:1}}});
    const original=data.answerQuestion.bind(data);
    data.answerQuestion=async(...args)=>{await original(...args);await new Promise(resolve=>window.releaseAnswer=resolve);};
  });
  await moon.click('#question-reveal');await moon.click('#question-edit');await moon.fill('#question-answer','moon final');await moon.click('#question-save');
  await moon.waitForFunction(()=>typeof window.releaseAnswer==='function');
  await sun.click('#question-edit');await sun.fill('#question-answer','sun final');await sun.click('#question-save');
  await moon.waitForFunction(()=>document.querySelector('#question-answers').textContent.includes('sun final'));
  await moon.evaluate(()=>window.releaseAnswer());
  await moon.waitForFunction(()=>!document.querySelector('#question-save').disabled);
  assert.ok((await moon.locator('#question-answers').textContent()).includes('sun final'));
  console.log('ok delayed answer acknowledgements preserve newer partner edits');

  await moon.evaluate(async()=>{
    const data=await (await import('./data-hub.js')).sharedLayer(),original=data.readDoc.bind(data);
    const cached=(await data.readOnce('questionAnswers')).find(answer=>answer.person==='her');
    window.staleReads=0;window.restoreAnswerReads=()=>{data.readDoc=original;};
    data.readDoc=async(name,id)=>{if(name==='questionAnswers'&&id.endsWith('-her')){window.staleReads++;return cached;}return original(name,id);};
  });
  await sun.click('#question-edit');await sun.fill('#question-answer','sun after reconnect');await sun.click('#question-save');
  await moon.waitForFunction(()=>window.staleReads>0);
  await moon.evaluate(()=>{window.restoreAnswerReads();window.dispatchEvent(new Event('online'));});
  await moon.waitForFunction(()=>document.querySelector('#question-answers').textContent.includes('sun after reconnect'));
  console.log('ok reconnect rechecks a stale answer even without another question snapshot');

  await moon.addInitScript(()=>{window.testHidden=true;Object.defineProperty(document,'hidden',{get:()=>window.testHidden,configurable:true});});
  await moon.bringToFront();
  await moon.goto(base+'/notes.html?as=him');await moon.waitForSelector('.app-dock');
  await moon.evaluate(async()=>{
    const data=await (await import('./data-hub.js')).sharedLayer();
    for(let i=0;i<20;i++)await data.setTo('notes',`read-test-${i}`,{sender:'her',from:'her',recipient:'him',to:'him',body:`note ${i}`,createdAt:Date.now()+i,read:false});
  });
  await moon.waitForSelector('[data-id="read-test-19"]');await moon.waitForTimeout(150);
  assert.ok((await stored(moon,'notes')).filter(n=>n.id.startsWith('read-test')).every(n=>!n.read));
  await moon.evaluate(()=>{window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await moon.waitForFunction(()=>JSON.parse(localStorage.getItem('our-little-list-notes-v1')).items.some(n=>n.id==='read-test-19'&&n.read));
  assert.equal((await stored(moon,'notes')).find(n=>n.id==='read-test-0').read,false,'offscreen notes stay unread');
  await moon.locator('[data-id="read-test-0"]').evaluate(row=>row.scrollIntoView({block:'center'}));
  await moon.waitForFunction(()=>JSON.parse(localStorage.getItem('our-little-list-notes-v1')).items.some(n=>n.id==='read-test-0'&&n.read));
  console.log('ok notes are read only in a visible tab and after scrolling into view');



  await moon.evaluate(async()=>{
    const data=await (await import('./data-hub.js')).sharedLayer();
    await data.setTo('dates','atomic-date',{title:'a date for two',note:'',addedBy:'him',createdAt:Date.now(),done:false});
  });
  await Promise.all([moon,sun].map(page=>page.evaluate(async()=>{
    const data=await (await import('./data-hub.js')).sharedLayer();
    await data.setDateDone('atomic-date',true,'him');
  })));
  assert.equal((await stored(moon,'memories')).filter(item=>item.dateId==='atomic-date').length,1);
  await moon.evaluate(async()=>{const data=await (await import('./data-hub.js')).sharedLayer();await data.setDateDone('atomic-date',false,'him');});
  assert.equal((await stored(moon,'memories')).filter(item=>item.dateId==='atomic-date').length,0);
  console.log('ok simultaneous date completion creates one memory, and undo removes it');

  await sun.addInitScript(()=>{
    const decode=window.createImageBitmap.bind(window);
    window.createImageBitmap=file=>file.name==='old-broken.png'?new Promise((_,reject)=>setTimeout(()=>reject(new Error('old decode failed')),600)):decode(file);
  });
  await sun.goto(base+'/memories.html?as=her');await sun.waitForSelector('.app-dock');
  await sun.click('.context-add');await sun.fill('#memory-text','the right photo');
  const png=readFileSync(new URL('../sun-profile.png',import.meta.url));
  await sun.setInputFiles('#memory-photo',{name:'old-broken.png',mimeType:'image/png',buffer:png});
  await sun.setInputFiles('#memory-photo',{name:'right.png',mimeType:'image/png',buffer:png});
  await sun.waitForFunction(()=>document.querySelector('#photo-name').textContent==='right.png');
  await sun.waitForTimeout(700);
  assert.equal(await sun.locator('#photo-name').textContent(),'right.png');
  await sun.click('#memory-save');
  await sun.waitForFunction(()=>JSON.parse(localStorage.getItem('our-little-list-memories-v1')).items.some(item=>item.text==='the right photo'&&item.hasPhoto));
  await sun.locator('.memory-card',{hasText:'the right photo'}).locator('[data-open]').click();
  assert.ok(await sun.locator('body.memory-open').count());
  await sun.evaluate(async()=>{const data=await (await import('./data-hub.js')).sharedLayer();const item=(await data.readOnce('memories')).find(item=>item.text==='the right photo');await data.removeFrom('memories',item.id);});
  await sun.waitForFunction(()=>!document.body.classList.contains('memory-open'));
  console.log('ok replacing a photo ignores its old decode; removing an open memory unlocks the page');
  assert.deepEqual(errors,[]);
}finally{await context.close();await browser.close();}
