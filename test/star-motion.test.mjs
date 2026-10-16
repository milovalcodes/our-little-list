import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as gameplay from '../little-star/star-gameplay.mjs';

// Execute the actual bundled controllers without a browser or live save.
class Node {
 constructor(){this.nodes=new Map();this.children=[];this.events=new Map();this.dataset={};this.style={setProperty(){}};this.isConnected=true;this.inert=false;this.textContent='';this.clientWidth=320;this.clientHeight=250;this.classList={add(){},remove(){},toggle(){}};this.motion=[];}
 addEventListener(name,fn){this.events.set(name,fn);}
 dispatchEvent(e){this.events.get(e.type)?.(e);}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Node());return this.nodes.get(s);}
 querySelectorAll(){return [];}
 setAttribute(name,value){this[name]=value;}
 closest(){return null;}
 insertAdjacentHTML(){}focus(){}remove(){this.removed=true;}append(n){this.children.push(n);}
 animate(frames,options){const a={frames,options,playState:'running',finished:new Promise(()=>{}),pause(){this.playState='paused';},play(){this.playState='running';},cancel(){this.playState='idle';}};this.motion.push(a);return a;}
 getAnimations(){return this.motion;}
}
let clock=0,frame,reduced=false,resizeCallback,disconnected=false;
const doc=new Node(),win=new Node();doc.activeElement=new Node();doc.hidden=false;doc.createElement=()=>new Node();
const env={...gameplay,uiIcon:()=>'',document:doc,window:win,console,AbortController,Event,performance:{now:()=>clock},matchMedia:()=>({matches:reduced}),requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){},ResizeObserver:class{constructor(fn){resizeCallback=fn;}observe(){}disconnect(){disconnected=true;}}};
vm.createContext(env);vm.runInContext(readFileSync(new URL('./fixtures/star-playroom.js',import.meta.url),'utf8'),env);
const host=new Node(),ctl=env.toyController(host),sprite=new Node();
const first=ctl.animate(sprite,[{opacity:0},{opacity:1}],160);
const second=ctl.animate(sprite,[{opacity:1},{opacity:0}],160);
assert.equal(first.playState,'idle','repeat hits replace the old pulse');
ctl.pause();assert.equal(second.playState,'paused');ctl.resume();assert.equal(second.playState,'running');
reduced=true;assert.equal(ctl.animate(sprite,[],100),null);reduced=false;
ctl.destroy();assert.equal(second.playState,'idle');assert.equal(ctl.animate(sprite,[],100),null);
console.log('PASS repeated animation attacks, pause/resume, reduced motion and teardown');

const catchHost=new Node(),g={type:'catch'},stage=catchHost.querySelector('.catch-stage');let reads=0;
Object.defineProperty(stage,'clientWidth',{get(){reads++;return 320;}});Object.defineProperty(stage,'clientHeight',{get(){reads++;return 250;}});
const catching=env.mountStarCatch(catchHost,{game:g,sprite:()=>'',pet:'',beep(){},finish(){}});g.ready=true;
const initialReads=reads;clock+=100;frame(clock);assert.equal(reads,initialReads,'substeps must not cause synchronous geometry reads');
assert.match(catchHost.querySelector('.catch-basket').style.translate,/px 0$/);
resizeCallback();assert.equal(reads,initialReads+2,'geometry refreshes when the playfield resizes');
// A collected wish is retained just for its exit animation, never re-scored.
g.spawn=2;const wish=new Node();g.objects=[{id:1,x:g.basketX,y:184,cloud:false,node:wish}];
clock+=17;frame(clock);assert.equal(g.caught,1);assert.equal(g.objects.length,0);assert.equal(wish.removed,undefined);
clock+=200;frame(clock);assert.equal(wish.removed,true);assert.equal(g.caught,1);
catching.destroy();assert.equal(disconnected,true);
console.log('PASS one-frame rendering, resize tracking, catch feedback and single scoring');

const pairHost=new Node(),cards=Array.from({length:16},()=>new Node());pairHost.querySelectorAll=s=>s==='[data-pair]'?cards:[];
const pairs={type:'pairs',restored:true,total:8,level:8,cards:['sun','moon','star','heart','orbit','cloud','bowl','soap'].flatMap(n=>[n,n]),matched:Array.from({length:14},(_,i)=>i),flipped:[],moves:7,left:70,preview:0,delay:0,waiting:false,combo:7,bestCombo:7};let finished=0;
const pairing=env.mountStarPairs(pairHost,{game:pairs,shuffle:x=>x,beep(){},finish(){finished++;pairs.done=true;}});pairing.resume();
pairing.pick(14);pairing.pick(15);assert.equal(pairs.matched.length,16);assert.equal(finished,0,'last pair stays visible before the result');
pairing.pause();clock+=500;frame(clock);assert.equal(finished,0);pairing.resume();clock+=450;frame(clock);assert.equal(finished,1);assert.equal(pairs.left,70,'a won board cannot lose clock time during its flourish');pairing.destroy();
console.log('PASS final-pair settling, pause-safe completion and unchanged timing score');

const echoHost=new Node(),pads=Array.from({length:4},()=>new Node());echoHost.querySelectorAll=s=>s==='[data-note]'?pads:[];
const echo={type:'echo',restored:true,sequence:[0,0],input:[],mistakes:0,replays:0,longest:0,echoPhase:'watch'},notes=[];
const echoing=env.mountStarEcho(echoHost,{game:echo,pet:'',beep:(n,ms)=>notes.push([n,ms]),finish(){}});echoing.resume();
clock+=450;frame(clock);assert.equal(notes.length,1);clock+=640;frame(clock);assert.equal(notes.length,2);assert.equal(pads[0].motion.length,2,'repeated identical notes each animate');assert.equal(pads[0].motion[0].playState,'idle');assert.equal(notes[0][1],460,'tone duration follows the demonstrated light');
clock+=640;frame(clock);assert.equal(echo.echoPhase,'repeat');echoing.note(0);echoing.note(0);assert.equal(echo.longest,2);echoing.destroy();
console.log('PASS repeated Echo cues, matched sound/light timing and accepted repeat inputs');
