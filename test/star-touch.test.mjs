// Generated controller touch regressions; source: companion star-touch.test.mjs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as gameplay from '../little-star/star-gameplay.mjs';
import {cookingReward} from '../little-star/engine.mjs';

// Exercise the production pointer handlers with touch identities and cancelled
// contacts. This is a DOM test double, not a claim of native-device testing.
class Element {
 constructor(selector='',parent=null){this.selector=selector;this.parent=parent;this.nodes=new Map();this.events=new Map();this.children=[];this.dataset={};this.style={setProperty(){},removeProperty(){}};this.isConnected=true;this.clientWidth=320;this.clientHeight=250;this.inert=false;this.attributes={};this.captures=new Set();this.firstElementChild={style:{}};const classes=new Set();this.classList={add:n=>classes.add(n),remove:n=>classes.delete(n),toggle:(n,on)=>on?classes.add(n):classes.delete(n),contains:n=>classes.has(n)};const m=selector.match(/\[data-([\w-]+)="([^"]+)"\]/);if(m)this.dataset[m[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2];}
 addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);}
 dispatchEvent(e){this.fire(e.type,e);}
 fire(type,e={}){for(const fn of this.events.get(type)||[])fn({target:this,detail:1,preventDefault(){},...e});}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element(s,this));return this.nodes.get(s);}
 querySelectorAll(s){const counts={'[data-slice]':3,'[data-topping]':3,'[data-plate-target]':3,'[data-spread]':9};if(counts[s])return Array.from({length:counts[s]},(_,i)=>this.querySelector(s.slice(0,-1)+'="'+i+'"]'));return [];}
 closest(s){if(s.includes(','))return s.split(',').map(part=>this.closest(part)).find(Boolean)||null;if(s==='button:disabled')return null;if(s==='button'&&this.selector.startsWith('[data-'))return this;if(this.selector===s||this.selector.startsWith(s.slice(0,-1)+'='))return this;return this.parent?.closest(s)||null;}
 hasAttribute(s){return this.selector.includes('['+s+']')||this.selector.includes('['+s+'=');}
 setAttribute(n,v){this.attributes[n]=v;}getAttribute(n){return this.attributes[n];}
 getBoundingClientRect(){return {left:0,top:0,width:320,height:250};}
 setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);}
 insertAdjacentHTML(){}focus(){}remove(){}append(n){this.children.push(n);}contains(n){return n===this||n?.parent===this;}
}
function setup(){
 let clock=0,frame;const document=new Element(),window=new Element();document.hidden=false;document.activeElement=new Element();document.createElement=()=>new Element();
 const sandbox={...gameplay,cookingReward,document,window,AbortController,Event,console,performance:{now:()=>clock},requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){}};
 vm.createContext(sandbox);for(const name of ['star-playroom.js','star-cooking.js'])vm.runInContext(readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8'),sandbox);
 return {sandbox,window,host:new Element(),elapse(ms){clock+=ms;},step(ms){clock+=ms;frame(clock);},tick(ms){for(let left=ms;left>0;left-=50){clock+=Math.min(left,50);frame(clock);}}};
}
const touch=(target,id,x,y,primary=true)=>({target,pointerId:id,pointerType:'touch',isPrimary:primary,button:0,clientX:x,clientY:y,preventDefault(){}});
function cooking(recipe='porridge'){
 const h=setup(),done=[];h.ctl=h.sandbox.mountStarCooking(h.host,{recipe,random:()=>.5,sprite:()=>'',foodSprite:()=>'',beep(){},complete:r=>done.push(r)});h.done=done;h.work=h.host.querySelector('.recipe-worktop');
 h.input=(type,target,id,x,y,primary=true)=>h.host.fire(type,touch(target,id,x,y,primary));
 h.tap=(target,x,y)=>{h.input('pointerdown',target,1,x,y);h.input('pointerup',target,1,x,y);h.tick(250);};
 return h;
}
const cook=cooking();
const roundCook=cooking();
for(let i=0;i<6;i++)roundCook.tap(roundCook.work,92+Math.floor(i/2)*83.2,132.5);
roundCook.tick(1000);
// Follow the exact ellipse drawn on the pot, including a wrapped final sample.
roundCook.input('pointerdown',roundCook.work,81,192,111);
for(let i=1;i<=96&&!roundCook.ctl.snapshot().transition;i++){
 roundCook.tick(60);const angle=i*Math.PI/16;
 roundCook.input('pointermove',roundCook.work,81,160+32*Math.cos(angle),111+14*Math.sin(angle));
}
assert.equal(roundCook.ctl.snapshot().grades[1],100,'three circles on the visible guide finish without an extra nudge');
roundCook.input('pointerup',roundCook.work,81,192,111);roundCook.tick(900);assert.equal(roundCook.ctl.snapshot().phase,2);
console.log('PASS guide-aligned stirring completes on the third circle');
// Enter on another control must not become a stirring hold. Native keyboard
// activation of retry/pause/navigation must remain available at this station.
const keyboardCook=cooking();
for(let i=0;i<6;i++)keyboardCook.tap(keyboardCook.work,92+Math.floor(i/2)*83.2,132.5);
keyboardCook.tick(1200);
let swallowed=false;
keyboardCook.host.fire('keydown',{target:keyboardCook.host.querySelector('[data-retry-station]'),key:'Enter',preventDefault(){swallowed=true;}});
keyboardCook.tick(500);
assert.equal(swallowed,false);assert.equal(keyboardCook.ctl.snapshot().stir,0);
keyboardCook.host.fire('keydown',{target:keyboardCook.host.querySelector('[data-cook-assist]'),key:'Enter',preventDefault(){swallowed=true;}});
keyboardCook.tick(500);assert.equal(swallowed,true);assert.ok(keyboardCook.ctl.snapshot().stir>0);
keyboardCook.window.fire('keyup',{key:'Enter'});
for(let i=0;i<6;i++)cook.tap(cook.work,92+Math.floor(i/2)*83.2,132.5);
cook.tick(1200);assert.equal(cook.ctl.snapshot().phase,1);
const assist=cook.host.querySelector('[data-cook-assist]');
cook.input('pointerdown',assist,7,0,0);cook.tick(500);const before=cook.ctl.snapshot().stir;
cook.input('pointerup',assist,8,0,0,false);cook.tick(500);assert.ok(cook.ctl.snapshot().stir>before,'second finger must not stop held stirring');
cook.input('pointercancel',assist,7,0,0);const cancelled=cook.ctl.snapshot().stir;cook.tick(500);assert.equal(cook.ctl.snapshot().stir,cancelled,'owner cancel releases stirring');
cook.input('pointerdown',assist,9,0,0);cook.window.fire('orientationchange');assert.equal(cook.ctl.isPaused(),true);cook.ctl.resume();const rotated=cook.ctl.snapshot().stir;cook.tick(500);assert.equal(cook.ctl.snapshot().stir,rotated,'rotation must not leave a hold active');
cook.input('pointerdown',assist,10,0,0);for(let i=0;i<10;i++)cook.step(1000);cook.tick(1200);assert.equal(cook.ctl.snapshot().phase,2,'one-frame-per-second hold remains completable before the timer');
// A removed hold button may never deliver its pointerup to the old host.
// Completing the station must clear that owner before the next gesture.
const heat=cook.host.querySelector('[data-heat]');heat.parent=cook.work;
cook.input('pointerdown',heat,11,160,225);assert.equal(cook.ctl.snapshot().held,true,'completed hold cannot block the next station');cook.tick(1000);cook.input('pointercancel',heat,12,160,225,false);assert.equal(cook.ctl.snapshot().held,true);
cook.tick(2000);cook.elapse(650);cook.input('pointerup',heat,11,160,225);cook.tick(1200);assert.equal(cook.ctl.snapshot().grades[2],100,'heat grades the actual release, not the last rendered frame');
for(const [i,p] of [{x:144,y:142},{x:185,y:144},{x:160,y:163}].entries()){
 const berry=cook.host.querySelector('[data-topping="'+i+'"]');berry.parent=cook.work;
 cook.tap(berry,70+i*80,60);
 const ring=cook.host.querySelector('[data-plate-target="'+i+'"]');ring.parent=cook.work;
 // The expanded finger target must grade exactly like keyboard activation,
 // even when the browser delivers the tap away from the ring's visual center.
 cook.tap(ring,p.x+22,p.y-19);
 // A compatibility click must not place the following berry a second time.
 cook.host.fire('click',{target:cook.host.querySelector('[data-plate-target="'+i+'"]'),detail:1});
 assert.equal(cook.ctl.snapshot().plated.length,i+1);
}
assert.equal(cook.ctl.snapshot().phase,3,'three touches do not auto-serve');
cook.host.fire('click',{target:cook.host.querySelector('[data-finish-plate]')});cook.tick(1200);assert.equal(cook.done[0].score,100);
console.log('PASS touch cooking: owner-only holds, orientation pause, tap-to-place, no double click, full perfect recipe');

