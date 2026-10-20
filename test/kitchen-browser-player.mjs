import assert from 'node:assert/strict';
export async function play(page,kind){
 const work=page.locator('.skill-world');let r=await work.boundingBox();const to=p=>({x:r.x+p.x*r.width/320,y:r.y+p.y*r.height/250});
 const at=async p=>{const q=to(p);await page.mouse.move(q.x,q.y);};
 const stroke=async(a,b,seconds=.36)=>{r=await work.boundingBox();await at(a);await page.mouse.down();for(let j=1;j<=18;j++){await page.clock.runFor(seconds*1000/18);await at({x:a.x+(b.x-a.x)*j/18,y:a.y+(b.y-a.y)*j/18});}await page.mouse.up();};
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
  const order=await page.locator('.skill-order li>span:last-child').allTextContents();await page.clock.runFor(3100);
  for(const name of order)await stroke({x:{herb:65,carrot:160,potato:255}[name],y:62},{x:160,y:139});
 }else if(kind==='wrap'){
  await stroke({x:65,y:57},{x:160,y:148});for(let i=0;i<2;i++){const [x,y,xx,yy]=(await arrows())[0];await stroke({x,y},{x:xx,y:yy});}
 }
 try{await page.locator('[data-skill-next]').waitFor({timeout:2000});}catch(error){console.error('Failed station '+kind+': '+await page.locator('.arcade-cooking').innerText());throw error;}
 const grade=Number((await page.locator('.skill-overlay strong').innerText()).replace('%',''));assert.ok(grade>=90,kind+' should reward accurate gestures, got '+grade);
 return grade;
}
