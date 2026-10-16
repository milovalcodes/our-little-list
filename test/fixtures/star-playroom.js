// Original code-native glyphs for the game's buttons and matching cards.
function arcadeGlyph(name){
 const shapes={
  sun:'M8 0h4v3H8zM8 17h4v3H8zM0 8h3v4H0zM17 8h3v4h-3zM3 3h3v3H3zM14 3h3v3h-3zM3 14h3v3H3zM14 14h3v3h-3zM7 5h6v2h2v6h-2v2H7v-2H5V7h2z',
  moon:'M8 1h5v2h-3v2H8v6h2v2h3v2h5v2h-4v2H7v-2H4v-3H2V7h2V4h4z',
  star:'M9 0h2v3h2v3h7v3h-3v3h-2v2h2v6h-3v-2h-3v-2H9v2H6v2H3v-6h2v-2H3V9H0V6h7V3h2z',
  heart:'M2 3h5v2h6V3h5v2h2v6h-2v3h-3v3h-3v2H8v-2H5v-3H2v-3H0V5h2z',
  orbit:'M7 5h6v2h2v6h-2v2H7v-2H5V7h2zM0 11h3v4h5v3H2v-2H0zM12 2h6v2h2v5h-3V5h-5zM3 12h3v3H3zM14 5h3v3h-3z',
  cloud:'M7 3h6v2h3v4h2v2h2v6H0v-6h2V8h3V5h2z'
 };
 return '<svg class="arcade-glyph glyph-'+name+'" viewBox="0 0 20 20" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="'+(shapes[name]||shapes.star)+'"/></svg>';
}
// Local, disposable toy controllers. They never write game state or award cash.
function toyController(host,options={}){
 const abort=new AbortController(),timers=new Set(),motion=new Set(),pausedMotion=new Set(),activeMotion=new WeakMap();let frame=0,alive=true,last=performance.now(),paused=false,update=()=>{},resumeFocus=null;
 const on=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal});
 const ctl={isAlive:()=>alive,isPaused:()=>paused,on,
  stopMotion(el){if(el)activeMotion.get(el)?.cancel();},
  animate(el,frames,duration=220){
   if(!el?.animate||!alive||host.closest?.('[data-calm=true]')||globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches)return null;
   activeMotion.get(el)?.cancel();const animation=el.animate(frames,{duration,easing:'cubic-bezier(.2,.7,.25,1)'});activeMotion.set(el,animation);motion.add(animation);
   const clear=()=>{motion.delete(animation);pausedMotion.delete(animation);};animation.finished.then(clear,clear);if(paused){animation.pause();pausedMotion.add(animation);}return animation;
  },
  later(fn,ms){const timer={fn,left:ms/1000};timers.add(timer);return timer;},clear(timer){timers.delete(timer);},
  pause(message=''){
   if(paused||!alive)return;paused=true;resumeFocus=document.activeElement;host.dispatchEvent(new Event('toy-pause'));
   for(const a of new Set([...motion,...(host.getAnimations?.({subtree:true})||[])]))if(a.playState==='running'){a.pause();pausedMotion.add(a);}
   [...host.children].forEach(el=>{el.dataset.pauseInert=String(el.inert);el.inert=true;});
   const practice=options.practice?.()===true,saved=options.saved&&!practice;
   host.insertAdjacentHTML('beforeend','<div class="toy-pause" role="group" aria-label="Game paused"><h4>Paused</h4><button type="button" data-toy-resume>resume</button><button type="button" data-confirm-exit>' +(saved?'save & leave':practice?'leave practice':'leave this round')+'</button>'+(options.saved?'<button type="button" data-finish-run>'+(practice?'finish practice':'finish & collect')+'</button>':'')+'<small>'+(saved?'Progress saved':practice?'Practice · not saved':'Leaving discards this round')+'</small></div>');host.querySelector('[data-toy-resume]').focus();
  },
  resume(){if(!paused)return;host.querySelector('.toy-pause')?.remove();host.querySelectorAll('[data-pause-inert]').forEach(el=>{el.inert=el.dataset.pauseInert==='true';delete el.dataset.pauseInert;});paused=false;last=performance.now();for(const a of pausedMotion)if(a.playState==='paused')a.play();pausedMotion.clear();resumeFocus?.focus?.({preventScroll:true});},
  loop(fn){update=fn;},destroy(){alive=false;cancelAnimationFrame(frame);timers.clear();for(const a of new Set([...motion,...pausedMotion]))a.cancel();motion.clear();pausedMotion.clear();abort.abort();}
 };
 on(host,'click',e=>{if(e.target.closest('[data-toy-resume]'))ctl.resume();});
 on(document,'visibilitychange',()=>{last=performance.now();if(document.hidden)ctl.pause('Paused while you were away. Resume when you are ready.');});
 if(typeof window!=='undefined')on(window,'orientationchange',()=>ctl.pause('Screen turned. Resume when your hands are ready.'));
 const tick=t=>{if(!alive||!host.isConnected)return;const dt=Math.max(0,(t-last)/1000);last=t;
  if(!paused&&!document.hidden){if(dt>1.5)ctl.pause('The game was interrupted. Nothing moved while it caught up.');else{for(const timer of [...timers]){timer.left-=dt;if(timer.left<=0){timers.delete(timer);timer.fn();if(!alive||paused)break;}}if(alive&&!paused)update(dt,t);}}
  if(alive)frame=requestAnimationFrame(tick);
 };frame=requestAnimationFrame(tick);return ctl;
}
function toyPoint(event,el){const b=el.getBoundingClientRect();return {x:(event.clientX-b.left)/b.width*320,y:(event.clientY-b.top)/b.height*250};}
function toyReady(host,ctl,g,instruction,begin,ctx={}){
 if(g.restored){g.ready=true;begin?.();ctl.pause('Saved run ready. Resume when you are ready.');return;}
 g.ready=false;const content=[...host.children];content.forEach(el=>el.inert=true);
 host.insertAdjacentHTML('beforeend','<div class="toy-ready"><h4>Ready?</h4><p>'+instruction+'</p><button type="button" class="main-button" data-toy-ready '+(ctx.canPlay===false?'disabled':'')+'>play</button><button type="button" data-toy-practice>practice</button><small>'+(ctx.cost||'')+'</small></div>');
 if(ctx.levels){host.querySelector('.toy-ready p').insertAdjacentHTML('afterend','<label>Challenge <select data-toy-level>'+ctx.levels.map(n=>'<option value="'+n+'" '+(n===g.level?'selected':'')+'>'+n+' '+(g.type==='pairs'?'pairs':'verses')+'</option>').join('')+'</select></label>');ctl.on(host.querySelector('[data-toy-level]'),'change',e=>ctx.selectLevel(+e.target.value));}
 for(const practice of [false,true])ctl.on(host.querySelector(practice?'[data-toy-practice]':'[data-toy-ready]'),'click',async()=>{
  if(g.ready||g.starting||ctl.isPaused())return;g.starting=true;
  try{if(ctx.start&&!await ctx.start(practice))return;if(!ctl.isAlive())return;g.practice=practice;g.ready=true;content.forEach(el=>el.inert=false);host.querySelector('.toy-ready').remove();begin?.();ctx.changed?.();host.focus({preventScroll:true});}finally{g.starting=false;}
 });
}
function arcadeHud(host,ctx){
 const g=ctx.game;
 host.insertAdjacentHTML('beforeend','<div class="run-footer"><div><b data-earned>0 stardust</b><small data-run-best></small></div><button type="button" data-finish-run>'+(g.type==='pairs'?'finish board early':'finish & collect')+'</button></div>');
 function update(){const result=arcadeResult(g.type,arcadeStats(g));host.querySelector('[data-earned]').textContent=g.practice?'practice · no cash':result.cash+' stardust earned';const best=host.querySelector('[data-run-best]');best.hidden=g.type==='pairs';best.textContent=g.type==='pairs'?'':'Best: '+(ctx.best?.(result.recordKey)||0)+(g.type==='echo'?' notes':' points');host.querySelector('[data-finish-run]').textContent=g.practice?'finish practice':g.type==='pairs'?'finish board early':'finish & collect';ctx.changed?.();}
 return update;
}
function mountStarPairs(host,ctx){
 const ctl=toyController(host,{saved:true,practice:()=>ctx.game.practice}),g=ctx.game;let settling=false;
 // The larger deck reuses established game icons, not near-identical A/B cards.
 const deck=['sun','moon','star','heart','orbit','cloud','bowl','soap','oven','friends','basket','music'];
 const extra={bowl:'feed',soap:'wash',oven:'kitchen',friends:'together',basket:'catch',music:'echo'};
 const picture=card=>extra[card]?uiIcon(extra[card],'arcade-glyph'):arcadeGlyph(card.split(' ')[0]);
 if(!g.restored)Object.assign(g,{total:g.level||10,cards:ctx.shuffle(deck.slice(0,g.level||10).flatMap(c=>[c,c])),flipped:[],matched:[],moves:0,waiting:true,left:PAIR_BOARDS[g.level||10].seconds,preview:3,delay:0,combo:0,bestCombo:0,started:false});
 host.dataset.pairCount=g.total;
 host.innerHTML='<div class="game-header"><span class="arcade-stat"><small>PAIRS</small><b data-game-score></b></span><span class="arcade-stat"><small>TURNS</small><b data-game-moves></b></span><span class="arcade-stat"><small>TIME</small><b data-pairs-time>LOOK</b></span></div><div class="pairs-grid">'+g.cards.map((card,i)=>'<button type="button" class="'+(g.preview>0||g.flipped.includes(i)||g.matched.includes(i)?'flipped ':'')+(g.matched.includes(i)?'matched':'')+'" data-pair="'+i+'" '+(g.matched.includes(i)?'disabled':'')+' aria-label="'+(g.preview>0||g.flipped.includes(i)||g.matched.includes(i)?card:'Hidden card '+(i+1))+'"><span class="pair-face pair-back" aria-hidden="true">'+arcadeGlyph('star')+'</span><span class="pair-face pair-front" aria-hidden="true">'+picture(card)+'<small>'+card+'</small></span></button>').join('')+'</div><p class="pair-feedback" role="status">Find the matching pictures.</p>';
 const cards=[...host.querySelectorAll('[data-pair]')],message=host.querySelector('.pair-feedback'),update=arcadeHud(host,ctx);
 function paint(){host.querySelector('[data-game-score]').textContent=g.matched.length/2+' / '+g.total;host.querySelector('[data-game-moves]').textContent=g.moves;host.querySelector('[data-pairs-time]').textContent=g.preview>0?'LOOK':g.practice?'No timer':Math.floor(Math.ceil(g.left)/60)+':'+String(Math.ceil(g.left)%60).padStart(2,'0');}
 function finish(){ctx.finish();}
 function hideWrong(){g.flipped.forEach(i=>{cards[i].classList.remove('flipped');cards[i].setAttribute('aria-label','Hidden card '+(i+1));});g.flipped=[];g.waiting=false;g.delay=0;}
 function pick(i){
  if(!g.ready||g.done||settling||ctl.isPaused()||g.preview>0||g.flipped.includes(i)||g.matched.includes(i)||!cards[i])return;
  // A deliberate next tap may dismiss a mismatch after a readable brief beat.
  if(g.waiting){if(g.delay>.3||g.matched.length===g.total*2)return;hideWrong();}
  g.started=true;g.flipped.push(i);cards[i].classList.add('flipped');cards[i].setAttribute('aria-label',g.cards[i]);ctx.beep(i%4);
  if(g.flipped.length!==2){ctx.changed?.();return;}
  g.moves++;const [a,b]=g.flipped;
  if(g.cards[a]===g.cards[b]){g.matched.push(a,b);g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);g.flipped=[];cards[a].classList.add('matched');cards[b].classList.add('matched');cards[a].disabled=cards[b].disabled=true;for(const card of [cards[a],cards[b]])ctl.animate(card,[{translate:'0 0'},{translate:'0 -4px',offset:.45},{translate:'0 0'}],300);message.textContent=g.combo>1?g.combo+' pairs in a row!':'Pair found!';if(g.matched.length===g.total*2){settling=true;message.textContent='Board cleared!';paint();update();ctl.later(finish,420);return;}}
  else{g.combo=0;g.waiting=true;g.delay=.65;message.textContent='Remember those two. Next pair?';}
  paint();update();
 }
 ctl.loop(dt=>{
  if(g.done||!g.ready||settling)return;
  if(g.preview>0){g.preview=Math.max(0,g.preview-dt);if(!g.preview){hideWrong();cards.forEach((c,i)=>{if(!g.matched.includes(i)){c.classList.remove('flipped');c.setAttribute('aria-label','Hidden card '+(i+1));}});message.textContent=g.practice?'Find the matching pictures.':'Tap a card to start the clock.';paint();ctx.changed?.();}return;}
  if(g.started&&!g.practice)g.left=Math.max(0,g.left-dt);
  if(g.delay>0){g.delay-=dt;if(g.delay<=0)hideWrong();}
  paint();if(!g.left)finish();
 });
 paint();toyReady(host,ctl,g,'Match the pairs · '+PAIR_BOARDS[g.total].seconds/60+' min · '+PAIR_BOARDS[g.total].cash+' ✦ + bonus',()=>{update();if(g.matched.length===g.total*2){settling=true;ctl.later(finish,420);}},ctx);
 return {...ctl,pick};
}
function mountStarEcho(host,ctx){
 const ctl=toyController(host,{saved:true,practice:()=>ctx.game.practice}),g=ctx.game;let serial=0,flashSerial=0;
 if(!g.restored)Object.assign(g,{sequence:Array.from({length:2},()=>Math.floor(Math.random()*4)),input:[],mistakes:0,replays:0,longest:0,echoPhase:'watch'});
 if(g.longest===g.sequence.length){g.sequence.push(Math.floor(Math.random()*4));g.input=[];g.echoPhase='watch';}
 host.innerHTML='<div class="game-header"><span class="arcade-stat"><small>SEQUENCE</small><b data-echo-round></b></span><span class="arcade-stat"><small>HEARTS</small><b data-echo-lives></b></span><span class="arcade-stat"><small>LONGEST</small><b data-echo-best></b></span></div><div class="echo-stage" data-echo-phase="watch">'+ctx.pet+'<div class="echo-phase" aria-hidden="true">LISTEN</div><div class="echo-grid" role="group" aria-label="Musical memory pads">'+['Sun','Moon','Star','Heart'].map((label,i)=>'<button type="button" data-note="'+i+'" aria-label="'+label+' note" disabled><span class="note-number">'+(i+1)+'</span>'+arcadeGlyph(label.toLowerCase())+'<small>'+label+'</small></button>').join('')+'<span class="echo-mallet" aria-hidden="true"></span></div><div class="echo-spark" aria-hidden="true">♪</div></div><div class="echo-progress" aria-hidden="true"></div><p class="echo-feedback" role="status">Watch the notes.</p><div class="toy-actions"><button type="button" data-replay-tune>listen again · 1 heart</button></div>';
 const stage=host.querySelector('.echo-stage'),pads=[...host.querySelectorAll('[data-note]')],feedback=host.querySelector('.echo-feedback'),progress=host.querySelector('.echo-progress'),replay=host.querySelector('[data-replay-tune]'),update=arcadeHud(host,ctx);
 function later(fn,ms){return ctl.later(()=>{if(ctl.isAlive()&&host.isConnected&&!g.done)fn();},ms);}
 function phase(p){g.echoPhase=p;stage.dataset.echoPhase=p;stage.querySelector('.echo-phase').textContent={watch:'LISTEN',repeat:'YOUR TURN',nice:'LOVELY!',retry:'ONCE MORE'}[p];g.showing=p!=='repeat';}
 function lock(on){pads.forEach(p=>p.disabled=on);replay.disabled=on||(!g.practice&&g.mistakes>=2);}
 function paint(){host.querySelector('[data-echo-round]').textContent=g.sequence.length+' notes';host.querySelector('[data-echo-lives]').textContent=g.practice?'practice':Math.max(0,3-g.mistakes)+' / 3';host.querySelector('[data-echo-best]').textContent=g.longest;replay.textContent=g.practice?'listen again · free':'listen again · 1 heart';}
 function markers(){progress.innerHTML=Array.from({length:Math.min(32,g.sequence.length)},(_,i)=>'<i class="'+(i<g.input.length?'on':'')+'"></i>').join('');}
 function flash(n,ms=220){const stamp=++flashSerial;pads.forEach((p,i)=>p.classList.toggle('lit',i===n));stage.style.setProperty('--echo-key',n);ctx.beep(n,ms);
  // Restart even for two identical notes: each press has a visible attack.
  ctl.animate(pads[n],[{translate:'0 -4px'},{translate:'0 0'}],100);
  ctl.animate(stage.querySelector('.toy-pet'),[{translate:'0 0'},{translate:'0 4px',offset:.4},{translate:'0 0'}],ms);
  ctl.animate(stage.querySelector('.echo-spark'),[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -12px'}],ms);
  const pet=stage.querySelector('.skin-host');if(pet)pet.dataset.skinPose='1';later(()=>{if(stamp!==flashSerial)return;pads.forEach(p=>p.classList.remove('lit'));if(pet)pet.dataset.skinPose='0';},ms);
 }
 function repeat(){phase('repeat');lock(false);markers();feedback.textContent='Your turn · '+g.input.length+' / '+g.sequence.length+' · take your time';paint();ctx.changed?.();}
 function replayTune(){
  const run=++serial;phase('watch');g.input=[];lock(true);markers();paint();feedback.textContent='Watch · '+g.sequence.length+' notes';ctx.changed?.();
  let index=0;const lit=Math.max(280,460-Math.max(0,g.sequence.length-5)*12),gap=180;
  function next(){if(run!==serial||g.done)return;if(index<g.sequence.length){flash(g.sequence[index++],lit);later(next,lit+gap);}else repeat();}
  later(next,450);
 }
 function miss(message){if(g.done)return;g.mistakes++;phase('retry');lock(true);paint();feedback.textContent=message;ctx.changed?.();if(g.mistakes>=3&&!g.practice){ctx.finish();return;}later(replayTune,700);}
 function note(n){
  if(g.showing||g.done||ctl.isPaused()||!ctl.isAlive()||!g.ready||![0,1,2,3].includes(n))return;
  flash(n);if(n!==g.sequence[g.input.length]){miss('Different note. One heart lost; listen again.');return;}
  g.input.push(n);markers();feedback.textContent='Your turn · '+g.input.length+' / '+g.sequence.length;
  if(g.input.length===g.sequence.length){g.longest=Math.max(g.longest,g.sequence.length);phase('nice');lock(true);paint();update();feedback.textContent=g.longest+' notes remembered! One more…';later(()=>{g.sequence.push(Math.floor(Math.random()*4));replayTune();},700);}else ctx.changed?.();
 }
 ctl.on(host,'keydown',e=>{if(/^[1-4]$/.test(e.key)&&!e.repeat){e.preventDefault();note(Number(e.key)-1);}});
 paint();toyReady(host,ctl,g,'Repeat the notes · 3 hearts',()=>{update();if(g.restored&&g.echoPhase==='repeat')repeat();else replayTune();},ctx);
 return {...ctl,note,replay(){if(!g.ready||g.showing||g.done||ctl.isPaused()||(!g.practice&&g.mistakes>=2))return;g.replays++;if(!g.practice)g.mistakes++;replayTune();},destroy(){serial++;ctl.destroy();}};
}
function mountStarCatch(host,ctx){
 const ctl=toyController(host,{saved:true,practice:()=>ctx.game.practice}),g=ctx.game,sprite=ctx.sprite;
 if(!g.restored)Object.assign(g,{targetX:160,basketX:160,objects:[],spawn:1,serial:0,combo:0,caught:0,misses:0,hits:0,bestCombo:0,lives:3,recovery:0,elapsed:0});
 host.innerHTML='<div class="game-header"><span class="arcade-stat"><small>WISHES</small><b data-game-score>'+g.caught+'</b></span><span class="arcade-stat"><small>WAVE</small><b data-game-wave></b></span><span class="arcade-stat"><small>HEARTS</small><b data-catch-lives>'+g.lives+'</b></span></div><div class="catch-meter" aria-hidden="true"><i data-catch-fill></i></div><div class="catch-stage" role="group" aria-label="Move the basket to catch falling wishes"><div class="catch-moon" aria-hidden="true">'+arcadeGlyph('moon')+'</div><div class="catch-sky"></div><span class="catch-basket"><span class="basket-back">'+sprite('basket')+'</span>'+ctx.pet+'<span class="basket-front">'+sprite('basket')+'</span></span><span class="catch-feedback" role="status"></span></div><div class="catch-steering"><button type="button" data-steer="-1" aria-label="Move basket left">←</button><span>catch wishes · dodge clouds<br><small>drag anywhere in the sky</small></span><button type="button" data-steer="1" aria-label="Move basket right">→</button></div>';
 const stage=host.querySelector('.catch-stage'),sky=host.querySelector('.catch-sky'),basket=host.querySelector('.catch-basket'),update=arcadeHud(host,ctx);let held=0,pointer=null,steerPointer=null;
 // Geometry is read on resize, not after every moving-object write. Physics
 // stays sub-stepped; the playfield is painted only once per display frame.
 let size={width:stage.clientWidth,height:stage.clientHeight};
 const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>{size={width:stage.clientWidth,height:stage.clientHeight};paint();});resize?.observe(stage);
 const score=host.querySelector('[data-game-score]'),wave=host.querySelector('[data-game-wave]'),lives=host.querySelector('[data-catch-lives]'),fill=host.querySelector('[data-catch-fill]');
 const label=(el,value)=>{const text=String(value);if(el.textContent!==text)el.textContent=text;};
 function node(o){const n=document.createElement('span');n.className='falling-wish';n.innerHTML=sprite(o.cloud?'storm':'wish');sky.append(n);o.node=n;}
 g.objects.forEach(node);
 function paint(){basket.style.translate=Math.round(g.basketX/320*size.width)+'px 0';for(const o of g.objects)o.node.style.translate=Math.round(o.x/320*size.width)+'px '+Math.round(o.y/250*size.height)+'px';label(wave,catchDifficulty(g.caught).wave);label(score,g.caught);label(lives,g.practice?'practice':g.lives);fill.style.width=(g.caught%10)*10+'%';}
 const target=e=>{const b=stage.getBoundingClientRect();g.targetX=Math.max(28,Math.min(292,(e.clientX-b.left)/b.width*320));};
 ctl.on(stage,'pointerdown',e=>{if(e.button!==0||!e.isPrimary||pointer!==null||steerPointer!==null||!g.ready||ctl.isPaused())return;e.preventDefault();pointer=e.pointerId;stage.setPointerCapture(pointer);target(e);});
 ctl.on(stage,'pointermove',e=>{if(g.ready&&!ctl.isPaused()&&steerPointer===null&&(e.pointerType==='mouse'||e.pointerId===pointer)){e.preventDefault();target(e);}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])ctl.on(stage,type,e=>{if(e.pointerId===pointer)pointer=null;});
 ctl.on(host,'pointerdown',e=>{const b=e.target.closest('[data-steer]');if(b&&e.button===0&&e.isPrimary&&g.ready&&!ctl.isPaused()&&pointer===null&&steerPointer===null){e.preventDefault();steerPointer=e.pointerId;held=+b.dataset.steer;b.setPointerCapture(e.pointerId);}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])ctl.on(host,type,e=>{if(e.pointerId===steerPointer){held=0;steerPointer=null;}});
 ctl.on(host,'keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();held=e.key==='ArrowLeft'?-1:1;}});
 ctl.on(host,'keyup',()=>held=0);ctl.on(host,'click',e=>{const b=e.target.closest('[data-steer]');if(b&&e.detail===0)g.targetX=Math.max(28,Math.min(292,g.targetX+Number(b.dataset.steer)*35));});
 const release=()=>{held=0;pointer=null;steerPointer=null;};
 ctl.on(document,'visibilitychange',()=>{if(document.hidden)release();});ctl.on(window,'blur',release);ctl.on(host,'focusout',()=>held=0);ctl.on(window,'keyup',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')held=0;});ctl.on(host,'toy-pause',release);
 function damage(cloud){
  if(cloud)g.hits++;else g.misses++;g.combo=0;if(!g.practice)g.lives--;
  g.objects.forEach(o=>o.node.remove());g.objects=[];g.recovery=1.1;g.spawn=.4;g.spawnX=g.basketX;g.previousCloud=false;
  ctl.animate(basket.querySelector('.toy-pet'),[{opacity:1},{opacity:.35,offset:.25},{opacity:1,offset:.5},{opacity:.35,offset:.75},{opacity:1}],700);
  ctl.animate(lives,[{color:'#f29d88'},{color:'inherit'}],700);
  host.querySelector('.catch-feedback').textContent=(cloud?'Cloud caught.':'Wish missed.')+(g.practice?' Keep practising.':' One heart lost. Ready…');paint();if(!g.practice&&g.lives<=0){ctx.finish();return;}ctx.changed?.();
 }
 function step(dt){
  if(g.done||!g.ready)return;g.elapsed+=dt;g.targetX=Math.max(28,Math.min(292,g.targetX+held*300*dt));g.basketX+=Math.max(-300*dt,Math.min(300*dt,(g.targetX-g.basketX)*(1-Math.exp(-22*dt))));
  if(g.recovery>0){g.recovery=Math.max(0,g.recovery-dt);return;}
  const difficulty=catchDifficulty(g.caught);g.spawn-=dt;
  if(g.spawn<=0){
   g.spawn=difficulty.interval;const cloud=g.serial%7===5,previousX=g.spawnX??g.basketX;
   // Adjacent cloud/wish lanes leave room to dodge, without impossible travel.
   let delta=(Math.random()*2-1)*difficulty.reach;
   if(cloud||g.previousCloud){const direction=previousX>160?-1:1;delta=direction*Math.max(100,Math.abs(delta));}
   const nextX=Math.max(28,Math.min(292,previousX+delta));g.spawnX=nextX;g.previousCloud=cloud;
   const o={id:g.serial++,x:nextX,y:-35,cloud};node(o);g.objects.push(o);
  }
  for(const o of g.objects){
   o.y+=difficulty.speed*dt;
   if(o.y>183&&o.y<221&&Math.abs(o.x-g.basketX)<30){
    if(o.cloud){damage(true);return;}
    const caughtNode=o.node;ctl.animate(caughtNode,[{opacity:1},{opacity:0,transform:'translate(-50%,-85%)'}],160);ctl.later(()=>caughtNode.remove(),160);
    o.y=300;g.caught++;g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);
    host.querySelector('.catch-feedback').textContent=g.caught%10===0?'Wave '+catchDifficulty(g.caught).wave+' · stardust earned!':g.combo+' caught in a row';
    ctl.animate(basket.querySelector('.toy-pet'),[{translate:'0 0'},{translate:'0 5px',offset:.25},{translate:'0 -5px',offset:.6},{translate:'0 0'}],240);ctx.beep(g.caught%4);update();
   }else if(o.y>246){o.node.remove();if(!o.cloud){damage(false);return;}o.y=300;}
  }
  g.objects=g.objects.filter(o=>o.y<300);
 }
 paint();toyReady(host,ctl,g,'Catch stars · avoid clouds · 3 hearts',update,ctx);
 ctl.loop(dt=>{for(let remaining=dt;remaining>0&&!g.done;remaining-=.025)step(Math.min(.025,remaining));if(!g.done)paint();});return {...ctl,destroy(){resize?.disconnect();ctl.destroy();}};
}
