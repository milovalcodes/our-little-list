import assert from 'node:assert/strict';
import {StarNursery,freshRecord} from '../worker/src/star-store.js';
import {scenario,RECIPES,cookingReward} from '../little-star/engine.mjs';

const wallNow=Date.now;let now=Date.parse('2026-10-20T17:00:00Z'),serial=0;
Date.now=()=>now;
function nursery(){
 const record=freshRecord(now);record.state=scenario('ready',now);record.state.wallets={him:500,her:500};record.state.larder={};
 const values=new Map([['nursery',record]]);
 const object=new StarNursery({storage:{transaction:async fn=>{
  const staged=new Map(structuredClone([...values]));
  const reply=await fn({get:async k=>structuredClone(staged.get(k)),put:async(k,v)=>staged.set(k,structuredClone(v))});
  values.clear();for(const [k,v] of staged)values.set(k,v);return reply;
 }}},{});
 return async(actor,type,payload={},id='recipe-'+(++serial))=>{
  const response=await object.fetch(new Request('https://internal/',{method:'POST',body:JSON.stringify({op:'act',actor,command:{type,payload,id,petId:'star-1'}})}));
  return {status:response.status,...await response.json()};
 };
}
try{
 for(const actor of ['him','her'])for(const [recipe,definition] of Object.entries(RECIPES)){
  const act=nursery(),count=definition.stations.length;
  if(Object.keys(definition.ingredients).length)assert.equal((await act(actor,'buy-ingredients',{recipe})).status,200);
  let started=await act(actor,'start-cook',{recipe});assert.equal(started.status,200);
  const initial=started.star.pantry[definition.dish]||0;
  const payload={sessionId:started.star.cookSessions[actor].id,steps:4,grades:definition.stations.map(()=>99)},id='collect-'+(++serial);
  assert.equal((await act(actor,'cook',payload,id)).status,400,'instant collection stays blocked');now+=9000;
  const short=await act(actor,'cook',{...payload,grades:payload.grades.slice(1)});assert.equal(short.status,400,'a partial '+recipe+' cannot settle');
  const invalid=await act(actor,'cook',{...payload,grades:payload.grades.map(()=>101)});assert.equal(invalid.status,400,'invalid grades cannot settle');
  const result=await act(actor,'cook',payload,id);
  assert.equal(result.status,200,recipe+': '+result.error);
  assert.equal(result.star.pantry[definition.dish],initial+cookingReward(99).portions,recipe+' lands in the pantry');
  const duplicate=await act(actor,'cook',payload,id);assert.equal(duplicate.duplicate,true);assert.deepEqual(duplicate.star.wallets,result.star.wallets);
  // A pending old request and the corrected adapter use the same receipt.
  const recovered=await act(actor,'cook',{...payload,steps:count},id);assert.equal(recovered.duplicate,true);
  assert.equal(recovered.star.pantry[definition.dish],result.star.pantry[definition.dish]);
  assert.equal((await act(actor,'cook',payload)).status,400,'another ID cannot collect twice');
  // Collect & cook again: a fresh batch can start and settle normally.
  if(Object.keys(definition.ingredients).length)assert.equal((await act(actor,'buy-ingredients',{recipe})).status,200);
  started=await act(actor,'start-cook',{recipe});assert.equal(started.status,200);now+=9000;
  const again=await act(actor,'cook',{sessionId:started.star.cookSessions[actor].id,steps:count,grades:definition.stations.map(()=>80)});
  assert.equal(again.status,200);assert.ok(again.star.pantry[definition.dish]>result.star.pantry[definition.dish]);
 }
 console.log('ALL RECIPE COLLECTIONS: 3/4/5 stations, both accounts, old payloads, retry/recovery, cook again, invalid/early/duplicate collection pass');
}finally{Date.now=wallNow;}
