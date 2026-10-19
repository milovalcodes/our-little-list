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
const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');if(url.pathname==='/__skill'){res.setHeader('Content-Type','text/html');res.end(await kitchenLayout(url));return;}const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root))throw Error();const bytes=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await(process.env.STAR_BROWSER==='webkit'?webkit:chromium).launch(),errors=[];
const output=new URL('../node_modules/.cache/skill-kitchen/',import.meta.url);await mkdir(output,{recursive:true});
async function play(page,kind){
 const work=page.locator('.skill-worktop'),r=await work.boundingBox(),to=p=>({x:r.x+p.x*r.width/320,y:r.y+p.y*r.height/250});
 const at=async p=>{const q=to(p);await page.mouse.move(q.x,q.y);};
 const stroke=async(a,b,seconds=.36)=>{await at(a);await page.mouse.down();for(let j=1;j<=18;j++){await page.clock.runFor(seconds*1000/18);await at({x:a.x+(b.x-a.x)*j/18,y:a.y+(b.y-a.y)*j/18});}await page.mouse.up();};
 const route=async()=>{const points=await page.locator('.skill-guides polyline').getAttribute('points');const ps=points.split(' ').map(p=>{const [x,y]=p.split(',').map(Number);return {x,y};});await at(ps[0]);await page.mouse.down();for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);for(let j=1;j<=steps;j++){await page.clock.runFor(30);await at({x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps});}}await page.mouse.up();};
 const gold=async()=>{for(let i=0;i<250;i++){const pos=await page.locator('.skill-meter b').evaluate(el=>parseFloat(el.style.left));if(Math.abs(pos-50)<3)return;await page.clock.runFor(10);}throw Error(kind+' never reached gold');};
 const arrows=async()=>page.locator('.skill-guides .skill-route').evaluateAll(els=>els.map(el=>el.getAttribute('d').match(/[\d.]+/g).map(Number)));
 await page.getByRole('button',{name:'ready · start timer',exact:true}).click();
 await page.clock.runFor(20);
 if(kind==='chop')for(let i=0;i<5;i++){const [x,y,xx,yy]=(await arrows())[0];await stroke({x,y},{x:xx,y:yy});}
 else if(['stir','whisk','rinse','shape','ladle'].includes(kind)){
  await route();if(kind==='ladle')await route();
  if(kind==='rinse'||kind==='shape'){await gold();await page.locator('[data-skill-action=timing]').click();}
 }else if(kind==='heat'){
  for(let n=0;n<350&&await page.locator('[data-skill-action=high]').count();n++){
   const [v,target]=await page.locator('.skill-meter').evaluate(el=>[parseFloat(el.querySelector('b').style.left),parseFloat(el.querySelector('i').style.left)+parseFloat(el.querySelector('i').style.width)/2]);
   if(v<target-6)await page.locator('[data-skill-action=high]').click();if(v>target+6)await page.locator('[data-skill-action=low]').click();await page.clock.runFor(50);
  }
 }else if(kind==='spread'){
  for(let row=0;row<3;row++){if(await page.locator('[data-skill-next]').count())break;const y=115+row*27;await stroke({x:108,y},{x:214,y},.7);if(!await page.locator('[data-skill-next]').count())await stroke({x:214,y},{x:108,y},.7);}
 }else if(kind==='crack'){await gold();await page.locator('[data-skill-action=timing]').click();await stroke({x:105,y:140},{x:215,y:140});}
 else if(kind==='flip'){
  await page.clock.runFor(3600);await stroke({x:160,y:182},{x:160,y:85});
  for(let i=0;i<100;i++){const radius=Number(await page.locator('.skill-next circle').getAttribute('r'));if(Math.abs(radius-39)<4)break;await page.clock.runFor(10);}
  await page.locator('[data-skill-action=timing]').click();
 }else if(kind==='top'||kind==='pour'){
  const targets=await page.locator('.skill-guides g circle').evaluateAll(els=>els.map(el=>({x:+el.getAttribute('cx'),y:+el.getAttribute('cy')})));
  for(let i=0;i<3;i++){
   if(kind==='top')await stroke({x:65+i*95,y:54},targets[i]);
   else{await at({x:62,y:65});await page.mouse.down();for(let j=1;j<=18;j++){await page.clock.runFor(20);await at({x:62+(targets[i].x-62)*j/18,y:65+(targets[i].y-65)*j/18});}await gold();await page.mouse.up();}
  }
 }else if(kind==='add'){
  const order=(await page.locator('.skill-cue').innerText()).replace('REMEMBER: ','').split(' → ');await page.clock.runFor(3100);
  for(const name of order)await stroke({x:{herb:65,carrot:160,potato:255}[name],y:62},{x:160,y:139});
 }else if(kind==='wrap'){
  await stroke({x:65,y:57},{x:160,y:148});for(let i=0;i<2;i++){const [x,y,xx,yy]=(await arrows())[0];await stroke({x,y},{x:xx,y:yy});}
 }
 await page.locator('[data-skill-next]').waitFor({timeout:2000});
 const grade=Number((await page.locator('.skill-overlay strong').innerText()).replace('%',''));assert.ok(grade>=90,kind+' should reward accurate gestures, got '+grade);
 return grade;
}
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-20T17:00:00Z')});await page.clock.pauseAt(new Date('2026-10-20T17:00:01Z'));
  for(const [recipe,def] of Object.entries(RECIPES)){
   await page.goto(base+'/__skill?recipe='+recipe);await page.locator('[data-skill-begin]').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const grades=[];
   for(const kind of def.stations){
    const issues=await page.locator('.skill-worktop').evaluate(el=>{const r=el.getBoundingClientRect(),issues=[];for(const x of el.querySelectorAll('.skill-overlay button,.skill-object')){const b=x.getBoundingClientRect();if(b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1)issues.push(x.className+' outside worktop');}const overlay=el.querySelector('.skill-overlay');if(overlay){const p=overlay.querySelector('p').getBoundingClientRect(),b=overlay.querySelector('button').getBoundingClientRect();if(p.bottom>b.top)issues.push('instruction overlaps Start');}return issues;});assert.deepEqual(issues,[],recipe+'/'+kind+' width '+width);
    grades.push(await play(page,kind));await page.locator('[data-skill-next]').click();
   }
   await page.locator('.skill-report').waitFor();assert.ok(Number(await page.locator('body').getAttribute('data-score'))>=90);
   await page.screenshot({path:fileURLToPath(new URL(recipe+'-'+width+'.png',output)),fullPage:true});console.log('UI PLAYTHROUGH '+width+'px '+recipe+': '+grades.join('/'));
  }
  // Frozen instructions, real deadline, pause and motion-safe presentation.
  await page.goto(base+'/__skill?recipe=pancakes&station=flip');await page.locator('[data-skill-begin]').waitFor();await page.clock.runFor(30000);assert.equal(await page.locator('[data-skill-time]').innerText(),'14s');
  await page.locator('[data-skill-begin]').click();await page.clock.runFor(1000);await page.locator('#pause').click();const left=await page.locator('[data-skill-time]').innerText();await page.clock.runFor(30000);assert.equal(await page.locator('[data-skill-time]').innerText(),left);await page.locator('[data-skill-resume]').click();await page.clock.runFor(15000);assert.match(await page.locator('.skill-report').innerText(),/RUINED/);assert.equal(await page.locator('body').getAttribute('data-score'),'0');
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('SKILL KITCHEN BROWSER: every full recipe at phone/desktop widths, real gestures, precise timing, layout, pause and zero-reward timeout pass');
}finally{await browser.close();await new Promise(r=>server.close(r));}
