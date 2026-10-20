import assert from 'node:assert/strict';
import {STATIONS,createStage,tapStage,strokeStage,traceStage,tickStage,kitchenReward} from '../little-star/kitchen-rules.mjs';
import {playStage,advance,stroke} from './kitchen-skill-player.mjs';
for(const kind of Object.keys(STATIONS)){
 const times=[];
 for(let seed=0;seed<30;seed++){
  const s=playStage(createStage(kind,String(seed)));assert.equal(s.done,true,kind+' must be completable');assert.equal(s.failed,false,kind);assert.equal(s.score,100,kind+' perfect must be attainable');assert.ok(s.elapsed<s.limit*.8,kind+' needs time for human input');times.push(s.elapsed);
  const wobbly=playStage(createStage(kind,String(seed)),{noise:8});assert.ok(wobbly.done&&!wobbly.failed,kind+' tolerates a small hand wobble');assert.ok(wobbly.score>=90,kind+' normal touch precision');
  const idle=createStage(kind,String(seed));advance(idle,idle.limit+.1);assert.equal(idle.failed,true,kind+' cannot reward waiting');assert.equal(idle.score,0);
 }
 console.log(kind+': perfect active play '+Math.min(...times).toFixed(1)+'–'+Math.max(...times).toFixed(1)+'s / '+STATIONS[kind].seconds+'s limit');
}
for(const kind of ['chop','stir','whisk','rinse','shape','ladle','spread','top','wrap','pour']){
 const s=createStage(kind,'no-shortcuts');for(let i=0;i<100;i++){advance(s,.05);tapStage(s,'timing');traceStage(s,{x:160,y:140,t:i*50});}assert.equal(s.done,false,kind+' cannot be beaten by holding or repeatedly tapping');
}
const bad=createStage('chop','bad');for(let i=0;i<4;i++)stroke(bad,{x:10,y:10},{x:20,y:20});assert.equal(bad.failed,true);
// A finger can wobble and start near an endpoint without losing a perfect
// cut. Reversing the stroke or cutting far from the line still cannot pass.
const touchCuts=createStage('chop','touch');
for(const [a,b] of touchCuts.cuts)stroke(touchCuts,{x:a.x-10,y:a.y},{x:b.x-10,y:b.y},null,2,10);
assert.equal(touchCuts.score,100,'nearby touch starts and a small wobble earn perfect cuts');
const reversed=createStage('chop','reverse'),[cutStart,cutEnd]=reversed.cuts[0];stroke(reversed,cutEnd,cutStart);assert.equal(reversed.index,0);
const burn=createStage('heat','burn');tapStage(burn,'high');advance(burn,8);assert.equal(burn.failed,true);
const raw=createStage('flip','raw');stroke(raw,{x:160,y:182},{x:160,y:85});assert.equal(raw.failed,true);
const miss=createStage('top','miss');for(let i=0;i<4;i++)stroke(miss,{x:65,y:54},{x:1,y:240},0);assert.equal(miss.failed,true);
assert.equal(kitchenReward(54).portions,0);assert.equal(kitchenReward(100,true).portions,0);assert.equal(kitchenReward(100).portions,3*kitchenReward(95).portions);assert.equal(kitchenReward(100).tip,8);
console.log('SKILL COOKING: every station, 30 seeds, perfect/noisy inputs, timers, burn/raw/spill failure, no tap/hold shortcuts and triple reward pass');
