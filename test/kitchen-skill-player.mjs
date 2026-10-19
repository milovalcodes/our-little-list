// A deterministic player of the public input rules, not a score setter.
import {tickStage,tapStage,strokeStage,traceStage,timingPosition} from '../little-star/kitchen-rules.mjs';
export function advance(s,seconds){for(let t=0;t<seconds&&!s.done;t+=.01)tickStage(s,Math.min(.01,seconds-t));}
export function waitForGold(s){for(let n=0;n<500&&Math.abs(timingPosition(s.elapsed-(s.pulseAt||0))-.5)>.025;n++)advance(s,.01);}
export function stroke(s,a,b,source,seconds=.35,offset=0){const start=s.elapsed*1000,path=Array.from({length:21},(_,i)=>({x:a.x+(b.x-a.x)*i/20+Math.sin(i*Math.PI/20)*offset,y:a.y+(b.y-a.y)*i/20,t:start+seconds*1000*i/20}));advance(s,seconds);strokeStage(s,path,source);}
export function trace(s,noise=0){
 const start=s.elapsed*1000;let t=start,first=s.trace[0];traceStage(s,{...first,t});
 for(let i=1;i<s.trace.length&&!s.done;i++){
  const a=s.trace[i-1],b=s.trace[i],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);
  for(let j=1;j<=n&&!s.done;j++){advance(s,.026);t+=26;traceStage(s,{x:a.x+(b.x-a.x)*j/n+Math.sin(j*Math.PI/n)*noise,y:a.y+(b.y-a.y)*j/n,t});}
 }
}
export function playStage(s,{noise=0}={}){
 switch(s.kind){
 case 'chop':for(const [a,b] of s.cuts)stroke(s,a,b,null,.35,noise);break;
 case 'stir':case 'whisk':trace(s,noise);break;
 case 'heat':for(let i=0;i<2200&&!s.done;i++){const target=.5+.12*Math.sin(s.elapsed*.95);if(s.temperature<target-.06)tapStage(s,'high');if(s.temperature>target+.06)tapStage(s,'low');advance(s,.01);}break;
 case 'spread':for(let row=0;row<3;row++){const y=115+row*27;traceStage(s,{x:108,y,t:s.elapsed*1000});for(let x=110;x<=214&&!s.done;x+=3){advance(s,.025);traceStage(s,{x,y,t:s.elapsed*1000});}for(let x=214;x>=108&&!s.done;x-=3){advance(s,.025);traceStage(s,{x,y,t:s.elapsed*1000});}s.last=null;}break;
 case 'crack':waitForGold(s);tapStage(s,'timing');stroke(s,{x:105,y:140},{x:215,y:140},null,.35,noise);break;
 case 'pour':for(const target of s.targets){const a={x:62,y:65},dt=.35;for(let n=0;n<500&&Math.abs(timingPosition(s.elapsed+dt)-.5)>.025;n++)advance(s,.01);stroke(s,a,target,null,dt,noise);}break;
 case 'top':for(let i=0;i<3;i++)stroke(s,{x:65+i*95,y:54},s.targets[i],i,.4,noise);break;
 case 'flip':advance(s,3.65);stroke(s,{x:160,y:182},{x:160,y:85},null,.35,noise);advance(s,.78);tapStage(s,'timing');break;
 case 'add':advance(s,3.1);for(const name of s.order)stroke(s,{x:{herb:65,'carrot-cut':160,potato:255}[name],y:62},{x:160,y:139},name,.4,noise);break;
 case 'ladle':trace(s,noise);trace(s,noise);break;
 case 'rinse':case 'shape':trace(s,noise);waitForGold(s);tapStage(s,'timing');break;
 case 'wrap':stroke(s,{x:65,y:57},{x:160,y:148},null,.4,noise);stroke(s,{x:107,y:145},{x:160,y:145},null,.4,noise);stroke(s,{x:211,y:145},{x:160,y:145},null,.4,noise);break;
 }
 return s;
}
