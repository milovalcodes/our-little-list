// QA comfort pass: boards and keys share the phone screen, crosswords are cropped
// to their squares, and each thing has one name, one cue and one place.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch(),base='http://127.0.0.1:8777',errors=[],day='2026-10-20';
try{
 for(const width of [320,375]){
  const context=await browser.newContext({viewport:{width,height:740},timezoneId:'America/New_York',serviceWorkers:'block',reducedMotion:'reduce',isMobile:true,hasTouch:true});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.fallback():r.abort());
  await context.route('**/firebase-config.js',r=>r.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(Date.parse(day+'T18:00Z'));
  const onScreen=selector=>page.locator(selector).first().evaluate(n=>{const r=n.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:innerHeight};});

  await page.goto(base+'/activities.html?as=her');await page.locator('#wordle>summary').waitFor();
  // One drawn chevron replaces the old glyphs.
  const cue=await page.locator('#wordle .daily-chevron').evaluate(n=>({size:getComputedStyle(n).fontSize,mark:getComputedStyle(n,'::before').borderRightWidth}));
  assert.deepEqual(cue,{size:'0px',mark:'2px'});

  // Opening Little Word shows its first row and its keys together.
  await page.locator('#wordle>summary').click();await page.locator('#word-game [data-key]:not([disabled])').first().waitFor();
  await page.waitForTimeout(150);
  const row=await onScreen('#word-game .word-row'),keys=await onScreen('#word-game .word-keyboard');
  assert.ok(row.top>=0&&row.bottom<=keys.top,`first guess row visible above the keys at ${width}px: ${JSON.stringify({row,keys})}`);
  assert.ok(keys.bottom<=keys.height+1,'Little Word keys on screen');
  await page.locator('#wordle>summary').click();

  // Crossword: a square window around its squares, board in view, one status line.
  await page.locator('#crossword>summary').click();await page.locator('#crossword [data-start]:not([disabled])').click();
  await page.locator('#crossword .crossword-keys').waitFor();await page.waitForTimeout(150);
  const edges=await page.locator('#crossword .crossword-grid').evaluate(grid=>{
   const n=Number(getComputedStyle(grid).getPropertyValue('--grid-size')),cells=[...grid.children],rows=[];
   for(let i=0;i<cells.length;i+=n)rows.push(cells.slice(i,i+n).map(c=>c.matches('[data-cell]')));
   const col=k=>rows.some(r=>r[k]);
   return {square:cells.length===n*n,rows:rows[0].some(Boolean)||rows.at(-1).some(Boolean),columns:col(0)||col(n-1),label:grid.getAttribute('aria-label')};
  });
  assert.deepEqual(edges,{square:true,rows:true,columns:true,label:'Crossword grid'});
  // Starting brings the board to the top of the screen.
  // Poll from Node: in-page polling stalls under the fixed test clock.
  const settled=()=>page.evaluate(()=>{const t=document.querySelector('#crossword .timed-toolbar').getBoundingClientRect().top;return t>=-1&&(t<=80||Math.ceil(scrollY+innerHeight)>=document.documentElement.scrollHeight-2);});
  for(let i=0;i<50&&!await settled();i++)await page.waitForTimeout(100);
  assert.ok(await settled(),'starting brings the crossword toolbar to the top');
  const board=await onScreen('#crossword .crossword-viewport');
  assert.ok(board.top<board.height,'crossword board brought into view');
  assert.equal(await page.locator('#crossword-summary').textContent(),'checked when it ends');

  // Home: games live in the strip only; milestones live on the profile.
  await page.goto(base+'/her.html?as=her');await page.locator('.daily-strip a').first().waitFor();
  assert.match(await page.locator('.daily-strip').textContent(),/Crossword/);
  assert.doesNotMatch(await page.locator('body').textContent(),/Mini crossword/);
  assert.equal(await page.locator('.personal-progress').count(),0);
  await page.waitForFunction(()=>/just today’s games above/.test(document.querySelector('#home-next-up').textContent));
  assert.equal(await page.locator('#home-next-up .home-next-row').count(),0);

  // Profile: one way to edit your status.
  await page.goto(base+'/status.html?as=her');await page.locator('[data-edit-status]').first().waitFor();
  assert.equal(await page.getByRole('button',{name:'Edit status',exact:true}).count(),1);

  // Guide: the settings notes sit inside their topic.
  await page.goto(base+'/guide.html?as=her');
  assert.match(await page.locator('#guide-settings').textContent(),/Settings checks this device.*To update, open More/s);
  assert.equal(await page.locator('#guide-tutorial>p').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('QA comfort: cropped crosswords, game keys on screen, one name, one cue, one place for games, milestones and status at 320/375px');
}finally{await browser.close();}
