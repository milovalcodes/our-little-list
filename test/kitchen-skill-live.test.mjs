import assert from 'node:assert/strict';
import {StarNursery,freshRecord} from '../worker/src/star-store.js';
import {scenario,RECIPES,clock} from '../little-star/engine.mjs';
import {createStage,kitchenReward} from '../little-star/kitchen-rules.mjs';
import {playStage} from './kitchen-skill-player.mjs';
const wall=Date.now;let now=Date.parse('2026-10-20T17:00:00Z'),serial=0;Date.now=()=>now;
function fixture(){
 const record=freshRecord(now);record.state=scenario('ready',now);record.state.wallets={him:500,her:500};record.state.larder={};
 const store=new Map([['nursery',record]]),nursery=new StarNursery({storage:{transaction:async fn=>{const draft=new Map(structuredClone([...store]));const result=await fn({get:async k=>structuredClone(draft.get(k)),put:async(k,v)=>draft.set(k,structuredClone(v))});store.clear();for(const [k,v] of draft)store.set(k,v);return result;}}},{});
 return {store,act:async(actor,type,payload={},id='skill-'+(++serial))=>{const response=await nursery.fetch(new Request('https://internal/',{method:'POST',body:JSON.stringify({op:'act',actor,command:{petId:'star-1',id,type,payload}})}));return {status:response.status,...await response.json()};}};
}
async function start(f,actor,recipe){if(Object.keys(RECIPES[recipe].ingredients).length)assert.equal((await f.act(actor,'buy-ingredients',{recipe})).status,200);const r=await f.act(actor,'start-cook',{recipe,challengeVersion:1});assert.equal(r.status,200,r.error);return r;}
function resultPayload(started,actor,grade=100,failedAt=-1){
 const session=started.star.cookSessions[actor],stages=RECIPES[session.recipe].stations.map((kind,i)=>{const s=playStage(createStage(kind,session.id+':'+i));return {kind,score:grade,elapsed:s.elapsed,failed:false};});
 if(failedAt>=0){stages.splice(failedAt+1);Object.assign(stages.at(-1),{score:0,failed:true,elapsed:2});}
 const grades=RECIPES[session.recipe].stations.map((_,i)=>stages[i]?.score||0);
 return {sessionId:session.id,steps:grades.length,grades,challenge:{version:1,sessionId:session.id,failed:failedAt>=0,stages}};
}
try{
 for(const actor of ['him','her'])for(const [recipe,def] of Object.entries(RECIPES)){
  for(const grade of [54,55,70,90,100]){
   const f=fixture(),r=await start(f,actor,recipe),initial=structuredClone(r.star),payload=resultPayload(r,actor,grade),id='collect-'+(++serial);
   assert.equal((await f.act(actor,'cook',payload,id)).status,400,'instant success rejected');now+=60000;
   const missing=structuredClone(payload);delete missing.challenge;assert.equal((await f.act(actor,'cook',missing)).status,400,'new sessions cannot downgrade to legacy rewards');
   const result=await f.act(actor,'cook',payload,id),pay=kitchenReward(grade);assert.equal(result.status,200,result.error);
   assert.equal(result.star.pantry[def.dish]||0,(initial.pantry[def.dish]||0)+pay.portions,recipe+' meals');assert.equal(result.star.wallets[actor],initial.wallets[actor]+pay.tip,recipe+' dust');
   assert.deepEqual(result.star.wallets[actor==='him'?'her':'him'],initial.wallets[actor==='him'?'her':'him']);assert.deepEqual(result.star.larder,initial.larder,'no ingredient refunds');
   const retry=await f.act(actor,'cook',payload,id);assert.equal(retry.duplicate,true);assert.deepEqual(retry.star.pantry,result.star.pantry);assert.deepEqual(retry.star.wallets,result.star.wallets);
   assert.equal((await f.act(actor,'cook',payload)).status,400,'another receipt cannot double collect');
   if(grade<55){assert.equal(result.star.xp,initial.xp);assert.deepEqual(result.star.memories,initial.memories);}
  }
  for(let i=0;i<def.stations.length;i++){
   const f=fixture(),r=await start(f,actor,recipe),payload=resultPayload(r,actor,100,i);now+=60000;const fail=await f.act(actor,'cook',payload);assert.equal(fail.status,200,fail.error);assert.deepEqual(fail.star.pantry,r.star.pantry);assert.deepEqual(fail.star.wallets,r.star.wallets);assert.equal(fail.star.cookSessions[actor].failed,true);
  }
  const f=fixture(),r=await start(f,actor,recipe),session=r.star.cookSessions[actor];
  const resumed=await f.act(actor,'start-cook',{recipe,challengeVersion:1,resumeSessionId:session.id});assert.equal(resumed.star.cookSessions[actor].id,session.id);assert.deepEqual(resumed.star.larder,r.star.larder);
  const cancel=await f.act(actor,'cancel-cook');assert.equal(cancel.status,200);assert.deepEqual(cancel.star.larder,r.star.larder,'discard consumes ingredients');assert.deepEqual(cancel.star.pantry,r.star.pantry);
 }
 const f=fixture();for(let batch=0;batch<4;batch++){const r=await start(f,'him','porridge'),payload=resultPayload(r,'him');now+=60000;const done=await f.act('him','cook',payload);assert.equal(done.status,200);assert.equal(done.star.wallets.him-r.star.wallets.him,batch<3?8:0,'three chef bonus cap');}
 const record=f.store.get('nursery');record.state.pantry.porridge=91;f.store.set('nursery',record);assert.equal((await f.act('him','start-cook',{recipe:'porridge',challengeVersion:1})).status,400,'room for all nine meals required');
 console.log('LIVE SKILL KITCHEN: all recipes/two accounts, every reward tier, failure at every station, ingredient stakes, resume/discard, early/downgrade/duplicate prevention and daily chef cap pass');
}finally{Date.now=wall;}