const toast=cooking('toast');
for(let i=0;i<6;i++)toast.tap(toast.work,92+Math.floor(i/2)*83.2,132.5);
toast.tick(1200);
for(let row=0;row<3;row++)for(let col=0;col<3;col++){
 const x=123+col*37,y=121+row*37;
 toast.input('pointerdown',toast.work,51,x,y);
 for(let pass=0;pass<10;pass++)toast.input('pointermove',toast.work,51,x+(pass%2?12:-12),y);
 toast.input('pointerup',toast.work,51,x,y);
}
assert.equal(toast.ctl.snapshot().grades[1],100,'all visible bread regions can be spread with touch');
for(let i=0;i<9;i++)assert.equal(toast.host.querySelector('[data-jam="'+i+'"]').style.opacity,1,'jam art follows actual coverage');
toast.tick(1200);const toastHeat=toast.host.querySelector('[data-heat]');toastHeat.parent=toast.work;
toast.input('pointerdown',toastHeat,52,160,225);toast.tick(3680);toast.input('pointerup',toastHeat,52,160,225);toast.tick(1200);
for(let i=0;i<3;i++){const target=toast.host.querySelector('[data-plate-target="'+i+'"]');target.parent=toast.work;toast.tap(target,160,142);}
toast.host.fire('click',{target:toast.host.querySelector('[data-finish-plate]')});toast.tick(1200);
assert.equal(toast.done[0].score,100);assert.deepEqual(Array.from(toast.done[0].grades),[100,100,100,100]);
console.log('PASS toast: bread-aligned touch spreading reveals contiguous jam; heating, plating and perfect-score rewards remain unchanged');

