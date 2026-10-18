import {chromium,webkit} from 'playwright';
import axe from 'axe-core';
import assert from 'node:assert/strict';
const browser=await(process.env.GAME_BROWSER==='webkit'?webkit:chromium).launch(),base='http://127.0.0.1:8777',failures=[],errors=[];
try{
 for(const month of (process.env.CLARITY_MONTH?[process.env.CLARITY_MONTH]:['01','10','12']))for(const side of ['her','him']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(Date.parse(`2026-${month}-20T18:00Z`));
  for(const file of (process.env.CLARITY_PAGE?[process.env.CLARITY_PAGE]:[side,'activities','tasks','notes','dates','memories','status','phone-check','practice','guide','games','today'])){
   await page.goto(`${base}/${file}.html?as=${side}`);await page.locator('.thinking-screen').waitFor({state:'hidden'});await page.waitForTimeout(300);
   await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>{if(!d.hidden)d.open=true}));
   await page.addScriptTag({content:axe.source});
   const audit=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
   for(const v of audit.violations)failures.push({side,month,file,rule:v.id,nodes:v.nodes.map(n=>({target:n.target,problem:n.failureSummary}))});
   await page.setViewportSize({width:320,height:844});
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1?{width:innerWidth,scroll:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('main *,nav *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1&&n.getBoundingClientRect().width>0).slice(0,6).map(n=>n.tagName+'.'+n.className)}:null);
   if(overflow)failures.push({side,month,file,rule:'text-zoom-overflow',...overflow});
   await page.setViewportSize({width:390,height:844});
  }
  await context.close();console.log(`Clarity audit: ${side}, month ${month}, ${process.env.CLARITY_PAGE||'12 expanded pages'} + 200% text at 320px`);
 }
 console.log(JSON.stringify(failures));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
 console.log('CLARITY: selected WCAG A/AA, theme, seasonal and 200% text reflow checks pass');
}finally{await browser.close();}
