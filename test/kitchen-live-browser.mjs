// Full released UI -> adapter -> durable transaction, in isolated preview RAM.
// Test time can advance faster than the server: wait for real plausible elapsed
// time before collection. No progress/score or balance is injected into a run.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {RECIPES} from '../little-star/engine.mjs';
import {play} from './kitchen-browser-player.mjs';
const server=spawn(process.execPath,['tools/star-preview.mjs'],{stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',v=>logs+=v);server.stderr.on('data',v=>logs+=v);
const base='http://127.0.0.1:8892';
for(let i=0;i<100;i++){try{const r=await fetch(base+'/little-star.html');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch();
const read=async actor=>{const r=await fetch(base+'/star',{method:'POST',headers:{Authorization:'Bearer qa.ready.'+actor},body:JSON.stringify({op:'read'})});assert.equal(r.status,200);return (await r.json()).star;};
const untilServer=async session=>{const duration=Date.now()-session.wallStart;if(duration<30000)await new Promise(r=>setTimeout(r,30000-duration));};
async function choose(page,recipe){
 await page.locator('[data-kitchen]').click();await page.locator('[data-pick-recipe='+recipe+']').click();
 const buy=page.locator('[data-buy-ingredients='+recipe+']');if(await buy.count()){await buy.click();await page.locator('[data-start-cook]:not(:disabled)').waitFor();}
 await page.locator('[data-start-cook]').click();await page.locator('[data-skill-begin]').waitFor();
}
try{
 let index=0;
 for(const [recipe,def] of Object.entries(RECIPES)){
  const actor=index++%2?'her':'him',context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-20T17:00:00Z')});await page.clock.pauseAt(new Date('2026-10-20T17:00:01Z'));
  await page.goto(base+'/little-star.html?scene=ready&as='+actor);await page.locator('#little-star-demo:not([hidden])').waitFor();
  await choose(page,recipe);const initial=await read(actor),session={...initial.cookSessions[actor],wallStart:Date.now()};
  for(const station of def.stations){const grade=await play(page,station);assert.equal(grade,100,recipe+'/'+station+' full UI perfect input');await page.locator('[data-skill-next]').click();}
  await page.locator('.skill-report').waitFor();assert.match(await page.locator('.skill-result-copy').innerText(),/9 meals/);await page.screenshot({path:'node_modules/.cache/skill-kitchen/live-'+recipe+'.png',fullPage:true});await untilServer(session);
  if(recipe==='onigiri'){
   let intercepted=false;const lost=Promise.withResolvers();
   await page.route('**/star',async route=>{const input=route.request().postDataJSON();if(!intercepted&&input.command?.type==='cook'){intercepted=true;await route.fetch();await route.abort('connectionreset');lost.resolve();}else await route.continue();});
   await page.locator('[data-serve-cook]').click();await lost.promise;assert.equal(intercepted,true);
   const recovered=page.waitForResponse(r=>r.url().endsWith('/star')&&r.request().postDataJSON()?.command?.type==='cook');await page.reload();const response=await recovered;assert.equal((await response.json()).duplicate,true,'lost-reply recovery uses original receipt and proof');
  }else if(recipe==='porridge'){
   await page.locator('[data-cook-again]').click();await page.locator('[data-skill-begin]').waitFor();assert.notEqual((await read(actor)).cookSessions[actor].id,session.id,'cook again starts a new session');await page.locator('[data-arcade-exit]').click();await page.locator('[data-skill-discard]').click();await page.locator('[data-serve-cook]').click();
  }else await page.locator('[data-serve-cook]').click();
  const result=await read(actor);assert.equal(result.pantry[def.dish],(initial.pantry[def.dish]||0)+9);assert.equal(result.wallets[actor],initial.wallets[actor]+8);assert.deepEqual(result.larder,initial.larder);assert.deepEqual(errors,[]);
  console.log('LIVE UI '+actor+' '+recipe+': 100%, nine meals, chef bonus, ingredients and collection'+(recipe==='onigiri'?' / lost reply recovered exactly once':''));
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:320,height:844},serviceWorkers:'block'}),page=await context.newPage();
 await page.goto(base+'/little-star.html?scene=ready&as=her');await page.locator('#little-star-demo:not([hidden])').waitFor();await choose(page,'toast');const before=await read('her');
 await page.locator('[data-skill-begin]').click();await page.locator('[data-arcade-pause]').click();await page.reload();await page.locator('#little-star-demo:not([hidden])').waitFor();await choose(page,'toast');await page.locator('[data-skill-resume]').waitFor();
 const resumed=await read('her');assert.equal(resumed.cookSessions.her.id,before.cookSessions.her.id);assert.deepEqual(resumed.larder,before.larder);
 await page.locator('[data-skill-discard]').click();await page.locator('[data-serve-cook]').click();const failed=await read('her');assert.deepEqual(failed.pantry,before.pantry);assert.deepEqual(failed.wallets,before.wallets);assert.deepEqual(failed.larder,before.larder);assert.equal(failed.cookSessions.her.failed,true);
 await context.close();console.log('LIVE UI: reload resumes same paid batch, pause restores, discard settles zero rewards without ingredient refunds');
}catch(error){console.error(logs);throw error;}finally{await browser.close();server.kill();}