const interrupted=cooking();interrupted.tap(interrupted.work,92,132.5);interrupted.input('pointerdown',interrupted.work,21,92,132.5);interrupted.input('pointercancel',interrupted.work,21,92,132.5);interrupted.input('pointerup',interrupted.work,21,92,132.5);assert.equal(interrupted.ctl.snapshot().chops,1,'cancel must not turn into a chop');
console.log('PASS cancelled touch does not chop or award progress');

const catchTest=setup(),g={type:'catch'};catchTest.sandbox.mountStarCatch(catchTest.host,{game:g,sprite:()=>'',pet:'',beep(){},finish(){}});g.ready=true;
const right=catchTest.host.querySelector('[data-steer="1"]');catchTest.host.fire('pointerdown',touch(right,31,10,10));catchTest.tick(100);const target=g.targetX;
catchTest.host.fire('pointerup',touch(right,32,10,10,false));catchTest.tick(100);assert.ok(g.targetX>target);
catchTest.host.fire('pointercancel',touch(right,31,10,10));const stopped=g.targetX;catchTest.tick(100);assert.equal(g.targetX,stopped);
const stage=catchTest.host.querySelector('.catch-stage');stage.fire('pointerdown',touch(stage,33,70,100));stage.fire('pointermove',touch(stage,34,290,100,false));assert.equal(g.targetX,70);stage.fire('pointermove',touch(stage,33,90,100));assert.equal(g.targetX,90);stage.fire('pointercancel',touch(stage,33,90,100));stage.fire('pointermove',touch(stage,33,180,100));assert.equal(g.targetX,90);
console.log('PASS catch touch capture ignores other fingers and releases on cancellation');

