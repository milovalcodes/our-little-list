import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE||'http://127.0.0.1:8777',engine=process.env.GAME_BROWSER||'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch(),errors=[],report=[];
const output='node_modules/.cache/design-review';await mkdir(output,{recursive:true});
try{
 for(const side of ['her','him']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(new Date('2026-10-22T18:00Z'));
  for(const file of [side,'tasks','activities','notes','dates','memories','status','phone-check','practice','guide']){
   await page.goto(`${base}/${file}.html?as=${side}`);await page.locator('.app-dock').waitFor();await page.locator('.thinking-screen').waitFor({state:'hidden'});
   await page.evaluate(()=>document.fonts.ready);
   assert.ok(await page.evaluate(()=>[...document.fonts].filter(f=>f.family==='Nunito').every(f=>/^\d+$/.test(f.weight))),'fixed font weights avoid WebKit variable-font fallback');
   assert.equal(await page.evaluate(()=>[...document.fonts].some(f=>f.family==='Nunito'&&f.status==='loaded')),true,`${side}/${file}: bundled font loads without external access`);
   assert.equal(await page.locator('.app-dock>.dock-item>.ui-icon').count(),5);
   assert.deepEqual(await page.locator('.app-dock>.dock-item>.ui-icon').evaluateAll(nodes=>nodes.map(n=>n.dataset.uiIcon)),['home','check','heart','notes','more']);
   await page.locator('.dock-item[data-open-sheet=more]').click();await page.locator('#sheet-more.is-open').waitFor();
   assert.equal(await page.locator('.more-grid i svg').count(),5);
   await page.keyboard.press('Escape');await page.locator('#sheet-more').waitFor({state:'hidden'});
   await page.evaluate(()=>document.querySelectorAll('details').forEach(n=>{if(!n.hidden)n.open=true}));
   if(file==='activities'){await page.locator('#wins-title').waitFor();assert.equal(await page.locator('.daily-stamp svg[data-ui-icon=pair]').count(),1);}
   if(file==='tasks'){
    await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('items','design-task',{type:'task',title:'Keep ☀️ in my title',done:false,createdAt:Date.now()});});
    await page.locator('[data-id="design-task"] .delete-task svg').waitFor({state:'attached'});
    assert.match(await page.locator('[data-id="design-task"]').textContent(),/Keep ☀️ in my title/);
   }
   if(file==='dates'){
    await page.evaluate(async()=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('dates','design-date',{title:'Picnic ☀️',note:'',vibe:'go out',addedBy:'him',createdAt:Date.now(),done:false});});
    await page.locator('.date-actions svg[data-ui-icon=star]').waitFor({state:'attached'});
   }
   if(file==='notes'){
    const initial=await page.locator('#note-mood').textContent();assert.match(initial,/💛/);
    await page.evaluate(async side=>{const d=await(await import('./data-hub.js')).sharedLayer();await d.setTo('notes','design-note',{from:side==='her'?'him':'her',to:side,body:'Personal ☀️ 💌 ✓ + remains text',mood:'sun',createdAt:Date.now()});},side);
    await page.locator('[data-pin-note="design-note"] svg[data-ui-icon=pushpin]').waitFor({state:'attached'});
    assert.match(await page.locator('[data-id="design-note"]').textContent(),/Personal ☀️ 💌 ✓ \+ remains text/);
    assert.equal(await page.locator('#note-quick-send svg[data-ui-icon=arrowUp]').count(),1);
    await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('#global-search').fill('Personal');
    await page.locator('.search-hit svg[data-ui-icon=notes]').waitFor();
    assert.match(await page.locator('.search-hit strong').textContent(),/Personal ☀️ 💌 ✓/);
    await page.keyboard.press('Escape');await page.locator('#sheet-search').waitFor({state:'hidden'});
   }
   if(file==='status'){
    for(const id of ['leaving now','almost there','focus'])assert.equal(await page.locator(`[data-quick-status="${id}"] svg`).count(),1);
    assert.match(await page.locator('[data-quick-status=busy]').textContent(),/🫠/);
    await page.locator('[data-quick-status=focus]').click();await page.locator('.toast').waitFor();assert.equal(await page.locator('.toast').textContent(),'focus 30m');
   }
   if(file==='phone-check')for(const name of ['bell','pin','phone'])assert.equal(await page.locator(`.settings-jump svg[data-ui-icon=${name}]`).count(),1);
   for(const width of [320,390,1024]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`${side}/${file}/${width}: no horizontal overflow`);
   }
   await page.setViewportSize({width:390,height:844});
   const icons=await page.locator('svg.ui-icon').evaluateAll(nodes=>nodes.map(n=>({name:n.dataset.uiIcon,paths:n.innerHTML})));report.push({side,file,icons});
   await page.evaluate(()=>{document.querySelectorAll('details').forEach(n=>n.open=false);window.scrollTo(0,0)});
   await page.waitForTimeout(220); // allow disclosure chevrons to finish before visual comparison
   await page.screenshot({path:`${output}/${engine}-${side}-${file}.png`,fullPage:false});
  }
  // Dynamic UI and personal content coexist; observer must never rewrite names or values.
  await page.evaluate(()=>{const fixture=document.createElement('section');fixture.id='design-fixture';fixture.innerHTML='<span id="question-summary">waiting for Sun ☀️</span><p class="score-winning-edge">♛ Biggest advantage: <b>Sun ☀️</b></p><span data-ui-symbols>✓ ✉️ ☀️ ☾</span><div data-keep-emoji><span class="daily-stamp">☀️</span></div><button class="reaction-trigger">react</button>';document.body.append(fixture)});
  await page.locator('#design-fixture [data-ui-symbols] svg').first().waitFor();
  assert.equal(await page.locator('#design-fixture #question-summary').textContent(),'waiting for Sun ☀️');
  assert.equal(await page.locator('#design-fixture b').textContent(),'Sun ☀️');
  assert.equal(await page.locator('#design-fixture [data-keep-emoji]').textContent(),'☀️');
  assert.equal(await page.locator('#design-fixture .reaction-trigger svg').count(),1);
  await context.close();
 }
 // First-time sign-in shares the same font and brand drawing, without signing in.
 const entry=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await entry.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
 await entry.route('**/entry.js',r=>r.fulfill({contentType:'text/javascript',body:'export {};'}));
 await entry.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
 const front=await entry.newPage();await front.goto(base+'/index.html');
 await front.evaluate(async()=>{(await import('./ui-helpers.js')).setupAuthUI({mode:'cloud'},null)});
 await front.locator('.auth-icon [data-ui-icon=pair]').waitFor();
 await front.evaluate(()=>document.fonts.ready);
 assert.equal(await front.getByRole('button',{name:'sign in',exact:true}).isVisible(),true);
 assert.match(await front.locator('.auth-card').evaluate(n=>getComputedStyle(n).fontFamily),/Nunito/);
 await entry.close();
 assert.deepEqual(errors,[]);
 // All instances, themes and pages use byte-identical drawings.
 const drawings=new Map();for(const row of report)for(const icon of row.icons){if(drawings.has(icon.name))assert.equal(icon.paths,drawings.get(icon.name));else drawings.set(icon.name,icon.paths)}
 await writeFile(`${output}/${engine}-report.json`,JSON.stringify(report,null,2));
 console.log(`${engine}: both sides, ten destinations, 320/390/1024px; bundled fonts, identical SVGs, score/keyboard/note/status controls, preserved personal emoji and no page errors pass`);
}finally{await browser.close()}
