// Exercise each real controller station with the published artwork and styles.
// Station fixtures are for layout/input QA; complete live flows have server tests.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
import {kitchenLayout} from '../tools/kitchen-layout.mjs';
import {RECIPES} from '../little-star/engine.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/__kitchen'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await kitchenLayout(url));return;}
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root))throw Error('Not found');
  const bytes=await readFile(path);res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port,errors=[];
const browser=await(process.env.STAR_BROWSER==='webkit'?webkit:chromium).launch();
const output=new URL('../node_modules/.cache/kitchen-qa/',import.meta.url);await mkdir(output,{recursive:true});
try{
 for(const width of [320,390,1280]){
  const context=await browser.newContext({viewport:{width,height:width===1280?800:844},serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  for(const [recipe,definition] of Object.entries(RECIPES))for(const station of definition.stations){
   await page.goto(base+'/__kitchen?recipe='+recipe+'&station='+station);
   const work=page.locator('.recipe-worktop');await work.waitFor();
   await work.evaluate(async el=>{await Promise.allSettled(el.getAnimations().map(a=>a.finished));});
   const issues=await page.evaluate(()=>{
    const issues=[],work=document.querySelector('.recipe-worktop'),box=work.getBoundingClientRect();
    if(document.documentElement.scrollWidth>innerWidth+1)issues.push('horizontal overflow');
    for(const el of work.querySelectorAll('button')){
     const r=el.getBoundingClientRect();if(r.width<1||r.height<1||r.left<box.left-1||r.right>box.right+1||r.top<box.top-1||r.bottom>box.bottom+1)issues.push(el.className+' outside the worktop');
    }
    for(const el of work.querySelectorAll(':is(.recipe-pot,.recipe-bowl,.cook-center,.ladle-bowl)>.big-pixel')){
     const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();if(Math.abs(r.width-p.width)>2||Math.abs(r.height-p.height)>2)issues.push(el.className+' does not fill its holder');
    }
    const tray=[...work.querySelectorAll('.add-tray button')].map(el=>el.getBoundingClientRect());
    for(let i=1;i<tray.length;i++)if(tray[i].left<tray[i-1].right)issues.push('overlapping ingredient buttons');
    const rice=work.querySelector('.wrap-ball'),target=work.querySelector('.wrap-target');
    if(rice&&target){const a=rice.getBoundingClientRect(),b=target.getBoundingClientRect();if(Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)>2)issues.push('wrap target misses the rice');if(Number(getComputedStyle(target).zIndex)<2)issues.push('wrap target hidden by food');}
    const cake=work.querySelector('.flip-cake'),pan=work.querySelector('.recipe-pot');
    if(cake&&pan){const a=cake.getBoundingClientRect(),b=pan.getBoundingClientRect();if(Math.hypot(a.x+a.width/2-(b.x+b.width*.375),a.y+a.height/2-(b.y+b.height*.6))>2)issues.push('pancake misses the pan surface');}
    return issues;
   });
   assert.deepEqual(issues,[],recipe+' / '+station+' at '+width);
   if(station===definition.stations.at(-1))await page.screenshot({path:fileURLToPath(new URL(recipe+'-'+width+'.png',output)),fullPage:true});
  }
  await context.close();
 }
 // Motion pauses in place and respects reduced-motion preferences.
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto(base+'/__kitchen?recipe=stew&station=ladle');await page.getByRole('button',{name:'Scoop from the pot',exact:true}).click();
 assert.equal(await page.locator('.ladle-tool').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
 await page.getByRole('button',{name:'pause',exact:true}).click();await page.getByRole('group',{name:'Game paused'}).waitFor();
 await page.getByRole('button',{name:'resume',exact:true}).click();await page.getByRole('button',{name:'Pour into the bowl',exact:true}).click();
 assert.match(await page.locator('.recipe-feedback').innerText(),/1 \/ 3 scoops/);
 await context.close();assert.deepEqual(errors,[]);
 console.log('KITCHEN LAYOUT: all 21 recipe stations at 320/390/1280px, food/tool anchors, input bounds, tray separation, pause/resume and reduced motion pass');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
