import assert from 'node:assert/strict';
import {setup,touch} from './star-controller-harness.mjs';
import {RECIPES} from '../little-star/engine.mjs';

for(const retry of [false,true])for(const [id,definition] of Object.entries(RECIPES)){
 const h=setup(),done=[];
 const ctl=h.sandbox.mountStarCooking(h.host,{recipe:id,stations:definition.stations,dish:definition.dish,random:()=>.5,sprite:()=>'',foodSprite:()=>'',beep(){},complete:r=>done.push(r)});
 const click=selector=>h.host.fire('click',{target:h.host.querySelector(selector),detail:0});
 if(retry)click('[data-retry-station]');
 for(const [phase,station] of definition.stations.entries()){
  assert.equal(ctl.snapshot().phase,phase,id+' reaches '+station);
  if(station==='chop')for(let n=0;n<6;n++){click('[data-slice="'+Math.floor(n/2)+'"]');h.tick(250);}
  else if(station==='stir'||station==='whisk'){
   h.host.fire('keydown',{target:h.host.querySelector('[data-cook-assist]'),key:'ArrowRight',repeat:false,preventDefault(){}});
   h.tick(station==='whisk'?15000:9000);h.window.fire('keyup',{key:'ArrowRight'});
  }else if(station==='heat'||station==='pour'){
   const button=h.host.querySelector('[data-heat]');h.host.fire('keydown',{target:button,key:'Enter',repeat:false,preventDefault(){}});h.tick(3700);h.window.fire('keyup',{key:'Enter'});
  }else if(station==='top'){
   for(let n=0;n<3;n++)click('[data-plate-target="'+n+'"]');click('[data-finish-plate]');
  }else if(station==='spread')for(let n=0;n<18;n++)click('[data-spread-help]');
  else if(station==='crack')click('[data-crack]');
  else if(station==='flip'){h.tick(4400);click('[data-flip]');}
  else if(station==='add')for(const item of ctl.snapshot().order)click('[data-add="'+item+'"]');
  else if(station==='ladle')for(let n=0;n<3;n++){click('[data-scoop]');click('[data-serve-scoop]');}
  else if(station==='rinse')for(let n=0;n<4;n++)click('[data-rinse-help]');
  else if(station==='shape')for(let n=0;n<4;n++)click('[data-press]');
  else if(station==='wrap')click('[data-wrap]');
  else assert.fail('No input coverage for '+station);
  h.tick(1100);
 }
 assert.equal(done.length,1,id+' completes exactly once');assert.equal(done[0].grades.length,definition.stations.length);
 assert.equal(done[0].practice,retry);assert.ok(done[0].grades.every(n=>Number.isInteger(n)&&n>=0&&n<=100));
 assert.equal(ctl.snapshot().phase,definition.stations.length);ctl.destroy();
 console.log('COMPLETE CONTROLLER: '+id+' · '+definition.stations.join(' → '));
}
