// Station play is disposable. Only the engine can settle a finished batch.
function mountStarCooking(host,ctx){
 const ctl=toyController(host,{practice:()=>recipe.practice}),sprite=ctx.sprite,toast=ctx.recipe==='toast',limits=[20,24,12,30],names=['cut',toast?'spread':'stir','heat','top'];
 const recipe={phase:0,started:false,left:20,sliced:new Set(),chops:0,cutScores:[],stir:0,stirGood:0,stirTravel:0,angle:0,heat:0,held:false,plated:new Set(),occupied:new Set(),toppings:{},plateScores:[],grades:[],penalties:0,quality:0,score:0,transition:0,practice:!!ctx.practice};
 const targets=[{x:132,y:142},{x:184,y:142},{x:158,y:162}];
 // Toast has a broad bread surface now. Keep the spread hit regions on that
 // surface, aligned with the nine contiguous sections of the jam artwork.
 const spreadPatches=Array.from({length:9},(_,i)=>({x:123+i%3*37,y:121+Math.floor(i/3)*37,value:0}));
 let drag=null,previous=null,keyStir=0,assistPointer=null,selected=0,clockTime=0,splashLeft=0,chopCooldown=0,lap=0,turns=0,heatHeldAt=0,heatStart=0,spoonAngle=0;
 const clampScore=n=>Math.round(Math.max(0,Math.min(100,n)));
 const feedback=t=>{const el=host.querySelector('.recipe-feedback');if(el)el.textContent=t;};
 // Reveal adjoining sections of ONE authored smear, not separate square fills.
 const jam=()=>'<span class="toast-jam" aria-hidden="true">'+spreadPatches.map((p,i)=>'<i data-jam="'+i+'" style="opacity:'+p.value+';background-position:'+(i%3*50)+'% '+(Math.floor(i/3)*50)+'%"></i>').join('')+'</span>';
 const pot=()=>'<span class="recipe-pot">'+(toast?ctx.foodSprite('toast')+jam():sprite('pot'))+'</span>';
 const dish=()=>toast?ctx.foodSprite('toast')+jam():sprite('bowl');
 function draw(){
  const phase=recipe.phase;
  host.dataset.station=phase;
  host.dataset.recipe=toast?'toast':'porridge';
  host.innerHTML='<div class="recipe-heading"><span>'+(recipe.practice?'PRACTICE':'YOUR RECIPE')+' <b>'+(toast?'sunbeam berry toast':'moonberry porridge')+'</b></span><span class="recipe-ticket">'+(phase===4?'READY':(phase+1)+' / 4')+'</span></div>'+
   '<ol class="recipe-stations" aria-label="Recipe progress">'+names.map((n,i)=>'<li data-state="'+(phase>i?'done':phase===i?'active':'next')+'" '+(phase===i?'aria-current="step"':'')+'><span>'+(phase>i?recipe.grades[i]+'%':i+1)+'</span>'+n+'</li>').join('')+'</ol>'+
   '<h4 class="recipe-title">'+['Chop the moonberries',toast?'Spread from edge to edge':'Stir three full circles','Stop at the perfect temperature',toast?'Garnish your berry toast':'Garnish your porridge','Your kitchen report'][phase]+'</h4>'+
   '<div class="recipe-worktop" data-recipe-phase="'+phase+'" role="group" aria-label="'+['Cutting station',toast?'Spreading station':'Stirring station','Cooking station','Topping station','Finished dish'][phase]+'"></div>'+
   '<div class="recipe-clock"><span data-recipe-time>'+(phase===4?'':limits[phase]+'s · starts with your first move')+'</span><span data-recipe-detail></span></div><div class="recipe-feedback" role="status"></div><div class="recipe-access"></div>';
  const stage=host.querySelector('.recipe-worktop'),access=host.querySelector('.recipe-access');
  if(phase===0){
   stage.innerHTML='<span class="recipe-board" aria-hidden="true"><i></i><i></i><i></i></span>'+[0,1,2].map(i=>'<button type="button" class="recipe-berry" data-slice="'+i+'" style="left:'+(21+i*26)+'%" aria-label="Chop moonberries: tap twice per berry">'+sprite('berry')+'<i class="cut-guide"></i></button>').join('')+'<span class="recipe-knife">'+sprite('knife')+'</span><span class="chop-count">0 / 6 chops</span><span class="chop-hint">TAP TO CHOP</span>';
   host.querySelector('[data-slice="0"]').classList.add('next-cut');placeKnife();
   feedback('Tap each glowing berry twice.');
  }else if(phase===1&&toast){
   stage.innerHTML=pot()+spreadPatches.map((p,i)=>'<span class="spread-patch" data-spread="'+i+'" style="left:'+p.x/3.2+'%;top:'+p.y/2.5+'%"></span>').join('')+'<span class="spread-knife">'+sprite('knife')+'</span><span class="stir-count">0% covered</span>';
   access.innerHTML='<button type="button" data-spread-help>spread · Enter</button>';feedback('Spread the jam across the toast.');
  }else if(phase===1){
   stage.innerHTML=pot()+'<span class="stir-path" aria-hidden="true"></span><span class="recipe-spoon">'+sprite('spoon')+'</span><span class="recipe-pot pot-front">'+sprite('pot')+'</span><span class="stir-count">0 / 3</span><span class="stir-ripple"></span><span class="cook-splash" aria-hidden="true"><i></i><i></i><i></i></span><div class="stir-progress" role="progressbar" aria-label="Stirring circles" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>';
   access.innerHTML='<button type="button" data-cook-assist>hold to stir · ← / →</button>';
   feedback('Stir three circles inside the pot.');
   placeSpoon();
  }else if(phase===2){
   stage.innerHTML=pot()+'<span class="heat-steam" aria-hidden="true"><i></i><i></i><i></i></span><div class="heat-track"><span class="heat-good"></span><i class="heat-level"></i></div><button type="button" class="heat-button" data-heat>hold to warm</button>';
   feedback('Release in the gold center.');
  }else if(phase===3){
   stage.innerHTML='<span class="ingredient-tray" aria-hidden="true"></span><span class="recipe-bowl">'+dish()+'</span>'+targets.map((p,i)=>'<button type="button" class="topping-target" data-plate-target="'+i+'" style="left:'+p.x/3.2+'%;top:'+p.y/2.5+'%" aria-label="Place selected berry on empty garnish spot '+(i+1)+'"></button>').join('')+
    [0,1,2].map(i=>'<button type="button" class="topping" data-topping="'+i+'" style="left:'+(17+i*28)+'%;top:18%" aria-pressed="false" aria-label="Pick up berry topping '+(i+1)+'">'+sprite('sliced')+'</button>').join('')+'<span class="plate-order">3 berries · spread them evenly</span>';
   access.innerHTML='<button type="button" class="main-button" data-finish-plate disabled>serve this plate</button>';
   feedback('Place berries on the glowing spots.');
  }else{
   recipe.score=Math.floor(recipe.grades.reduce((a,b)=>a+b,0)/4);
   const reward=!recipe.practice&&ctx.reward?ctx.reward(recipe.score):cookingReward(recipe.score);recipe.quality=reward.portions;
   host.querySelector('[data-recipe-time]').textContent=recipe.practice?'PRACTICE SCORE · '+recipe.score+'%':recipe.score>(ctx.bestScore||0)?'NEW PERSONAL BEST!':'YOUR BEST · '+Math.max(ctx.bestScore||0,recipe.score)+'%';
   // Keep exactly the bowl and topping positions the player created. A result
   // garnish is not a button: give it its own absolute, fixed-size layer.
   stage.innerHTML='<span class="recipe-bowl">'+dish()+'</span>'+Object.entries(recipe.toppings).map(([i,p])=>'<span class="served-topping" style="left:'+(p.x-16)/3.2+'%;top:'+(p.y-16)/2.5+'%">'+sprite('sliced')+'</span>').join('')+'<span class="recipe-stars">'+reward.label+' · '+recipe.score+'%</span>';
   access.innerHTML='<button type="button" class="main-button" data-serve-cook>'+(recipe.practice?'finish practice':'collect '+reward.portions+' meal'+(reward.portions===1?'':'s'))+'</button><button type="button" data-cook-again>'+(recipe.practice?'practice again':'collect & cook again')+'</button>';
   feedback(recipe.practice?'Practice':ctx.rewardText?.(recipe.score)||'');
   ctx.complete({score:recipe.score,grades:[...recipe.grades],quality:recipe.quality,practice:recipe.practice});
  }
  if(phase<4)access.insertAdjacentHTML('beforeend','<button type="button" data-retry-station>'+(recipe.practice?'retry station':'retry without rewards')+'</button>');
  ctl.animate(stage,[{opacity:.6,translate:'0 6px'},{opacity:1,translate:'0 0'}],180);
  // Replacing a station removes its focused control. Put keyboard users on
  // the next real action, rather than dropping focus back to the page body.
  (stage.querySelector('button:not(:disabled)')||access.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
 }
 function start(){if(recipe.phase===4||recipe.transition)return false;recipe.started=true;return true;}
 function finishStation(score){
  if(recipe.transition||recipe.phase===4)return;
  recipe.grades[recipe.phase]=clampScore(score);recipe.transition=.85;recipe.started=false;recipe.held=false;keyStir=0;assistPointer=null;drag=null;previous=null;
  feedback(names[recipe.phase]+' · '+recipe.grades[recipe.phase]+'%');
  host.querySelector('.recipe-worktop').insertAdjacentHTML('beforeend','<div class="station-grade">'+recipe.grades[recipe.phase]+'%<small>'+names[recipe.phase]+' complete</small></div>');
  ctl.animate(host.querySelector('.station-grade'),[{opacity:0,translate:'0 8px'},{opacity:1,translate:'0 0'}],180);
 }
 function slice(i,score){
  if(recipe.phase!==0||recipe.transition||recipe.sliced.has(i))return;
  recipe.sliced.add(i);recipe.cutScores.push(clampScore(score));const b=host.querySelector('[data-slice="'+i+'"]');b.innerHTML=sprite('sliced');b.classList.add('cut');ctx.beep(i);
  if(recipe.sliced.size===3)finishStation(recipe.cutScores.reduce((a,b)=>a+b,0)/3-recipe.penalties);
 }
 function placeKnife(){const knife=host.querySelector('.recipe-knife');if(knife){const from=knife.style.left;knife.style.left=(26+Math.min(2,Math.floor(recipe.chops/2))*26)+'%';knife.style.top='10%';if(from&&from!==knife.style.left)ctl.animate(knife,[{left:from},{left:knife.style.left}],130);}}
 function chop(point){
  if(recipe.phase!==0||recipe.transition||performance.now()<chopCooldown)return;
  // Input debounce must not stretch with a throttled or dropped render frame.
  const i=Math.floor(recipe.chops/2),center={x:92+i*83.2,y:132.5};start();
  if(point&&Math.hypot((point.x-center.x),(.7*(point.y-center.y)))>34){recipe.penalties+=4;feedback('Miss · −4');ctx.fx?.('miss');return;}
  placeKnife();recipe.chops++;chopCooldown=performance.now()+200;
  const knife=host.querySelector('.recipe-knife');knife.classList.remove('chopping');void knife.offsetWidth;knife.classList.add('chopping');
  const berry=host.querySelector('[data-slice="'+i+'"]');berry.classList.add('nicked');ctx.beep(i);
  host.querySelector('.chop-count').textContent=recipe.chops+' / 6 chops';
  host.querySelector('.chop-hint').textContent='CHOP!';
  feedback(recipe.chops+' / 6 · '+(recipe.chops===6?'All sliced!':'Good cut. Follow the glow.'));ctx.fx?.('cut');
  if(recipe.chops%2===0)slice(i,100);
 }
 function placeSpoon(){
  // The bowl of the spoon stays IN the food; the handle translates with it.
  // A duplicate foreground rim occludes the submerged portion.
  const x=160+32*Math.cos(spoonAngle),y=111+14*Math.sin(spoonAngle),spoon=host.querySelector('.recipe-spoon');
  if(spoon){spoon.style.left=(x-18)/3.2+'%';spoon.style.top=(y-48)/2.5+'%';}
  host.querySelector('.stir-ripple')?.style.setProperty('--stir-angle',spoonAngle+'rad');
 }
 function stir(delta,quality=1){
  if(recipe.transition||recipe.phase!==1)return;
  // Pointer samples already reject implausible jumps. A held control must
  // integrate elapsed time, even when a phone renders only a few frames/sec.
  const amount=delta;lap+=amount;
  // A sub-pixel gap at the end of a circle should not demand another lap.
  if(Math.abs(lap)>=Math.PI*2-.02){turns++;lap=Math.sign(lap)*Math.max(0,Math.abs(lap)-Math.PI*2);ctx.beep(turns%4);}
  recipe.stir=turns*Math.PI*2+Math.abs(lap);recipe.stirGood+=Math.abs(amount)*quality;recipe.stirTravel+=Math.abs(amount);
  recipe.angle+=amount;
  const progress=turns>=3?100:Math.min(99,recipe.stir/(Math.PI*6)*100),meter=host.querySelector('.stir-progress');
  meter.setAttribute('aria-valuenow',Math.round(progress));meter.firstElementChild.style.width=progress+'%';
  host.querySelector('.stir-count').textContent=Math.min(3,Math.floor(recipe.stir/(Math.PI*2)))+' / 3 · '+Math.round(progress)+'%';
  feedback(turns?turns+' / 3 circles':'Stir in circles');
  if(turns>=3)finishStation(100*recipe.stirGood/Math.max(.001,recipe.stirTravel));
 }
 function holdHeat(){recipe.held=true;heatHeldAt=performance.now();heatStart=recipe.heat;}
 const heldTemperature=()=>Math.min(1,heatStart+(performance.now()-heatHeldAt)*.00019);
 function releaseHeat(){
  if(!recipe.held||recipe.phase!==2)return;recipe.heat=heldTemperature();recipe.held=false;
  finishStation(100-Math.max(0,Math.abs(recipe.heat-.7)-.035)*250);
 }
 function spread(x,y,amount){
  if(recipe.transition||recipe.phase!==1)return;start();
  for(const [i,p] of spreadPatches.entries()){if(Math.hypot(x-p.x,y-p.y)>24)continue;p.value=Math.min(1,p.value+amount);host.querySelector('[data-spread="'+i+'"]').style.setProperty('--coverage',p.value);host.querySelector('[data-jam="'+i+'"]').style.opacity=p.value;}
  const coverage=spreadPatches.reduce((n,p)=>n+p.value,0)/9;recipe.stir=coverage*Math.PI*6;host.querySelector('.stir-count').textContent=Math.round(coverage*100)+'% covered';
  const tool=host.querySelector('.spread-knife');tool.style.left=(x-15)/3.2+'%';tool.style.top=(y-30)/2.5+'%';
  if(coverage>=.98){
   // The existing completion tolerance still awards 100%; render that as a
   // finished spread too, without a faint final tile seam.
   spreadPatches.forEach((p,i)=>{p.value=1;host.querySelector('[data-jam="'+i+'"]').style.opacity=1;host.querySelector('[data-spread="'+i+'"]').style.setProperty('--coverage',1);});
   finishStation(100);
  }
 }
 function plate(i,p){
  if(recipe.phase!==3||recipe.transition)return;
  const old=recipe.toppings[i],occupied=new Set(Object.entries(recipe.toppings).filter(([key])=>Number(key)!==i).map(([,v])=>v.target));
  const placement=garnishPlacement(p,targets.map((t,n)=>({...t,n})).filter(t=>!occupied.has(t.n)));
  const b=host.querySelector('[data-topping="'+i+'"]'),from={left:b.style.left,top:b.style.top};
  const settle=()=>ctl.animate(b,[from,{left:b.style.left,top:b.style.top}],150);
  if(!placement){b.style.left=old?(old.x-16)/3.2+'%':(17+i*28)+'%';b.style.top=old?(old.y-16)/2.5+'%':'18%';settle();feedback('Aim inside the '+(toast?'toast':'porridge')+'. Nothing lost — try again.');return;}
  recipe.plateScores[i]=placement.score;recipe.plated.add(i);recipe.toppings[i]=placement;b.style.left=(placement.x-16)/3.2+'%';b.style.top=(placement.y-16)/2.5+'%';b.classList.add('plated');
  recipe.occupied=new Set(Object.values(recipe.toppings).map(p=>p.target));host.querySelectorAll('[data-plate-target]').forEach((el,n)=>{el.classList.toggle('placed',recipe.occupied.has(n));el.disabled=recipe.occupied.has(n);});ctx.fx?.('plate');
  settle();selected=[0,1,2].find(n=>!recipe.plated.has(n))??i;host.querySelectorAll('[data-topping]').forEach(el=>el.setAttribute('aria-pressed',String(+el.dataset.topping===selected)));feedback(placement.score+'% placement · '+recipe.plated.size+' / 3 berries'+(recipe.plated.size===3?' · adjust, or serve when happy.':''));
  host.querySelector('[data-finish-plate]').disabled=recipe.plated.size!==3;
 }
 function cancel(){
  if(drag?.topping!==undefined){const b=host.querySelector('[data-topping="'+drag.topping+'"]'),p=recipe.toppings[drag.topping];if(b){b.classList.remove('lifting');b.style.left=p?(p.x-16)/3.2+'%':(17+Number(drag.topping)*28)+'%';b.style.top=p?(p.y-16)/2.5+'%':'18%';}}
  drag=null;previous=null;recipe.held=false;keyStir=0;assistPointer=null;
 }
 ctl.on(host,'pointerdown',e=>{
  if(ctl.isPaused()||recipe.transition||recipe.phase===4||e.button!==0||!e.isPrimary||drag||assistPointer!==null||e.target.closest('button:disabled'))return;
  if(e.target.closest('[data-cook-assist]')){e.preventDefault();start();keyStir=1;assistPointer=e.pointerId;e.target.setPointerCapture(e.pointerId);return;}
  const work=e.target.closest('.recipe-worktop');if(!work)return;
  if(recipe.phase===2&&!e.target.closest('[data-heat]'))return;
  e.preventDefault();
  start();const p=toyPoint(e,work);drag={id:e.pointerId,start:p,topping:e.target.closest('[data-topping]')?.dataset.topping,target:e.target.closest('[data-plate-target]')?.dataset.plateTarget,heat:!!e.target.closest('[data-heat]'),at:performance.now()};
  previous=p;work.setPointerCapture(e.pointerId);if(drag.heat)holdHeat();
  if(recipe.phase===1&&!toast)recipe.angle=Math.atan2((p.y-111)/.65,p.x-160);
  if(drag.topping!==undefined){selected=+drag.topping;ctl.stopMotion(host.querySelector('[data-topping="'+selected+'"]'));host.querySelectorAll('[data-topping]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.topping===selected)));}
 });
 ctl.on(host,'pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||recipe.transition)return;const p=toyPoint(e,host.querySelector('.recipe-worktop'));e.preventDefault();
  if(recipe.phase===0){
   if(!drag.chopped&&p.y-drag.start.y>18&&Math.abs(p.x-drag.start.x)<55){chop({x:(p.x+drag.start.x)/2,y:(p.y+drag.start.y)/2});if(drag)drag.chopped=true;}
  }else if(recipe.phase===1&&toast){
   logicalStroke(previous,p,(x,y,d)=>{if(recipe.transition)return false;spread(x,y,d/45);});
  }else if(recipe.phase===1){
   const sample=stirSample(previous,p,(performance.now()-drag.at)/1000);if(sample.delta)stir(sample.delta,sample.quality);if(!recipe.transition)feedback(sample.hint);if(sample.quality<1&&sample.delta){host.dataset.splash='true';splashLeft=.25;}
  }else if(recipe.phase===3&&drag.topping!==undefined){const b=host.querySelector('[data-topping="'+drag.topping+'"]');b.classList.add('lifting');b.style.left=(p.x-16)/3.2+'%';b.style.top=(p.y-16)/2.5+'%';}
  previous=p;if(drag)drag.at=performance.now();
 });
 ctl.on(host,'pointerup',e=>{
  if(assistPointer===e.pointerId){assistPointer=null;keyStir=0;return;}
  if(!drag||drag.id!==e.pointerId)return;
  const d=drag,p=toyPoint(e,host.querySelector('.recipe-worktop'));drag=null;host.querySelector('.topping.lifting')?.classList.remove('lifting');
  if(d.heat)releaseHeat();
  else if(recipe.phase===0&&!d.chopped&&Math.hypot(p.x-d.start.x,p.y-d.start.y)<18)chop(p);
  else if(recipe.phase===3&&d.topping!==undefined){selected=+d.topping;if(Math.hypot(p.x-d.start.x,p.y-d.start.y)>8)plate(selected,p);else feedback('Berry selected. Tap the dish near an empty glow.');}
  // A tap on a garnish button has the same exact target as its keyboard action.
  // Freehand drops still receive the normal positional accuracy score.
  else if(recipe.phase===3&&Math.hypot(p.x-d.start.x,p.y-d.start.y)<=16)plate(selected,d.target!==undefined?targets[+d.target]:p);
 });
 for(const type of ['pointercancel','lostpointercapture'])ctl.on(host,type,e=>{if(drag?.id===e.pointerId||assistPointer===e.pointerId)cancel();});
 ctl.on(host,'click',e=>{
  if(recipe.transition||ctl.isPaused())return;const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-finish-plate')){finishStation(recipe.plateScores.reduce((a,b)=>a+b,0)/3);return;}
  if(b.hasAttribute('data-spread-help')){const p=spreadPatches.find(p=>p.value<1);if(p)spread(p.x,p.y,.5);return;}
  if(b.hasAttribute('data-retry-station')){cancel();recipe.practice=true;recipe.started=false;recipe.left=limits[recipe.phase];recipe.penalties=0;if(recipe.phase===0){recipe.chops=0;recipe.sliced.clear();recipe.cutScores=[];}if(recipe.phase===1){recipe.stir=0;recipe.stirGood=0;recipe.stirTravel=0;turns=0;lap=0;spreadPatches.forEach(p=>p.value=0);}if(recipe.phase===2)recipe.heat=0;if(recipe.phase===3){recipe.plated.clear();recipe.occupied.clear();recipe.toppings={};recipe.plateScores=[];}draw();return;}
  if(b.dataset.plateTarget!==undefined&&e.detail===0){start();plate(selected,targets[+b.dataset.plateTarget]);}
  else if(b.dataset.topping!==undefined&&e.detail===0){selected=+b.dataset.topping;feedback('Berry '+(selected+1)+' selected. Choose a ring.');}
  else if(b.dataset.slice!==undefined&&e.detail===0)chop();
 });
 ctl.on(host,'keydown',e=>{
  if(e.repeat||recipe.transition||ctl.isPaused())return;
  const stirControl=e.target===host||e.target.hasAttribute('data-cook-assist');
  if(recipe.phase===1&&!toast&&stirControl&&['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();start();keyStir=e.key==='ArrowLeft'?-1:1;}
  if(e.target.hasAttribute('data-heat')&&[' ','Enter'].includes(e.key)){e.preventDefault();start();holdHeat();}
 });
 ctl.on(window,'keyup',e=>{if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){keyStir=0;if(recipe.held)releaseHeat();}});
 ctl.on(window,'blur',cancel);ctl.on(host,'focusout',e=>{if(!host.contains(e.relatedTarget)){keyStir=0;if(recipe.held)cancel();}});
 ctl.on(document,'visibilitychange',()=>{if(document.hidden)cancel();});
 ctl.on(host,'toy-pause',cancel);
 ctl.loop(dt=>{
  if(recipe.phase===1&&!toast){const delta=Math.atan2(Math.sin(recipe.angle-spoonAngle),Math.cos(recipe.angle-spoonAngle));spoonAngle+=delta*(1-Math.exp(-28*dt));placeSpoon();}
  clockTime+=dt;if(splashLeft>0){splashLeft-=dt;if(splashLeft<=0)delete host.dataset.splash;}
  if(chopCooldown&&performance.now()>=chopCooldown){chopCooldown=0;if(recipe.phase===0&&!recipe.transition){placeKnife();host.querySelector('.chop-hint').textContent='TAP TO CHOP';host.querySelectorAll('[data-slice]').forEach((b,i)=>b.classList.toggle('next-cut',i===Math.floor(recipe.chops/2)));}}
  if(recipe.transition){recipe.transition-=dt;if(recipe.transition<=0){recipe.transition=0;recipe.phase++;recipe.left=limits[recipe.phase]||0;draw();}return;}
  if(recipe.phase===4)return;
  host.querySelector('.chop-meter b')?.style.setProperty('left',(50+Math.sin(clockTime*2.2)*47)+'%');
  if(!recipe.started)return;
  recipe.left=Math.max(0,recipe.left-dt);host.querySelector('[data-recipe-time]').textContent=Math.ceil(recipe.left)+'s';
  host.dataset.urgent=String(recipe.left<5);
  if(recipe.phase===1&&keyStir)stir(keyStir*dt*2.2,1);
  if(recipe.phase===2){recipe.heat=recipe.held?heldTemperature():Math.max(0,recipe.heat-.08*dt);host.querySelector('.heat-level').style.left=recipe.heat*100+'%';host.querySelector('.recipe-pot').classList.toggle('simmer',recipe.heat>.5);host.querySelector('[data-recipe-detail]').textContent=recipe.heat<.55?'warming…':recipe.heat<.665?'almost…':recipe.heat<=.735?'RELEASE!':'too hot!';if(recipe.heat>=1)finishStation(15);}
  if(recipe.left===0&&!recipe.transition){const partial=recipe.phase===0?recipe.chops/6*100-recipe.penalties:recipe.phase===1?Math.min(1,recipe.stir/(Math.PI*6))*100:recipe.phase===3?recipe.plateScores.reduce((a,b)=>a+b,0)/3:0;finishStation(Math.min(60,partial));}
 });
 draw();return {...ctl,snapshot:()=>({...recipe,sliced:[...recipe.sliced],plated:[...recipe.plated]})};
}
