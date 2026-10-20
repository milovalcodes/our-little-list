import {KITCHEN_VERSION,STATIONS,createStage,tickStage,tapStage,strokeStage,traceStage,releaseTrace,timingPosition,kitchenReward,kitchenPayout} from './little-star/kitchen-rules.mjs';
import {clock,RECIPES,longRest} from './little-star/engine.mjs';
import './little-star-play-view.js';

const icon=name=>'<span class="kitchen-icon" data-kicon="'+name+'" aria-hidden="true"></span>';
const object=(name,x,y,w,h=w,extra='')=>'<span class="skill-object '+extra+'" style="left:'+x/3.2+'%;top:'+y/2.5+'%;width:'+w/3.2+'%;height:'+h/2.5+'%">'+icon(name)+'</span>';
const circle=(p,r=11,cls='',text='')=>'<g class="'+cls+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'"/>'+(text?'<text x="'+p.x+'" y="'+(p.y+4)+'">'+text+'</text>':'')+'</g>';
const arrow=(a,b)=>'<path class="skill-route" d="M '+a.x+' '+a.y+' L '+b.x+' '+b.y+'" marker-end="url(#skill-arrow)"/>'+circle(a,6,'skill-start');
const point=(e,work)=>{const r=work.querySelector('.skill-world').getBoundingClientRect();return {x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*250/r.height,t:performance.now()};};
const ingredients=['herb','carrot-cut','potato'];
const ingredientName=name=>name==='carrot-cut'?'carrot':name;
const cursorBounds=work=>{const w=work.querySelector('.skill-world').getBoundingClientRect(),r=work.getBoundingClientRect();return {left:Math.max(3,(r.left+work.clientLeft-w.left)*320/w.width+10),right:Math.min(317,(r.left+work.clientLeft+work.clientWidth-w.left)*320/w.width-10),top:Math.max(3,(r.top+work.clientTop-w.top)*250/w.height+10),bottom:Math.min(247,(r.top+work.clientTop+work.clientHeight-w.top)*250/w.height-10)};};
const safeClone=v=>JSON.parse(JSON.stringify(v));

