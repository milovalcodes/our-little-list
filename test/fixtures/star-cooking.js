// Interim code-drawn pixel icons for the newer kitchen ingredients, tools and
// dishes. One 12x12 grid per icon on the shared palette; replaced by authored
// art when it arrives. Rows are drawn left to right, '.' is transparent.
const KITCHEN_PALETTE={k:'#20182e',w:'#fff7ea',y:'#f4c85b',Y:'#dca142',o:'#da9364',O:'#b17730',r:'#d57867',g:'#81a38a',G:'#577769',b:'#86c5cf',B:'#5b98a6',p:'#c9b8eb',P:'#8947b0',n:'#a97563',N:'#74504e',s:'#c3d5ec',S:'#6a84ae',c:'#efd0a6',d:'#2e3a3a'};
const PIXEL_ICONS={
 egg:['....kkkk....','...kwwwwk...','..kwwwwwwk..','..kwwwwwwk..','.kwwwwwwwwk.','.kwwwwwwwsk.','.kwwwwwwwsk.','.kwwwwwwssk.','..kwwwwssk..','..kkwssskk..','....kkkk....'],
 yolk:['............','...kkkkk....','..kwwwwwkk..','.kwwwwwwwwk.','.kwwkkkwwwk.','kwwkyyykwwk.','kwwkyYykwwwk','.kwwkkkwwwk.','.kwwwwwwwk..','..kkwwwkk...','....kkk.....'],
 whisk:['....kkk.....','...ksssk....','..ksk.ksk...','..ks...sk...','..ksk.ksk...','...ksssk....','....ksk.....','....kNk.....','....kNk.....','....kNk.....','....kkk.....'],
 batter:['............','............','.kkkkkkkkkk.','kccccccccccck','kwcccccccccwk','.kpwwwwwwwpk.','.kppppppppk.','..kppppppk..','...kkkkkk...'],
 pan:['............','...kkkkk....','..kSSSSSk...','.kSssssSSk..','.kSssssSSkkk','.kSssssSSkNN','.kSssssSSkkk','..kSSSSSk...','...kkkkk....'],
 pancake:['............','............','...kkkkkk...','..kyyyyyyk..','.kyyYyyyyyk.','.kyyyyyYyyk.','.kYyyyyyyyk.','..kyyyyYyk..','...kkkkkk...'],
 pancakes:['............','...kk.kk....','..kPPkPPk...','..kkkkkkkk..','.kyyyyyyyyk.','.kYYYYYYYYk.','.kyyyyyyyyk.','.kYYYYYYYYk.','kSssssssssSk','.kkkkkkkkkk.'],
 jug:['...kkkkk....','..kwwwwwk...','.kkwccccwkk.','kk.kccccck.k','k..kccccck.k','kk.kccccckk.','..kccccck...','..kkkkkkk...'],
 carrot:['.......gg...','......gGg...','.....kkg....','....kook....','...kook.....','...kook.....','..kook......','..kok.......','.kok........','.kk.........'],
 'carrot-cut':['............','..kkk..kkk..','.kooOkkooOk.','.koOOkkoOOk.','..kkk..kkk..','....kkk.....','...kooOk....','...koOOk....','....kkk.....'],
 potato:['............','...kkkkk....','..knnnnnkk..','.knnNnnnnnk.','.knnnnnNnnk.','.knNnnnnnnk.','..knnnnNnk..','...kkkkkk...'],
 herb:['.....kk.....','....kgGk....','...kggGgk...','...kgGggk...','....kgGk....','.....kG.....','.....kG.....'],
 ladle:['.........kk.','........kSk.','.......kSk..','......kSk...','.....kSk....','.kkkkSk.....','kssssk......','kssssk......','.kkkk.......'],
 rice:['............','..k.k..k.k..','.kwkwkkwkwk.','kwwwwwwwwwwk','kBBBBBBBBBBk','.kBbbbbbbBk.','..kBBBBBBk..','...kkkkkk...'],
 seaweed:['..kkkkkkkk..','..kddddddk..','..kdGddddk..','..kddddGdk..','..kddddddk..','..kdGddddk..','..kddddddk..','..kkkkkkkk..'],
 riceball:['.....kk.....','....kwwk....','...kwwwwk...','...kwwwwk...','..kwwwwwwk..','..kwwwwwwk..','.kwwwwwwwwk.','.kwwwwwwwwk.','kkkkkkkkkkkk'],
 onigiri:['.....kk.....','....kwwk....','...kwwwwk...','...kwwwwk...','..kwwwwwwk..','..kwwwwwwk..','.kwwddddwwk.','.kwwddddwwk.','kkkkddddkkkk'],
 stew:['............','..k.ok.gk...','.koooOoGook.','kkkkkkkkkkkk','kBbbbbbbbbBk','.kBbbbbbbBk.','..kBBBBBBk..','...kkkkkk...'],
 flour:['...kkkkk....','...kwkwk....','..kwwwwwk...','.kwwwwwwwk..','.kwwPPwwwk..','.kwwPPwwwk..','.kwwwwwwwk..','..kkkkkkk...'],
 cream:['....kkk.....','....kbk.....','...kwwwk....','..kwwwwwk...','..kwbbbwk...','..kwwwwwk...','..kwwwwwk...','...kkkkk....'],
 bread:['............','..kkkkkkk...','.kYyyyyyyk..','kYyyyyyyyyk.','kYcccccccYk.','kYcccccccYk.','.kkkkkkkkk..'],
 berries:['....g.g.....','...kgkgk....','..kPkkPk....','.kPPpkPPk...','.kPPPkPPPk..','..kkk.kkk...']
};
function pixelIcon(name,cls='pixel-icon'){
 const grid=PIXEL_ICONS[name];if(!grid)return '';let rects='';
 grid.forEach((row,y)=>[...row].forEach((c,x)=>{if(KITCHEN_PALETTE[c])rects+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+KITCHEN_PALETTE[c]+'"/>';}));
 return '<svg class="'+cls+' pixel-'+name+'" viewBox="0 0 12 12" aria-hidden="true" shape-rendering="crispEdges">'+rects+'</svg>';
}
// Station rules shared by every recipe. Names are short labels for the ticket.
const STATION_NAMES={chop:'cut',stir:'stir',spread:'spread',heat:'heat',top:'top',crack:'crack',whisk:'whisk',pour:'pour',flip:'flip',add:'add',ladle:'serve',rinse:'rinse',shape:'shape',wrap:'wrap'};
// Timing helpers return 0..100 from a distance to the sweet spot, gently.
const timingScore=(distance,grace=.06,slope=220)=>Math.round(Math.max(0,Math.min(100,100-Math.max(0,distance-grace)*slope)));

