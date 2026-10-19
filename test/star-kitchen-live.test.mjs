// Upgrade actual persisted pre-kitchen saves through the live server boundary.
import assert from 'node:assert/strict';
import {StarNursery,freshRecord} from '../worker/src/star-store.js';
import {scenario,INGREDIENTS} from '../little-star/engine.mjs';

const wallNow=Date.now;
let now=Date.parse('2026-10-20T17:00:00Z'),serial=0;
Date.now=()=>now;
function fixture(larder){
 const record=freshRecord(now);record.state=scenario('ready',now);
 record.state.wallets={him:815,her:230};record.paid={saved:{points:50}};
 if(larder===undefined)delete record.state.larder;else record.state.larder=larder;
 const values=new Map([['nursery',record]]);
 const object=new StarNursery({storage:{transaction:fn=>fn({get:async k=>structuredClone(values.get(k)),put:async(k,v)=>values.set(k,structuredClone(v))})}},{});
 const request=async input=>{const response=await object.fetch(new Request('https://internal/',{method:'POST',body:JSON.stringify(input)}));const result=await response.json();assert.equal(response.status,200,result.error);return result;};
 const act=(actor,type,payload={},id='upgrade-'+(++serial))=>request({op:'act',actor,command:{type,payload,id,petId:'star-1'}});
 return {values,request,act};
}
try{
 // Opening an old save must expose a usable larder before the first action.
 for(const actor of ['him','her']){
  const f=fixture(),before=structuredClone(f.values.get('nursery'));
  const opened=await f.request({op:'read',actor});
  assert.ok(opened.star.larder,'old saves have an ingredient inventory');
  assert.equal(opened.star.larder.bread||0,0);
  assert.deepEqual(opened.star.wallets,before.state.wallets);
  for(const key of ['name','petId','pantry','owned','stage','phaseAt','memories'])assert.deepEqual(opened.star[key],before.state[key],key+' survives migration');
  assert.deepEqual(f.values.get('nursery').paid,before.paid,'reward ledger survives');
  const bought=await f.act(actor,'buy-ingredients',{recipe:'toast'},'buy-toast');
  assert.equal(bought.star.larder.bread,1);
  const retried=await f.act(actor,'buy-ingredients',{recipe:'toast'},'buy-toast');
  assert.equal(retried.duplicate,true);assert.deepEqual(retried.star.wallets,bought.star.wallets);
  let started=await f.act(actor,'start-cook',{recipe:'toast'});
  now+=9000;
  const cooked=await f.act(actor,'cook',{sessionId:started.star.cookSessions[actor].id,steps:4,grades:[90,90,90,90]});
  assert.ok(cooked.star.pantry.toast>before.state.pantry.toast);
  assert.equal(cooked.star.larder.bread,0);
 }
 // First action and scheduler upgrade old saves too; no preliminary read needed.
 const direct=fixture();assert.equal((await direct.act('him','buy-ingredients',{item:'bread'})).star.larder.bread,1);
 const tick=fixture();await tick.request({op:'tick'});assert.ok(tick.values.get('nursery').state.larder);
 // Existing stocks must never be replaced by the migration.
 const stock={bread:7,berries:4};const existing=fixture(stock);
 assert.deepEqual((await existing.request({op:'read',actor:'her'})).star.larder,stock);
 // Paid arcade settlement can award an ingredient on the migrated save.
 const arcade=fixture();const started=await arcade.act('him','start-play',{game:'pairs',arcadeVersion:2,level:8});
 now+=60000;
 const earned=await arcade.act('him','play',{game:'pairs',sessionId:started.star.playSessions.him.id,arcade:{total:8,matched:8,moves:8,left:60}});
 assert.equal(earned.star.larder.bread,1);assert.match(earned.message,/Found/);
 assert.ok(INGREDIENTS.some(i=>i.id==='bread'));
 console.log('LIVE KITCHEN UPGRADE: both players, old saves, stock preservation, purchases/retries, toast cooking and arcade ingredients pass');
}finally{Date.now=wallNow;}