export function mountKitchen(host,ctx,legacy){
 const bridge=globalThis.starLive?.kitchenContext?.(),paid=!ctx.practice&&bridge?.session?.challengeVersion===KITCHEN_VERSION;
 // An old open batch can still be completed on its original terms.
 if(!ctx.practice&&!paid&&legacy)return legacy(host,ctx);
 const session=paid?bridge.session:null,seed=session?.id||crypto.randomUUID(),stations=ctx.stations;
 let run=paid?bridge.load():null;
 if(!run||run.version!==KITCHEN_VERSION||run.sessionId!==session?.id||run.recipe!==ctx.recipe||run.phase>=stations.length&&run.mode!=='result')run=null;
 run??={version:KITCHEN_VERSION,sessionId:session?.id||null,recipe:ctx.recipe,phase:0,grades:[],stages:[],failed:false,mode:'brief',stage:createStage(stations[0],seed+':0')};
 let paused=run.mode==='playing',destroyed=false,raf=0,last=performance.now(),lastSave=0,drag=null,cursor={x:160,y:140},keys=new Set(),keyDown=false,keyboardUsed=false,completed=false,renderedSub=-1,persisted=true;
 const listeners=[];
 const on=(el,type,fn,opts)=>{el.addEventListener(type,fn,opts);listeners.push(()=>el.removeEventListener(type,fn,opts));};
 const save=()=>{if(paid)persisted=bridge.save(safeClone(run))!==false;};
 const current=()=>run.stage;
 const sound=kind=>ctx.fx?.(kind);
 function evidence(){return {version:KITCHEN_VERSION,sessionId:session?.id,failed:run.failed,stages:safeClone(run.stages)};}
 function conclude(){
  run.failed=run.failed||run.grades.some(v=>v<35);run.mode='result';run.score=run.failed?0:Math.floor(run.grades.reduce((a,b)=>a+b,0)/stations.length);
  run.failed=run.failed||run.score<55;while(run.grades.length<stations.length)run.grades.push(0);
  if(paid){bridge.proof(evidence());save();}
  render();
  if(!completed){completed=true;ctx.complete({score:run.score,grades:[...run.grades],quality:payout().portions,practice:!!ctx.practice});sound(run.failed?'miss':'clear');}
 }
 function payout(){return paid?kitchenPayout(bridge.state,bridge.actor,{...session,form:longRest(bridge.state,bridge.now)?null:session.form},run.score,run.failed,clock(bridge.now).day):kitchenReward(run.score,run.failed);}
 function settle(){
  const s=current();if(!s.done||run.mode!=='playing')return;
  drag=null;keys.clear();keyDown=false;run.grades[run.phase]=s.score;run.stages[run.phase]={kind:s.kind,score:s.score,elapsed:Math.round(s.elapsed*1000)/1000,failed:s.failed};
  if(s.failed||s.score<35){run.failed=true;conclude();return;}
  run.mode='grade';save();render();sound(s.score>=90?'match':'plate');
 }
 function art(){
  const s=current(),kind=s.kind;
  if(run.mode==='result')return dishArt()+(s.kind==='top'&&!run.failed?s.targets.map(p=>object('berries',p.x-12,p.y-12,24)).join(''):'')+(!run.failed&&ctx.pet?'<span class="skill-taster">'+ctx.pet+'</span>':'');
  if(kind==='chop')return [0,1,2].map(i=>object(ctx.recipe==='stew'?'carrot':'berries',68+i*65,98,65,65,'skill-uncut-'+i)+'<span class="skill-object skill-cut-'+i+'" style="left:'+(68+i*65)/3.2+'%;top:39.2%;width:20.3125%;height:26%">'+(ctx.recipe==='stew'?icon('carrot-cut'):ctx.sprite('sliced'))+'</span>').join('');
  if(['stir','heat','add','ladle'].includes(kind))return kind==='ladle'?'<span class="skill-object" style="left:6%;top:35%;width:34%;height:43.52%">'+ctx.sprite('pot')+'</span>'+object('stew',209,111,84):'<span class="skill-object" style="left:25%;top:27%;width:50%;height:64%">'+ctx.sprite('pot')+'</span>'+(kind==='add'?ingredients.map((n,i)=>'<span data-skill-ingredient="'+n+'">'+object(n,41+i*95,38,48)+'</span>').join(''):'');
  if(kind==='whisk')return object('batter',80,68,160);
  if(kind==='spread')return object('bread',80,65,160)+Array.from({length:12},(_,i)=>'<i class="skill-jam" data-paint="'+i+'" style="left:'+(104+(i%4)*28)/3.2+'%;top:'+(102+Math.floor(i/4)*27)/2.5+'%"></i>').join('');
  if(kind==='crack')return object(s.sub?'yolk':'egg',105,84,110);
  if(kind==='pour'||kind==='flip')return object('pan',90,25,190)+(kind==='flip'?object('pancake',123,101,76,76,'skill-cake'):object('jug',35,38,54,54,'skill-jug'));
  if(kind==='rinse')return '<span class="skill-object" style="left:25%;top:28%;width:50%;height:64%">'+ctx.sprite('bowl')+'<i class="skill-rice-water"></i><i class="skill-cloud"></i></span>';
  if(kind==='shape'||kind==='wrap')return object('riceball',100,78,120)+(kind==='wrap'?object('seaweed',s.sub?136:41,s.sub?124:33,48,48,'skill-seaweed'):'');
  return dishArt()+s.targets.map((_,i)=>object('berries',43+i*95,32,44,44,'skill-berry skill-berry-'+i)).join('');
 }
 function dishArt(){
  if(['pancakes','stew','onigiri'].includes(ctx.recipe))return object(ctx.recipe,80,72,160);
  return '<span class="skill-object skill-final-dish" style="left:25%;top:28%;width:50%;height:64%">'+ctx.foodSprite(ctx.dish)+'</span>';
 }
 function guide(){
  const s=current();let g='';
  if(run.mode==='result')return '';
  if(s.kind==='chop')g=s.cuts.map(([a,b],i)=>i<s.index?'':i===s.index?arrow(a,b):'<path class="skill-future" d="M '+a.x+' '+a.y+' L '+b.x+' '+b.y+'"/>').join('');
  if(s.trace.length&&s.sub===0||s.kind==='ladle'){
   g='<polyline class="skill-future" points="'+s.trace.map(p=>p.x+','+p.y).join(' ')+'"/>';
   s.trace.forEach((p,i)=>{if(i>=s.index)g+=circle(p,i===s.index?13:4,i===s.index?'skill-next':'skill-future',i===s.index?String(i+1):'');});
   if((s.kind==='stir'||s.kind==='whisk')&&s.index>=9)g+='<text class="skill-direction" x="160" y="135">↶</text>';
  }
  if(s.kind==='spread')g='<rect class="skill-route" x="103" y="100" width="114" height="86" rx="7"/>';
  if(s.kind==='crack'&&s.sub===1)g=arrow({x:105,y:140},{x:215,y:140});
  if(s.kind==='flip')g=s.sub===0?arrow({x:160,y:182},{x:160,y:85}):'<circle class="skill-future" cx="160" cy="140" r="39"/>'+circle({x:160,y:140},Math.max(12,95-(s.elapsed-s.airAt)*72),'skill-next');
  if(s.kind==='top'||s.kind==='pour')g=s.targets.map((p,i)=>circle(p,i===s.index?13:9,i<s.index?'skill-placed':i===s.index?'skill-next':'skill-future',String(i+1))).join('');
  if(s.kind==='add')g=circle({x:160,y:139},34,'skill-next','↓');
  if(s.kind==='wrap')g=s.sub===0?circle({x:160,y:148},12,'skill-next','1'):arrow({x:s.sub===1?107:211,y:145},{x:160,y:145});
  return '<defs><marker id="skill-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#fff2bd"/></marker></defs>'+g;
 }
 function controls(){
  const s=current();if(run.mode!=='playing')return '';
  if(s.kind==='heat')return '<button type="button" data-skill-action="low">low · L</button><button type="button" data-skill-action="high">high · H</button>';
  if(s.kind==='crack'&&s.sub===0)return '<button type="button" class="main-button" data-skill-action="timing">crack · Enter</button>';
  if(s.kind==='flip'&&s.sub===1)return '<button type="button" class="main-button" data-skill-action="timing">catch · Enter</button>';
  if(['rinse','shape'].includes(s.kind)&&s.sub===1)return '<button type="button" class="main-button" data-skill-action="timing">'+(s.kind==='rinse'?'drain':'press')+' · Enter</button>';
  return '';
 }
 function render(){
  const s=current(),spec=STATIONS[s.kind],result=run.mode==='result',pay=result?payout():null;
  const again=!paid||Object.entries(RECIPES[ctx.recipe].ingredients).every(([name,n])=>(bridge.state.larder?.[name]||0)>=n);
  renderedSub=s.sub;
  host.classList.add('skill-kitchen');host.dataset.recipe=ctx.recipe;host.dataset.stationKind=result?'done':s.kind;host.dataset.skillMode=run.mode;
  host.innerHTML='<div class="recipe-heading"><span>'+(ctx.practice?'PRACTICE':'YOUR RECIPE')+'<b>'+ctx.recipeName+'</b></span><span class="recipe-ticket">'+(result?'READY':run.phase+1+' / '+stations.length)+'</span></div>'+
   '<ol class="recipe-stations" style="--station-count:'+stations.length+'" aria-label="Recipe progress">'+stations.map((k,i)=>'<li data-state="'+(i<run.phase||result?'done':i===run.phase?'active':'next')+'"><span>'+(run.grades[i]===undefined?i+1:run.grades[i]+'%')+'</span>'+STATIONS[k].name+'</li>').join('')+'</ol>'+
   '<h4 class="recipe-title">'+(result?(run.failed?'A kitchen mishap…':'Your kitchen report'):s.kind==='add'?'Follow the recipe':spec.title)+'</h4>'+
   (!result&&s.kind==='add'?'<ol class="skill-order" aria-label="Ingredient order">'+s.order.map((n,i)=>'<li data-order="'+i+'"><b>'+(i+1)+'</b>'+icon(n)+'<span>'+ingredientName(n)+'</span></li>').join('')+'</ol>':'')+
   '<div class="recipe-worktop skill-worktop" data-failed="'+(result&&run.failed)+'" data-recipe-phase="'+(result?3:({chop:0,crack:0,rinse:0,shape:0,stir:1,whisk:1,spread:1,add:1,heat:2,pour:2,flip:2}[s.kind]??3))+'" tabindex="0" role="application" aria-label="'+(result?'Finished dish':spec.title+'. Use arrows to move, Space to lift or lower tool, Enter for timing actions.')+'"><div class="skill-world"><div class="skill-art">'+art()+'</div><svg class="skill-guides" viewBox="0 0 320 250" aria-hidden="true"></svg><span class="skill-hand" hidden></span><span class="skill-key-cursor" aria-hidden="true" style="left:'+cursor.x/3.2+'%;top:'+cursor.y/2.5+'%" '+(keyboardUsed?'':'hidden')+'>+</span></div>'+
   (run.mode==='brief'?'<div class="skill-overlay"><strong>'+spec.seconds+' seconds</strong><p>'+spec.help+'</p><button type="button" class="main-button" data-skill-begin>ready · start timer</button></div>':'')+
   (run.mode==='grade'?'<div class="skill-overlay"><strong>'+s.score+'%</strong><p>'+(s.score===100?'Clean work!':s.score>=90?'Beautifully done.':s.score>=70?'A few rough edges.':'That was close…')+'</p><button type="button" class="main-button" data-skill-next>'+(run.phase===stations.length-1?'see dish':'next station')+'</button></div>':'')+
   (result?'<div class="skill-report '+(run.failed?'skill-ruined':'')+'"><strong>'+pay.label+' · '+run.score+'%</strong></div>':'<div class="skill-stage-controls">'+controls()+'</div>')+'</div>'+
   (result?'<p class="skill-result-copy">'+(ctx.practice?'Practice · no ingredients or rewards':run.failed?'No meals or stardust. Ingredients used.':pay.portions+' meals'+(run.score===100?' · 3× standard batch':'')+(pay.tip?' · +'+pay.tip+' ✦':''))+'</p>':'<div class="skill-clock"><span data-skill-time></span><span data-skill-progress></span><meter min="0" max="'+s.limit+'" value="'+(s.limit-s.elapsed)+'" aria-label="Seconds remaining"></meter></div><div class="skill-meter" hidden><i></i><b></b></div><p class="skill-cue"></p>')+
   '<p class="recipe-feedback" role="status" aria-live="polite">'+(result&&run.failed?(s.feedback||'This dish did not make the cut.'):result?'':'Four major mistakes ruin the dish. Aim for a clean run.')+'</p><div class="recipe-access skill-controls">'+(result?'<button type="button" class="main-button" data-serve-cook>'+(ctx.practice?'finish practice':run.failed?'finish batch':'collect '+pay.portions+' meals')+'</button>'+(again?'<button type="button" data-cook-again>'+(ctx.practice?'practice again':'finish & cook again')+'</button>':''):'')+'</div>'+
   (!result?'<details class="skill-help"><summary>station help & controls</summary><p>'+spec.help+'</p><p>Touch or mouse: drag the tool. Keyboard: arrows move the crosshair; Space picks up / puts down. Enter: timing action. H / L: heat. Four major mistakes ruin a dish. Under 55% earns nothing. Perfect: 9 meals + up to 8 ✦, with three chef bonuses per day.</p></details>':'');
  onWorktop();paint();if(paused){showPause();return;}
  const focus=host.querySelector('[data-skill-begin]')||host.querySelector('[data-skill-next]')||host.querySelector('[data-skill-action]')||host.querySelector('.skill-controls button')||host.querySelector('.skill-worktop');focus?.focus({preventScroll:true});
 }
 function paint(){
  if(destroyed||run.mode==='result')return;
  if(run.mode==='playing'&&current().sub!==renderedSub){drag=null;keyDown=false;keys.clear();render();return;}
  const s=current();host.querySelector('.skill-guides').innerHTML=guide();
  host.querySelector('[data-skill-time]').textContent=Math.ceil(s.limit-s.elapsed)+'s';host.querySelector('.skill-clock meter').value=Math.max(0,s.limit-s.elapsed);host.querySelector('.skill-clock').dataset.urgent=String(s.limit-s.elapsed<5);
  let progress=s.trace.length?Math.min(s.index,s.trace.length-1)+' / '+(s.trace.length-1):s.kind==='chop'?s.index+' / 5':s.kind==='spread'?s.index+' / 12':s.kind==='wrap'?s.sub+' / 3':['top','pour','add'].includes(s.kind)?s.index+' / 3':'';
  host.querySelector('[data-skill-progress]').textContent=progress;
  const meter=host.querySelector('.skill-meter'),pulse=['crack','pour'].includes(s.kind)&&s.sub===0||['rinse','shape'].includes(s.kind)&&s.sub===1;
  // Reserve this HUD slot through both parts of a timing station. Removing it
  // would recenter the dialog and move the food under a player's finger.
  meter.hidden=!['crack','pour','heat','flip','rinse','shape'].includes(s.kind);
  meter.style.visibility=pulse||s.kind==='heat'||s.kind==='flip'&&s.sub===0?'visible':'hidden';
  const position=s.kind==='heat'?s.temperature:s.kind==='flip'?Math.max(0,Math.min(1,(s.elapsed-2)/4)):timingPosition(s.elapsed-(s.pulseAt||0));
  meter.querySelector('b').style.left=position*100+'%';const zone=s.kind==='heat'?.5+.12*Math.sin(s.elapsed*.95):.5,grace=s.kind==='heat'?.145:.075;
  meter.querySelector('i').style.left=(zone-grace)*100+'%';meter.querySelector('i').style.width=grace*200+'%';
  let cue=s.feedback||'';
  if(s.kind==='heat'){cue=(s.high?'HIGH':'LOW')+' · simmer '+Math.min(100,Math.floor(s.cooked/6.5*100))+'%';host.querySelector('.skill-object')?.classList.toggle('skill-simmer',s.temperature>.42);host.querySelectorAll('[data-skill-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.skillAction===(s.high?'high':'low'))));}
  if(s.kind==='add'){
   cue=s.done?'All ingredients added':s.elapsed<3?'Read the order · drag in '+Math.ceil(3-s.elapsed)+'s':'Drag '+ingredientName(s.order[s.index])+' into the pot';
   host.querySelectorAll('[data-order]').forEach((el,i)=>{el.dataset.state=i<s.index?'done':i===s.index?'next':'waiting';el.setAttribute('aria-current',String(i===s.index));});
   host.querySelectorAll('[data-skill-ingredient]').forEach(el=>{el.hidden=s.order.slice(0,s.index).includes(el.dataset.skillIngredient)||drag?.source===el.dataset.skillIngredient;});
  }
  if(s.kind==='stir'||s.kind==='whisk')cue=s.index>=9?'↶ Reverse · follow the glow':s.feedback||'↷ Follow the glow · steady pace';
  if(s.kind==='pour')cue='Drop on the next glow when the amount needle is GOLD';
  if(s.kind==='flip')cue=s.sub?'Catch as the ring meets the gold circle':s.elapsed<3.7?'Cooking… wait for gold':'Swipe UP when the needle is GOLD';
  const cueEl=host.querySelector('.skill-cue');if(cueEl.textContent!==cue)cueEl.textContent=cue;
  const feedback=host.querySelector('.recipe-feedback');if(s.feedback&&feedback.textContent!==s.feedback)feedback.textContent=s.feedback;
  host.querySelectorAll('[data-paint]').forEach(el=>el.style.opacity=s.paint[+el.dataset.paint]);
  if(s.kind==='chop')for(let i=0;i<3;i++){const cut=s.index>=Math.min(5,(i+1)*2);host.querySelector('.skill-uncut-'+i).hidden=cut;const piece=host.querySelector('.skill-cut-'+i);piece.hidden=!cut;piece.classList.toggle('skill-cut-show',cut);}
  host.querySelector('.skill-cloud')?.style.setProperty('opacity',String(1-Math.min(1,s.index/Math.max(1,s.trace.length-1))));
  if(s.kind==='flip'){const cake=host.querySelector('.skill-cake');cake.style.filter='brightness('+(1.1-Math.min(.35,s.elapsed*.045))+')';cake.style.translate=s.sub?'0 '+(-Math.sin(Math.min(1,(s.elapsed-s.airAt)/.78)*Math.PI)*100)+'%':'0 0';}
  if(s.kind==='top')host.querySelectorAll('.skill-berry').forEach((el,i)=>{el.hidden=i<s.index;});
  if(s.kind==='top'||s.kind==='pour'){
   let placed=host.querySelector('.skill-plated');if(!placed){placed=document.createElement('div');placed.className='skill-plated';host.querySelector('.skill-art').append(placed);}
   placed.innerHTML=s.targets.slice(0,s.index).map(p=>object(s.kind==='top'?'berries':'pancake',p.x-(s.kind==='top'?12:21),p.y-(s.kind==='top'?12:21),s.kind==='top'?24:42)).join('');
  }
 }
 function sourceAt(p){
  const s=current();if(s.kind==='top')return [0,1,2].find(i=>Math.hypot(p.x-(65+i*95),p.y-54)<32);
  if(s.kind==='add')return ingredients.find((n,i)=>!s.order.slice(0,s.index).includes(n)&&Math.hypot(p.x-(65+i*95),p.y-62)<32);
  return null;
 }
 function changes(before){const s=current();if(s.mistakes>before.mistakes)sound('miss');else if(s.points.length>before.points)sound(s.kind==='chop'||s.kind==='crack'?'cut':s.kind==='flip'?'whoosh':'plate');}
 const checkpoint=()=>({mistakes:current().mistakes,points:current().points.length});
 function down(p,id){
  if(paused||run.mode!=='playing'||drag)return;
  const source=sourceAt(p);if(current().kind==='add'&&(current().elapsed<3||!source))return;
  drag={id,path:[p],source};current().last=null;traceStage(current(),p);moveHand(p);paint();
 }
 function move(p){if(!drag||paused||run.mode!=='playing')return;drag.path.push(p);if(drag.path.length>800)drag.path.splice(1,1);const before=checkpoint();traceStage(current(),p);changes(before);moveHand(p);paint();settle();}
 function up(p,cancel=false){
  if(!drag)return;const d=drag;drag=null;
  if(!cancel){const before=checkpoint();d.path.push(p);strokeStage(current(),d.path,d.source);changes(before);}
  if(!current().done){const {index,loss}=current();releaseTrace(current());if(cancel){current().index=index;current().loss=loss;}}hideHand();paint();settle();
 }
 function moveHand(p){const h=host.querySelector('.skill-hand');if(!h)return;h.hidden=false;h.style.left=p.x/3.2+'%';h.style.top=p.y/2.5+'%';const k=current().kind;h.dataset.tool=k;h.innerHTML=['chop','spread'].includes(k)?ctx.sprite('knife'):k==='stir'?ctx.sprite('spoon'):icon(k==='add'?drag.source:k==='whisk'?'whisk':k==='pour'?'jug':k==='ladle'?'ladle':k==='top'?'berries':k==='wrap'?'seaweed':'');}
 function hideHand(){const h=host.querySelector('.skill-hand');if(h)h.hidden=true;}
 function onWorktop(){
  const work=host.querySelector('.skill-worktop');
  // Listeners belong to this worktop and disappear with a station render.
  work.onpointerdown=e=>{if(e.button!==0||!e.isPrimary||e.target.closest('button,.skill-overlay'))return;e.preventDefault();work.focus({preventScroll:true});down(point(e,work),e.pointerId);if(drag)work.setPointerCapture(e.pointerId);};
  work.onpointermove=e=>{if(drag?.id===e.pointerId){e.preventDefault();move(point(e,work));}};
  work.onpointerup=e=>{if(drag?.id===e.pointerId)up(point(e,work));};
  work.onpointercancel=e=>{if(drag?.id===e.pointerId)up(point(e,work),true);};
  work.onlostpointercapture=e=>{if(drag?.id===e.pointerId)up(drag.path.at(-1),true);};
 }
 function action(name){if(paused||run.mode!=='playing')return;const before=checkpoint();tapStage(current(),name);changes(before);paint();settle();}
 function pause(){
  if(run.mode==='result'||paused)return;up(drag?.path.at(-1)||{...cursor,t:performance.now()},true);paused=true;keys.clear();keyDown=false;save();showPause();
 }
 function showPause(){
  if(host.querySelector('.skill-pause'))return;
  const el=document.createElement('div');el.className='skill-overlay skill-pause';el.setAttribute('role','group');el.setAttribute('aria-label','Kitchen paused');el.innerHTML='<strong>Kitchen paused</strong><p>'+(ctx.practice?'Practice is paused. The clock is stopped.':persisted?'The clock is stopped. Your batch is saved on this device.':'The clock is stopped. This device could not save your progress; keep this screen open until you collect.')+'</p><button type="button" class="main-button" data-skill-resume>resume</button><button type="button" data-skill-discard>'+(ctx.practice?'end practice':'discard batch · no rewards')+'</button>';host.querySelector('.skill-worktop').append(el);el.querySelector('button').focus();
 }
 on(host,'click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-skill-resume')){paused=false;last=performance.now();b.closest('.skill-pause').remove();host.querySelector('.skill-worktop').focus();return;}
  if(b.hasAttribute('data-skill-discard')){paused=false;current().failed=true;current().score=0;current().done=true;current().feedback='Batch discarded.';run.mode='playing';settle();return;}
  if(b.hasAttribute('data-skill-begin')){run.mode='playing';paused=false;last=performance.now();save();render();return;}
  if(b.hasAttribute('data-skill-next')){if(run.phase===stations.length-1){conclude();return;}run.phase++;run.mode='brief';run.stage=createStage(stations[run.phase],seed+':'+run.phase);save();render();return;}
  if(b.dataset.skillAction)action(b.dataset.skillAction);
 });
 on(host,'keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();pause();return;}
  if(run.mode!=='playing'||paused)return;
  if(['h','l'].includes(e.key.toLowerCase())){action(e.key.toLowerCase()==='h'?'high':'low');return;}
  if(e.target.closest('button'))return;
  if(e.key.startsWith('Arrow')){e.preventDefault();keys.add(e.key);keyboardUsed=true;host.querySelector('.skill-key-cursor').hidden=false;}
  if(e.code==='Space'&&!e.repeat){e.preventDefault();keyDown=!keyDown;if(keyDown){down({...cursor,t:performance.now()},'key');keyDown=!!drag;}else up({...cursor,t:performance.now()});}
  if(e.key==='Enter'&&!e.repeat){e.preventDefault();action('timing');}
 });
 on(window,'keyup',e=>keys.delete(e.key));on(window,'blur',pause);on(window,'orientationchange',pause);on(window,'star-play-view-change',()=>{if(run.mode==='playing')pause();});on(document,'visibilitychange',()=>{if(document.hidden)pause();});
 function frame(now){
  if(destroyed)return;const dt=Math.max(0,(now-last)/1000);last=now;
  if(!paused&&run.mode==='playing'){
   // Account for suspended frames instead of awarding extra time on a slow tab.
   let remaining=dt;while(remaining>0&&!current().done){const step=Math.min(.05,remaining);tickStage(current(),step);remaining-=step;}const speed=135;
   if(keys.size){const bounds=cursorBounds(host.querySelector('.skill-worktop'));cursor.x=Math.max(bounds.left,Math.min(bounds.right,cursor.x+((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*speed*dt));cursor.y=Math.max(bounds.top,Math.min(bounds.bottom,cursor.y+((keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0))*speed*dt));const c=host.querySelector('.skill-key-cursor');c.style.left=cursor.x/3.2+'%';c.style.top=cursor.y/2.5+'%';if(keyDown)move({...cursor,t:now});}
   paint();settle();if(now-lastSave>300){save();lastSave=now;}
  }
  raf=requestAnimationFrame(frame);
 }
 save();render();if(run.mode==='result')conclude();raf=requestAnimationFrame(frame);
 return {pause,destroy(){destroyed=true;cancelAnimationFrame(raf);save();listeners.forEach(fn=>fn());host.classList.remove('skill-kitchen');},snapshot:()=>({started:paid||run.mode!=='brief',phase:run.phase,...safeClone(run)})};
}

globalThis.starKitchenChallenge={mount:mountKitchen};
// Explain the stakes before ingredients are committed, alongside the existing
// recipe picker and free practice action. The companion owns that sheet.
const entryNote=()=>{
 if(document.getElementById('little-star-demo')?.dataset?.kitchenVersion!=='1')return;
 const button=document.querySelector('.nursery-sheet[data-type="kitchen"] [data-start-cook]');
 if(!button)return;
 let note=button.parentElement.querySelector('.skill-entry-note');if(!note){note=document.createElement('p');note.className='skill-entry-note';button.before(note);}
 const bridge=globalThis.starLive?.kitchenContext?.(),session=bridge?.session,saved=session&&bridge.load(),selected=button.parentElement.querySelector('[data-pick-recipe][aria-pressed="true"]')?.dataset.pickRecipe;
 const resumable=session?.challengeVersion===KITCHEN_VERSION&&!session.done&&saved?.sessionId===session.id&&saved.recipe===selected;
 const held=session?.challengeVersion===KITCHEN_VERSION&&!session.done&&saved?.sessionId===session.id;
 const text=resumable?'Your batch is saved. Resume without spending more ingredients.':held?'Starting this recipe discards your saved '+(RECIPES[session.recipe]?.name||'batch')+' and its ingredients. Choose that recipe to resume it.':'Timed skill challenge · ruined dishes use their ingredients and earn nothing. Perfect: 9 meals + up to 8 ✦. Practice is free. A saved batch resumes when you choose its recipe.';
 if(note.textContent!==text)note.textContent=text;
 const buy=button.parentElement.querySelector('[data-buy-ingredients="'+selected+'"]');
 if(resumable){button.disabled=false;button.dataset.skillResume='true';const label='resume '+RECIPES[selected].name;if(button.textContent!==label)button.textContent=label;if(buy)buy.hidden=true;}
 else if(button.dataset.skillResume){delete button.dataset.skillResume;const definition=RECIPES[selected],missing=definition&&Object.entries(definition.ingredients).some(([k,n])=>(bridge.state.larder?.[k]||0)<n);button.disabled=!!missing;button.textContent=missing?'buy the ingredients to cook':'cook '+(definition?.name||'');if(buy)buy.hidden=false;}
};
if(typeof MutationObserver!=='undefined'){new MutationObserver(entryNote).observe(document.body,{childList:true,subtree:true});entryNote();}
