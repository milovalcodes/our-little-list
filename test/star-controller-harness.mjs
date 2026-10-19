// Shared DOM/input fixture for complete recipe controller regressions.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as gameplay from '../little-star/star-gameplay.mjs';
import {cookingReward} from '../little-star/engine.mjs';
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

export {setup,touch};