// Station play is disposable. Only the engine can settle a finished batch.
function mountStarCooking(host,ctx){
 const toast=ctx.recipe==='toast',stations=ctx.stations||(toast?['chop','spread','heat','top']:['chop','stir','heat','top']),total=stations.length;
 const dishId=ctx.dish||(toast?'toast':'porridge'),dishName=ctx.recipeName||(toast?'sunbeam berry toast':'moonberry porridge');
 const ctl=toyController(host,{practice:()=>recipe.practice}),fx=starFx(host),sprite=ctx.sprite,limits=stations.map(()=>20),names=stations.map(k=>STATION_NAMES[k]||k);
 const recipe={phase:0,started:false,left:20,sliced:new Set(),chops:0,cutScores:[],stir:0,stirGood:0,stirTravel:0,angle:0,heat:0,held:false,plated:new Set(),occupied:new Set(),toppings:{},plateScores:[],grades:[],penalties:0,quality:0,score:0,transition:0,practice:!!ctx.practice,crackAt:0,flipLevel:0,order:[],added:0,addMisses:0,scoops:0,holding:false,clear:0,beats:[],beatAt:0,wrapped:null};
 const rand=ctx.random||Math.random,jitter=n=>Math.round((rand()*2-1)*n),targets=[{x:132+jitter(6),y:142+jitter(4)},{x:184+jitter(6),y:142+jitter(4)},{x:158+jitter(6),y:162+jitter(3)}],heatTarget=.62+rand()*.16,pourTarget=.62+rand()*.16;
 const kind=()=>stations[recipe.phase],finished=()=>recipe.phase>=total;
 const stirKind=()=>kind()==='stir'||kind()==='whisk',holdKind=()=>kind()==='heat'||kind()==='pour',circles=()=>kind()==='whisk'?5:3,holdTarget=()=>kind()==='pour'?pourTarget:heatTarget;
 const tapKinds=new Set(['crack','flip','shape','add','ladle']),wrapTarget={x:160,y:150};
 // Toast has a broad bread surface now. Keep the spread hit regions on that
 // surface, aligned with the nine contiguous sections of the jam artwork.
 const spreadPatches=Array.from({length:9},(_,i)=>({x:123+i%3*37,y:121+Math.floor(i/3)*37,value:0}));
 let drag=null,previous=null,keyStir=0,assistPointer=null,selected=0,clockTime=0,splashLeft=0,chopCooldown=0,lap=0,turns=0,heatHeldAt=0,heatStart=0,spoonAngle=0;
 const clampScore=n=>Math.round(Math.max(0,Math.min(100,n)));
 const feedback=t=>{const el=host.querySelector('.recipe-feedback');if(el)el.textContent=t;};
 const big=name=>pixelIcon(name,'kitchen-pixel big-pixel'),small=name=>pixelIcon(name,'kitchen-pixel');
 // Reveal adjoining sections of ONE authored smear, not separate square fills.
 const jam=()=>'<span class="toast-jam" aria-hidden="true">'+spreadPatches.map((p,i)=>'<i data-jam="'+i+'" style="opacity:'+p.value+';background-position:'+(i%3*50)+'% '+(Math.floor(i/3)*50)+'%"></i>').join('')+'</span>';
 const pot=()=>'<span class="recipe-pot">'+(toast?ctx.foodSprite('toast')+jam():sprite('pot'))+'</span>';
 const dish=()=>toast?ctx.foodSprite('toast')+jam():dishId==='porridge'?sprite('bowl'):big(dishId);
 const chopArt=cut=>dishId==='stew'?small(cut?'carrot-cut':'carrot'):sprite(cut?'sliced':'berry');
 const titles={chop:dishId==='stew'?'Chop the comet carrots':'Chop the moonberries',stir:'Stir three full circles',whisk:'Whisk five happy circles',spread:'Spread from edge to edge',heat:'Stop at the perfect temperature',pour:'Pour to the gold line',flip:'Flip when it turns golden',crack:'Crack the egg in the middle',add:'Add them in order',ladle:'Ladle three scoops',rinse:'Swish the rice until clear',shape:'Press on the beat',wrap:'Wrap the seaweed',top:'Garnish your '+dishName};
 const areas={chop:'Cutting station',stir:'Stirring station',whisk:'Whisking station',spread:'Spreading station',heat:'Cooking station',pour:'Pouring station',flip:'Flipping station',crack:'Egg station',add:'Ingredient station',ladle:'Serving station',rinse:'Rinsing station',shape:'Shaping station',wrap:'Wrapping station',top:'Topping station'};
 function draw(){
  const phase=recipe.phase,station=kind();
  // Scenes follow the kind of work (board, stove, serving table), so the
  // classic four-station layouts apply to every recipe.
  const scene={chop:0,crack:0,rinse:0,shape:0,stir:1,whisk:1,spread:1,add:1,heat:2,pour:2,flip:2,top:3,wrap:3,ladle:3}[station]??3;
  host.dataset.station=finished()?4:phase;host.dataset.stationKind=station||'done';
  host.dataset.recipe=dishId;
  host.innerHTML='<div class="recipe-heading"><span>'+(recipe.practice?'PRACTICE':'YOUR RECIPE')+' <b>'+dishName+'</b></span><span class="recipe-ticket">'+(finished()?'READY':(phase+1)+' / '+total)+'</span></div>'+
   '<ol class="recipe-stations" aria-label="Recipe progress" style="--station-count:'+total+'">'+names.map((n,i)=>'<li data-state="'+(phase>i?'done':phase===i?'active':'next')+'" '+(phase===i?'aria-current="step"':'')+'><span>'+(phase>i?recipe.grades[i]+'%':i+1)+'</span>'+n+'</li>').join('')+'</ol>'+
   '<h4 class="recipe-title">'+(finished()?'Your kitchen report':titles[station])+'</h4>'+
   '<div class="recipe-worktop" data-recipe-phase="'+(finished()?4:scene)+'" role="group" aria-label="'+(finished()?'Finished dish':areas[station])+'"></div>'+
   '<div class="recipe-clock"><span data-recipe-time>'+(finished()?'':'no rush · take your time')+'</span><span data-recipe-detail></span></div><div class="recipe-feedback" role="status"></div><div class="recipe-access"></div>';
  const stage=host.querySelector('.recipe-worktop'),access=host.querySelector('.recipe-access');
  if(station==='chop'){
   stage.innerHTML='<span class="recipe-board" aria-hidden="true"><i></i><i></i><i></i></span>'+[0,1,2].map(i=>'<button type="button" class="recipe-berry" data-slice="'+i+'" style="left:'+(21+i*26)+'%" aria-label="Chop: tap twice each">'+chopArt(false)+'<i class="cut-guide"></i></button>').join('')+'<span class="recipe-knife">'+sprite('knife')+'</span><span class="chop-count">0 / 6 chops</span><span class="chop-hint">TAP TO CHOP</span>';
   host.querySelector('[data-slice="0"]').classList.add('next-cut');placeKnife();
   feedback('Tap each glowing piece twice.');
  }else if(station==='spread'){
   stage.innerHTML=pot()+spreadPatches.map((p,i)=>'<span class="spread-patch" data-spread="'+i+'" style="left:'+p.x/3.2+'%;top:'+p.y/2.5+'%"></span>').join('')+'<span class="spread-knife">'+sprite('knife')+'</span><span class="stir-count">0% covered</span>';
   access.innerHTML='<button type="button" data-spread-help>spread · Enter</button>';feedback('Spread the jam across the toast.');
  }else if(station==='stir'){
   stage.innerHTML=pot()+'<span class="stir-path" aria-hidden="true"></span><span class="recipe-spoon">'+sprite('spoon')+'</span><span class="recipe-pot pot-front">'+sprite('pot')+'</span><span class="stir-count">0 / 3</span><span class="stir-ripple"></span><span class="cook-splash" aria-hidden="true"><i></i><i></i><i></i></span><div class="stir-progress" role="progressbar" aria-label="Stirring circles" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>';
   access.innerHTML='<button type="button" data-cook-assist>hold to stir · ← / →</button>';
   feedback('Stir three circles inside the pot.');placeSpoon();
  }else if(station==='whisk'){
   stage.innerHTML='<span class="recipe-pot">'+big('batter')+'</span><span class="stir-path" aria-hidden="true"></span><span class="recipe-spoon whisk-tool">'+small('whisk')+'</span><span class="stir-count">0 / 5</span><span class="stir-ripple"></span><div class="stir-progress" role="progressbar" aria-label="Whisking circles" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>';
   access.innerHTML='<button type="button" data-cook-assist>hold to whisk · ← / →</button>';
   feedback('Whisk round and round. Any speed is fine.');placeSpoon();
  }else if(station==='heat'||station==='pour'){
   const target=station==='pour'?pourTarget:heatTarget;
   stage.innerHTML=(station==='pour'?'<span class="recipe-pot">'+big('pan')+'</span><span class="pour-jug">'+small('jug')+'</span>':pot()+'<span class="heat-steam" aria-hidden="true"><i></i><i></i><i></i></span>')+'<div class="heat-track"><span class="heat-good" style="left:'+((target-.14)*100).toFixed(1)+'%"></span><i class="heat-level"></i></div><button type="button" class="heat-button" data-heat>'+(station==='pour'?'hold to pour':'hold to warm')+'</button>';
   feedback(station==='pour'?'Let go on the bright gold line.':'Release in the gold center.');
  }else if(station==='top'){
   stage.innerHTML='<span class="ingredient-tray" aria-hidden="true"></span><span class="recipe-bowl">'+dish()+'</span>'+targets.map((p,i)=>'<button type="button" class="topping-target" data-plate-target="'+i+'" style="left:'+p.x/3.2+'%;top:'+p.y/2.5+'%" aria-label="Place selected berry on empty garnish spot '+(i+1)+'"></button>').join('')+
    [0,1,2].map(i=>'<button type="button" class="topping" data-topping="'+i+'" style="left:'+(17+i*28)+'%;top:18%" aria-pressed="false" aria-label="Pick up berry topping '+(i+1)+'">'+sprite('sliced')+'</button>').join('')+'<span class="plate-order">3 berries · spread them evenly</span>';
   access.innerHTML='<button type="button" class="main-button" data-finish-plate disabled>serve this plate</button>';
   feedback('Place berries on the glowing spots.');
  }else if(station==='crack'){
   stage.innerHTML='<span class="cook-center" data-crack-egg>'+big('egg')+'</span><div class="timing-bar"><span class="timing-good"></span><i class="timing-marker"></i></div><button type="button" class="heat-button" data-crack>crack!</button>';
   feedback('Tap when the marker reaches the middle.');
  }else if(station==='flip'){
   recipe.started=true;
   stage.innerHTML='<span class="recipe-pot">'+big('pan')+'<span class="flip-cake">'+small('pancake')+'</span></span><span class="heat-steam" aria-hidden="true"><i></i><i></i><i></i></span><div class="heat-track"><span class="heat-good" style="left:56%"></span><i class="heat-level"></i></div><button type="button" class="heat-button" data-flip>flip!</button>';
   feedback('Watch the colour. Flip when it is golden.');
  }else if(station==='add'){
   if(!recipe.order.length){const pool=['carrot-cut','potato','herb'];recipe.order=pool.map(v=>[rand(),v]).sort((a,b)=>a[0]-b[0]).map(v=>v[1]);}
   const tray=['herb','carrot-cut','potato'];
   stage.innerHTML='<span class="recipe-pot">'+sprite('pot')+'</span><div class="add-ticket" aria-label="Order">'+recipe.order.map((n,i)=>'<span data-order-step="'+i+'" class="'+(i<recipe.added?'done':'')+'">'+small(n)+'</span>').join('')+'</div><div class="add-tray">'+tray.map(n=>'<button type="button" data-add="'+n+'" aria-label="Add '+n.replace('-cut','')+'">'+small(n)+'</button>').join('')+'</div>';
   feedback('Follow the ticket, left to right.');
  }else if(station==='ladle'){
   stage.innerHTML='<button type="button" class="ladle-pot" data-scoop aria-label="Scoop from the pot">'+sprite('pot')+'</button><span class="ladle-tool">'+small('ladle')+'</span><button type="button" class="ladle-bowl" data-serve-scoop aria-label="Pour into the bowl">'+big('stew')+'<i class="bowl-fill" style="--fill:0"></i></button><span class="stir-count">0 / 3</span>';
   feedback('Scoop from the pot, then pour into the bowl.');
  }else if(station==='rinse'){
   stage.innerHTML='<span class="recipe-pot rinse-bowl">'+big('rice')+'<i class="rinse-cloud" style="opacity:1"></i></span><span class="stir-count">0% clear</span>';
   access.innerHTML='<button type="button" data-rinse-help>swish · Enter</button>';
   feedback('Swish your finger through the water.');
  }else if(station==='shape'){
   recipe.started=true;
   stage.innerHTML='<span class="cook-center shape-ball">'+big('riceball')+'<i class="beat-ring"></i></span><span class="stir-count">0 / 4</span><button type="button" class="heat-button" data-press>press</button>';
   feedback('Press when the ring meets the rice.');
  }else if(station==='wrap'){
   stage.innerHTML='<span class="recipe-bowl wrap-ball">'+big('riceball')+'</span><span class="wrap-target" style="left:'+wrapTarget.x/3.2+'%;top:'+wrapTarget.y/2.5+'%"></span><button type="button" class="topping wrap-sheet" data-wrap style="left:18%;top:16%" aria-label="Place the seaweed">'+small('seaweed')+'</button>';
   feedback('Drag the seaweed onto the rice ball.');
  }else{
   recipe.score=Math.floor(recipe.grades.reduce((a,b)=>a+b,0)/total);const stars=recipe.score>=90?3:recipe.score>=70?2:1;
   const reward=!recipe.practice&&ctx.reward?ctx.reward(recipe.score):cookingReward(recipe.score);recipe.quality=reward.portions;
   host.querySelector('[data-recipe-time]').textContent=recipe.practice?'PRACTICE SCORE · '+recipe.score+'%':recipe.score>(ctx.bestScore||0)?'NEW PERSONAL BEST!':'YOUR BEST · '+Math.max(ctx.bestScore||0,recipe.score)+'%';
   // Keep exactly the bowl and topping positions the player created. A result
   // garnish is not a button: give it its own absolute, fixed-size layer.
   stage.innerHTML='<span class="recipe-bowl">'+dish()+'</span>'+Object.entries(recipe.toppings).map(([i,p])=>'<span class="served-topping" style="left:'+(p.x-16)/3.2+'%;top:'+(p.y-16)/2.5+'%">'+sprite('sliced')+'</span>').join('')+(ctx.pet?'<span class="taste-pet">'+ctx.pet+'</span>':'')+'<span class="recipe-stars">'+reward.label+' · '+recipe.score+'%</span><span class="result-stars" aria-label="'+stars+' of 3 stars">'+'★'.repeat(stars)+'<i>'+'★'.repeat(3-stars)+'</i></span>';
   access.innerHTML='<button type="button" class="main-button" data-serve-cook>'+(recipe.practice?'finish practice':'collect '+reward.portions+' meal'+(reward.portions===1?'':'s'))+'</button><button type="button" data-cook-again>'+(recipe.practice?'practice again':'collect & cook again')+'</button>';
   feedback(recipe.practice?'Practice':ctx.rewardText?.(recipe.score)||'');
   ctx.complete({score:recipe.score,grades:[...recipe.grades],quality:recipe.quality,practice:recipe.practice});
   ctx.fx?.(stars===3?'clear':'match');fx.burst(stage.querySelector('.recipe-bowl'),{count:8+stars*4,tone:['gold','cream','pink'],glyph:'✦',spread:70});if(stars===3)fx.banner(reward.label);
   const taster=stage.querySelector('.taste-pet');if(taster)ctl.later(()=>{ctx.fx?.('slurp');fx.burst(taster,{count:6+stars*2,tone:['pink','cream'],glyph:'♥',spread:40});},650);
  }
  if(!finished())access.insertAdjacentHTML('beforeend','<button type="button" data-retry-station>'+(recipe.practice?'retry station':'retry without rewards')+'</button>');
  ctl.animate(stage,[{opacity:0,translate:'18px 0'},{opacity:1,translate:'0 0'}],240);
  // Replacing a station removes its focused control. Put keyboard users on
  // the next real action, rather than dropping focus back to the page body.
  (stage.querySelector('button:not(:disabled)')||access.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
 }
 function start(){if(finished()||recipe.transition)return false;recipe.started=true;return true;}
 function finishStation(score){
  if(recipe.transition||finished())return;
  recipe.grades[recipe.phase]=clampScore(score);recipe.transition=.85;recipe.started=false;recipe.held=false;keyStir=0;assistPointer=null;drag=null;previous=null;
  feedback(names[recipe.phase]+' · '+recipe.grades[recipe.phase]+'%');
  host.querySelector('.recipe-worktop').insertAdjacentHTML('beforeend','<div class="station-grade">'+recipe.grades[recipe.phase]+'%<small>'+names[recipe.phase]+' complete</small></div>');
  ctl.animate(host.querySelector('.station-grade'),[{opacity:0,translate:'0 8px'},{opacity:1,translate:'0 0'}],180);
  const grade=recipe.grades[recipe.phase];recipe.perfectRun=grade>=95?(recipe.perfectRun||0)+1:0;if(recipe.perfectRun>=2)fx.text(host.querySelector('.station-grade'),'perfect ×'+recipe.perfectRun,'mint');ctx.fx?.(grade>=90?'match':'plate');fx.burst(host.querySelector('.station-grade'),{count:grade>=90?12:6,tone:grade>=90?['gold','cream']:'cream',glyph:grade>=90?'✦':'',spread:50});
 }
 function slice(i,score){
  if(kind()!=='chop'||recipe.transition||recipe.sliced.has(i))return;
  recipe.sliced.add(i);recipe.cutScores.push(clampScore(score));const b=host.querySelector('[data-slice="'+i+'"]');b.innerHTML=chopArt(true);b.classList.add('cut');ctx.beep(i);
  if(recipe.sliced.size===3)finishStation(recipe.cutScores.reduce((a,b)=>a+b,0)/3-recipe.penalties);
 }
 function placeKnife(){const knife=host.querySelector('.recipe-knife');if(knife){const from=knife.style.left;knife.style.left=(26+Math.min(2,Math.floor(recipe.chops/2))*26)+'%';knife.style.top='10%';if(from&&from!==knife.style.left)ctl.animate(knife,[{left:from},{left:knife.style.left}],130);}}
 function chop(point){
  if(kind()!=='chop'||recipe.transition||performance.now()<chopCooldown)return;
  // Input debounce must not stretch with a throttled or dropped render frame.
  const i=Math.floor(recipe.chops/2),center={x:92+i*83.2,y:132.5};start();
  if(point&&Math.hypot((point.x-center.x),(.7*(point.y-center.y)))>34){feedback('Aim for the glowing piece.');fx.ring(center,'cream');return;}
  placeKnife();recipe.chops++;chopCooldown=performance.now()+200;
  const knife=host.querySelector('.recipe-knife');knife.classList.remove('chopping');void knife.offsetWidth;knife.classList.add('chopping');
  const berry=host.querySelector('[data-slice="'+i+'"]');berry.classList.add('nicked');ctx.beep(i);
  host.querySelector('.chop-count').textContent=recipe.chops+' / 6 chops';
  host.querySelector('.chop-hint').textContent='CHOP!';
  feedback(recipe.chops+' / 6 · '+(recipe.chops===6?'All sliced!':'Good cut. Follow the glow.'));ctx.fx?.('cut');fx.burst(center,{count:5,tone:dishId==='stew'?['gold','cream']:['lilac','pink','cream'],spread:22});
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
  if(recipe.transition||!stirKind())return;
  // Pointer samples already reject implausible jumps. A held control must
  // integrate elapsed time, even when a phone renders only a few frames/sec.
  const amount=delta,goal=circles();lap+=amount;
  // A sub-pixel gap at the end of a circle should not demand another lap.
  if(Math.abs(lap)>=Math.PI*2-.02){turns++;lap=Math.sign(lap)*Math.max(0,Math.abs(lap)-Math.PI*2);ctx.beep(turns%4);ctx.fx?.('bubble');fx.burst({x:160,y:104},{count:6,tone:['cream','mint'],glyph:'○',spread:30});}
  recipe.stir=turns*Math.PI*2+Math.abs(lap);recipe.stirGood+=Math.abs(amount)*quality;recipe.stirTravel+=Math.abs(amount);
  recipe.angle+=amount;
  const progress=turns>=goal?100:Math.min(99,recipe.stir/(Math.PI*2*goal)*100),meter=host.querySelector('.stir-progress');
  meter.setAttribute('aria-valuenow',Math.round(progress));meter.firstElementChild.style.width=progress+'%';
  host.querySelector('.stir-count').textContent=Math.min(goal,Math.floor(recipe.stir/(Math.PI*2)))+' / '+goal+' · '+Math.round(progress)+'%';
  feedback(turns?turns+' / '+goal+' circles':kind()==='whisk'?'Whisk in circles':'Stir in circles');
  if(turns>=goal)finishStation(100*recipe.stirGood/Math.max(.001,recipe.stirTravel));
 }
 function holdHeat(){recipe.held=true;heatHeldAt=performance.now();heatStart=recipe.heat;}
 const heldTemperature=()=>Math.min(1,heatStart+(performance.now()-heatHeldAt)*.00019);
 function releaseHeat(){
  if(!recipe.held||!holdKind())return;recipe.heat=heldTemperature();recipe.held=false;
  if(recipe.heat<.45){feedback(kind()==='pour'?'Keep pouring. Hold again.':'Still cool. Hold again to keep warming.');return;}
  finishStation(100-Math.max(0,Math.abs(recipe.heat-holdTarget())-.05)*160);
 }
 function spread(x,y,amount){
  if(recipe.transition||kind()!=='spread')return;start();
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
  if(kind()!=='top'||recipe.transition)return;
  const old=recipe.toppings[i],occupied=new Set(Object.entries(recipe.toppings).filter(([key])=>Number(key)!==i).map(([,v])=>v.target));
  const placement=garnishPlacement(p,targets.map((t,n)=>({...t,n})).filter(t=>!occupied.has(t.n)));
  const b=host.querySelector('[data-topping="'+i+'"]'),from={left:b.style.left,top:b.style.top};
  const settle=()=>ctl.animate(b,[from,{left:b.style.left,top:b.style.top}],150);
  if(!placement){b.style.left=old?(old.x-16)/3.2+'%':(17+i*28)+'%';b.style.top=old?(old.y-16)/2.5+'%':'18%';settle();feedback('Aim inside the dish. Nothing lost — try again.');return;}
  recipe.plateScores[i]=placement.score;recipe.plated.add(i);recipe.toppings[i]=placement;b.style.left=(placement.x-16)/3.2+'%';b.style.top=(placement.y-16)/2.5+'%';b.classList.add('plated');fx.burst({x:placement.x,y:placement.y},{count:placement.score>=90?8:4,tone:['gold','cream'],spread:20});
  recipe.occupied=new Set(Object.values(recipe.toppings).map(p=>p.target));host.querySelectorAll('[data-plate-target]').forEach((el,n)=>{el.classList.toggle('placed',recipe.occupied.has(n));el.disabled=recipe.occupied.has(n);});ctx.fx?.('plate');
  settle();selected=[0,1,2].find(n=>!recipe.plated.has(n))??i;host.querySelectorAll('[data-topping]').forEach(el=>el.setAttribute('aria-pressed',String(+el.dataset.topping===selected)));feedback(placement.score+'% placement · '+recipe.plated.size+' / 3 berries'+(recipe.plated.size===3?' · adjust, or serve when happy.':''));
  host.querySelector('[data-finish-plate]').disabled=recipe.plated.size!==3;
 }
 // ---- Newer stations: short, tactile, forgiving. ----
 const crackPosition=()=>.5+.46*Math.sin(recipe.crackAt*2.2);
 function crack(){
  if(kind()!=='crack'||recipe.transition)return;start();
  const score=timingScore(Math.abs(crackPosition()-.5),.06,220),egg=host.querySelector('[data-crack-egg]');
  if(egg)egg.innerHTML=big('yolk');ctx.fx?.('cut');fx.burst(egg,{count:8,tone:['cream','gold'],spread:30});
  finishStation(score);
 }
 function flip(){
  if(kind()!=='flip'||recipe.transition)return;
  const score=timingScore(Math.abs(recipe.flipLevel-.7),.05,160),cake=host.querySelector('.flip-cake');
  ctl.animate(cake,[{translate:'0 0',scale:'1 1'},{translate:'0 -30px',scale:'1 -1',offset:.5},{translate:'0 0',scale:'1 1'}],420);ctx.fx?.('whoosh');fx.burst(cake,{count:6,tone:['gold','cream'],spread:26});
  finishStation(score);
 }
 function addIngredient(name){
  if(kind()!=='add'||recipe.transition)return;start();
  const button=host.querySelector('[data-add="'+name+'"]');
  if(name!==recipe.order[recipe.added]){recipe.addMisses++;ctx.fx?.('miss');fx.shake(button);feedback('Not yet. Check the ticket.');return;}
  recipe.added++;host.querySelector('[data-order-step="'+(recipe.added-1)+'"]')?.classList.add('done');ctx.fx?.('plate');fx.burst(host.querySelector('.recipe-pot'),{count:6,tone:['cream','gold'],spread:28});
  ctl.animate(button,[{translate:'0 0'},{translate:'0 -12px',offset:.4},{translate:'0 0'}],260);
  feedback(recipe.added+' / 3 in the pot');
  if(recipe.added===recipe.order.length)finishStation(Math.max(60,100-recipe.addMisses*10));
 }
 function scoop(){
  if(kind()!=='ladle'||recipe.transition)return;start();
  if(recipe.holding){feedback('Pour that scoop into the bowl first.');return;}
  recipe.holding=true;host.dataset.holding='true';ctx.fx?.('bubble');fx.text(host.querySelector('.ladle-pot'),'scoop!','cream');feedback('Now pour it into the bowl.');
 }
 function serveScoop(){
  if(kind()!=='ladle'||recipe.transition)return;
  if(!recipe.holding){feedback('Scoop from the pot first.');return;}
  recipe.holding=false;delete host.dataset.holding;recipe.scoops++;const bowl=host.querySelector('.ladle-bowl');
  bowl.querySelector('.bowl-fill')?.style.setProperty('--fill',recipe.scoops/3);ctx.fx?.('plate');fx.burst(bowl,{count:6,tone:['gold','cream'],spread:26});
  host.querySelector('.stir-count').textContent=recipe.scoops+' / 3';feedback(recipe.scoops+' / 3 scoops');
  if(recipe.scoops>=3)finishStation(100);
 }
 function rinse(amount){
  if(kind()!=='rinse'||recipe.transition)return;start();
  const before=recipe.clear;recipe.clear=Math.min(1,recipe.clear+amount);
  const cloud=host.querySelector('.rinse-cloud');if(cloud)cloud.style.opacity=String(1-recipe.clear);
  host.querySelector('.stir-count').textContent=Math.round(recipe.clear*100)+'% clear';
  if(Math.floor(before*5)!==Math.floor(recipe.clear*5)){ctx.fx?.('bubble');fx.burst({x:160,y:120},{count:4,tone:['cream','mint'],glyph:'○',spread:30});}
  if(recipe.clear>=1)finishStation(100);
 }
 const beatPhase=()=>(recipe.beatAt%.9)/.9;
 function press(){
  if(kind()!=='shape'||recipe.transition)return;
  const phase=beatPhase(),score=timingScore(Math.min(phase,1-phase),.08,250);recipe.beats.push(score);
  const ball=host.querySelector('.shape-ball');ctl.animate(ball,[{scale:'1 1'},{scale:'1.12 .88',offset:.35},{scale:'1 1'}],200);
  ctx.fx?.(score>=90?'match':'plate');fx.text(ball,score>=90?'perfect!':score>=60?'good':'okay',score>=90?'gold':'cream');
  host.querySelector('.stir-count').textContent=recipe.beats.length+' / 4';
  if(recipe.beats.length>=4)finishStation(recipe.beats.reduce((a,b)=>a+b,0)/4);
 }
 function wrapDrop(p){
  if(kind()!=='wrap'||recipe.transition)return;
  const d=Math.hypot(p.x-wrapTarget.x,p.y-wrapTarget.y),score=d<=14?100:Math.max(40,Math.round(100-(d-14)*3)),sheet=host.querySelector('[data-wrap]');
  if(d>70){sheet.style.left='18%';sheet.style.top='16%';feedback('Bring it onto the rice ball.');return;}
  sheet.style.left=(wrapTarget.x-16)/3.2+'%';sheet.style.top=(wrapTarget.y-16)/2.5+'%';sheet.classList.add('plated');recipe.wrapped=score;
  ctx.fx?.('plate');fx.burst(wrapTarget,{count:8,tone:['mint','cream'],spread:26});finishStation(score);
 }
 function cancel(){
  if(drag?.topping!==undefined){const b=host.querySelector('[data-topping="'+drag.topping+'"]'),p=recipe.toppings[drag.topping];if(b){b.classList.remove('lifting');b.style.left=p?(p.x-16)/3.2+'%':(17+Number(drag.topping)*28)+'%';b.style.top=p?(p.y-16)/2.5+'%':'18%';}}
  if(drag?.wrap){const sheet=host.querySelector('[data-wrap]');if(sheet){sheet.classList.remove('lifting');sheet.style.left='18%';sheet.style.top='16%';}}
  drag=null;previous=null;recipe.held=false;keyStir=0;assistPointer=null;
 }
 ctl.on(host,'pointerdown',e=>{
  if(ctl.isPaused()||recipe.transition||finished()||e.button!==0||!e.isPrimary||drag||assistPointer!==null||e.target.closest('button:disabled'))return;
  if(e.target.closest('[data-cook-assist]')){e.preventDefault();start();keyStir=1;assistPointer=e.pointerId;e.target.setPointerCapture(e.pointerId);return;}
  const work=e.target.closest('.recipe-worktop');if(!work)return;
  // Tap stations are plain buttons; let their click do the work.
  if(tapKinds.has(kind()))return;
  if(holdKind()&&!e.target.closest('[data-heat]'))return;
  e.preventDefault();
  start();const p=toyPoint(e,work);drag={id:e.pointerId,start:p,topping:e.target.closest('[data-topping]:not([data-wrap])')?.dataset.topping,wrap:!!e.target.closest('[data-wrap]'),target:e.target.closest('[data-plate-target]')?.dataset.plateTarget,heat:!!e.target.closest('[data-heat]'),at:performance.now()};
  previous=p;work.setPointerCapture(e.pointerId);if(drag.heat)holdHeat();
  if(stirKind())recipe.angle=Math.atan2((p.y-111)/.65,p.x-160);
  if(drag.topping!==undefined){selected=+drag.topping;ctl.stopMotion(host.querySelector('[data-topping="'+selected+'"]'));host.querySelectorAll('[data-topping]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.topping===selected)));}
 });
 ctl.on(host,'pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||recipe.transition)return;const p=toyPoint(e,host.querySelector('.recipe-worktop'));e.preventDefault();
  const station=kind();
  if(station==='chop'){
   if(!drag.chopped&&p.y-drag.start.y>18&&Math.abs(p.x-drag.start.x)<55){chop({x:(p.x+drag.start.x)/2,y:(p.y+drag.start.y)/2});if(drag)drag.chopped=true;}
  }else if(station==='spread'){
   logicalStroke(previous,p,(x,y,d)=>{if(recipe.transition)return false;spread(x,y,d/45);});
  }else if(station==='stir'){
   const sample=stirSample(previous,p,(performance.now()-drag.at)/1000);if(sample.delta)stir(sample.delta,sample.quality);if(!recipe.transition)feedback(sample.hint);if(sample.quality<1&&sample.delta){host.dataset.splash='true';splashLeft=.25;}
  }else if(station==='whisk'){
   const sample=stirSample(previous,p,(performance.now()-drag.at)/1000);if(sample.delta)stir(sample.delta,1);
  }else if(station==='rinse'){
   rinse(Math.hypot(p.x-previous.x,p.y-previous.y)/900);
  }else if(station==='top'&&drag.topping!==undefined){const b=host.querySelector('[data-topping="'+drag.topping+'"]');b.classList.add('lifting');b.style.left=(p.x-16)/3.2+'%';b.style.top=(p.y-16)/2.5+'%';}
  else if(station==='wrap'&&drag.wrap){const b=host.querySelector('[data-wrap]');b.classList.add('lifting');b.style.left=(p.x-16)/3.2+'%';b.style.top=(p.y-16)/2.5+'%';}
  previous=p;if(drag)drag.at=performance.now();
 });
 ctl.on(host,'pointerup',e=>{
  if(assistPointer===e.pointerId){assistPointer=null;keyStir=0;return;}
  if(!drag||drag.id!==e.pointerId)return;
  const d=drag,p=toyPoint(e,host.querySelector('.recipe-worktop')),station=kind();drag=null;host.querySelector('.topping.lifting')?.classList.remove('lifting');
  if(d.heat)releaseHeat();
  else if(station==='chop'&&!d.chopped&&Math.hypot(p.x-d.start.x,p.y-d.start.y)<18)chop(p);
  else if(station==='wrap'&&d.wrap)wrapDrop(Math.hypot(p.x-d.start.x,p.y-d.start.y)>8?p:wrapTarget);
  else if(station==='top'&&d.topping!==undefined){selected=+d.topping;if(Math.hypot(p.x-d.start.x,p.y-d.start.y)>8)plate(selected,p);else feedback('Berry selected. Tap the dish near an empty glow.');}
  // A tap on a garnish button has the same exact target as its keyboard action.
  // Freehand drops still receive the normal positional accuracy score.
  else if(station==='top'&&Math.hypot(p.x-d.start.x,p.y-d.start.y)<=16)plate(selected,d.target!==undefined?targets[+d.target]:p);
 });
 for(const type of ['pointercancel','lostpointercapture'])ctl.on(host,type,e=>{if(drag?.id===e.pointerId||assistPointer===e.pointerId)cancel();});
 ctl.on(host,'click',e=>{
  if(recipe.transition||ctl.isPaused())return;const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-finish-plate')){finishStation(recipe.plateScores.reduce((a,b)=>a+b,0)/3);return;}
  if(b.hasAttribute('data-spread-help')){const p=spreadPatches.find(p=>p.value<1);if(p)spread(p.x,p.y,.5);return;}
  if(b.hasAttribute('data-rinse-help')){rinse(.25);return;}
  if(b.hasAttribute('data-crack')){crack();return;}
  if(b.hasAttribute('data-flip')){flip();return;}
  if(b.hasAttribute('data-press')){press();return;}
  if(b.dataset.add){addIngredient(b.dataset.add);return;}
  if(b.hasAttribute('data-scoop')){scoop();return;}
  if(b.hasAttribute('data-serve-scoop')){serveScoop();return;}
  if(b.hasAttribute('data-wrap')&&e.detail===0){wrapDrop(wrapTarget);return;}
  if(b.hasAttribute('data-retry-station')){
   cancel();recipe.practice=true;recipe.started=false;recipe.penalties=0;const station=kind();
   if(station==='chop'){recipe.chops=0;recipe.sliced.clear();recipe.cutScores=[];}
   if(station==='stir'||station==='whisk'||station==='spread'){recipe.stir=0;recipe.stirGood=0;recipe.stirTravel=0;turns=0;lap=0;spreadPatches.forEach(p=>p.value=0);}
   if(station==='heat'||station==='pour')recipe.heat=0;
   if(station==='top'){recipe.plated.clear();recipe.occupied.clear();recipe.toppings={};recipe.plateScores=[];}
   if(station==='crack')recipe.crackAt=0;if(station==='flip')recipe.flipLevel=0;
   if(station==='add'){recipe.added=0;recipe.addMisses=0;}if(station==='ladle'){recipe.scoops=0;recipe.holding=false;delete host.dataset.holding;}
   if(station==='rinse')recipe.clear=0;if(station==='shape'){recipe.beats=[];recipe.beatAt=0;}if(station==='wrap')recipe.wrapped=null;
   draw();return;
  }
  if(b.dataset.plateTarget!==undefined&&e.detail===0){start();plate(selected,targets[+b.dataset.plateTarget]);}
  else if(b.dataset.topping!==undefined&&e.detail===0){selected=+b.dataset.topping;feedback('Berry '+(selected+1)+' selected. Choose a ring.');}
  else if(b.dataset.slice!==undefined&&e.detail===0)chop();
 });
 ctl.on(host,'keydown',e=>{
  if(e.repeat||recipe.transition||ctl.isPaused())return;
  const stirControl=e.target===host||e.target.hasAttribute('data-cook-assist');
  if(stirKind()&&stirControl&&['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){e.preventDefault();start();keyStir=e.key==='ArrowLeft'?-1:1;}
  if(e.target.hasAttribute('data-heat')&&[' ','Enter'].includes(e.key)){e.preventDefault();start();holdHeat();}
 });
 ctl.on(window,'keyup',e=>{if(['ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){keyStir=0;if(recipe.held)releaseHeat();}});
 ctl.on(window,'blur',cancel);ctl.on(host,'focusout',e=>{if(!host.contains(e.relatedTarget)){keyStir=0;if(recipe.held)cancel();}});
 ctl.on(document,'visibilitychange',()=>{if(document.hidden)cancel();});
 ctl.on(host,'toy-pause',cancel);
 ctl.loop(dt=>{
  if(stirKind()){const delta=Math.atan2(Math.sin(recipe.angle-spoonAngle),Math.cos(recipe.angle-spoonAngle));spoonAngle+=delta*(1-Math.exp(-28*dt));placeSpoon();}
  clockTime+=dt;if(splashLeft>0){splashLeft-=dt;if(splashLeft<=0)delete host.dataset.splash;}
  if(chopCooldown&&performance.now()>=chopCooldown){chopCooldown=0;if(kind()==='chop'&&!recipe.transition){placeKnife();host.querySelector('.chop-hint').textContent='TAP TO CHOP';host.querySelectorAll('[data-slice]').forEach((b,i)=>b.classList.toggle('next-cut',i===Math.floor(recipe.chops/2)));}}
  if(recipe.transition){recipe.transition-=dt;if(recipe.transition<=0){recipe.transition=0;recipe.phase++;recipe.left=limits[recipe.phase]||0;draw();}return;}
  if(finished())return;
  const station=kind();
  // Timed stations move on their own; everything else waits for the cook.
  if(station==='crack'){recipe.crackAt+=dt;const marker=host.querySelector('.timing-marker');if(marker)marker.style.left=(crackPosition()*100).toFixed(1)+'%';}
  if(station==='flip'){recipe.flipLevel=Math.min(1,recipe.flipLevel+.16*dt);host.querySelector('.heat-level').style.left=recipe.flipLevel*100+'%';const cake=host.querySelector('.flip-cake');if(cake)cake.style.filter='brightness('+(1.25-recipe.flipLevel*.55).toFixed(2)+') saturate('+(0.6+recipe.flipLevel*.7).toFixed(2)+')';const label=host.querySelector('[data-recipe-detail]'),text=recipe.flipLevel<.55?'cooking…':recipe.flipLevel<.65?'almost…':recipe.flipLevel<=.75?'FLIP!':'a little dark';if(label.textContent!==text){label.textContent=text;if(text==='FLIP!')ctx.fx?.('tick');}}
  if(station==='shape'){recipe.beatAt+=dt;const ring=host.querySelector('.beat-ring');if(ring)ring.style.scale=(1.7-.7*beatPhase()).toFixed(3);}
  if(!recipe.started)return;
  if(stirKind()&&keyStir)stir(keyStir*dt*2.2,1);
  if(station==='pour'){if(recipe.held)recipe.heat=heldTemperature();host.querySelector('.heat-level').style.left=recipe.heat*100+'%';const label=host.querySelector('[data-recipe-detail]'),text=recipe.heat<pourTarget-.15?'pouring…':recipe.heat<pourTarget-.05?'almost…':recipe.heat<=pourTarget+.05?'STOP!':'a bit much · let go';if(label.textContent!==text){label.textContent=text;if(text==='STOP!')ctx.fx?.('tick');}}
  if(station==='heat'){recipe.heat=recipe.held?heldTemperature():Math.max(0,recipe.heat-.08*dt);host.querySelector('.heat-level').style.left=recipe.heat*100+'%';host.querySelector('.recipe-pot').classList.toggle('simmer',recipe.heat>.5);const detail=recipe.heat<heatTarget-.15?'warming…':recipe.heat<heatTarget-.05?'almost…':recipe.heat<=heatTarget+.05?'RELEASE!':'too hot · let go';const label=host.querySelector('[data-recipe-detail]');if(label.textContent!==detail){label.textContent=detail;if(detail==='RELEASE!')ctx.fx?.('tick');if(detail.startsWith('too hot'))ctx.fx?.('sizzle');}}
 });
 draw();return {...ctl,snapshot:()=>({...recipe,sliced:[...recipe.sliced],plated:[...recipe.plated]})};
}
