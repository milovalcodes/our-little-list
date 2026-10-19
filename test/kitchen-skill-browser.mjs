// Browser calibration: real pointer gestures and controls, no injected scores
// or private controller access. Fake time makes CI repeatable at 60 Hz.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
import {kitchenLayout} from '../tools/kitchen-layout.mjs';
import {RECIPES} from '../little-star/engine.mjs';
import {STATIONS} from '../little-star/kitchen-rules.mjs';
import {play} from './kitchen-browser-player.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname==='/__skill'){res.setHeader('Content-Type','text/html');res.end(await kitchenLayout(url));return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root))throw Error();const bytes=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await(process.env.STAR_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
const output=new URL('../node_modules/.cache/skill-kitchen/',import.meta.url);await mkdir(output,{recursive:true});

try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-20T17:00:00Z')});await page.clock.pauseAt(new Date('2026-10-20T17:00:01Z'));
  for(const [recipe,def] of Object.entries(RECIPES)){
   await page.goto(base+'/__skill?recipe='+recipe);await page.locator('[data-skill-begin]').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const grades=[];
   for(const kind of def.stations){
    const issues=await page.locator('.skill-worktop').evaluate(el=>{const r=el.getBoundingClientRect(),issues=[];for(const x of el.querySelectorAll('.skill-overlay button,.skill-object')){if(!x.getClientRects().length)continue;const b=x.getBoundingClientRect();if(b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1)issues.push(x.className+' outside worktop');}const overlay=el.querySelector('.skill-overlay');if(overlay){const p=overlay.querySelector('p').getBoundingClientRect(),b=overlay.querySelector('button').getBoundingClientRect();if(p.bottom>b.top)issues.push('instruction overlaps Start');}return issues;});assert.deepEqual(issues,[],recipe+'/'+kind+' width '+width);
    grades.push(await play(page,kind));await page.locator('[data-skill-next]').click();
   }
   await page.locator('.skill-report').waitFor();assert.ok(Number(await page.locator('body').getAttribute('data-score'))>=90);
   await page.screenshot({path:fileURLToPath(new URL(recipe+'-'+width+'.png',output)),fullPage:true});console.log('UI PLAYTHROUGH '+width+'px '+recipe+': '+grades.join('/'));
  }
  // Frozen instructions, real deadline, pause and motion-safe presentation.
  await page.goto(base+'/__skill?recipe=pancakes&station=flip');await page.locator('[data-skill-begin]').waitFor();await page.clock.runFor(30000);assert.equal(await page.locator('[data-skill-time]').innerText(),STATIONS.flip.seconds+'s');
  await page.locator('[data-skill-begin]').click();await page.clock.runFor(1000);await page.locator('#pause').click();const left=await page.locator('[data-skill-time]').innerText();await page.clock.runFor(30000);assert.equal(await page.locator('[data-skill-time]').innerText(),left);await page.locator('[data-skill-resume]').click();await page.clock.runFor(15000);assert.match(await page.locator('.skill-report').innerText(),/RUINED/);assert.equal(await page.locator('body').getAttribute('data-score'),'0');
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('SKILL KITCHEN BROWSER: every full recipe at phone/desktop widths, real gestures, precise timing, layout, pause and zero-reward timeout pass');
}finally{await browser.close();await new Promise(r=>server.close(r));}
