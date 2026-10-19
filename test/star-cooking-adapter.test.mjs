import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {scenario,RECIPES} from '../little-star/engine.mjs';

const sent=[],storage=new Map(),star=scenario('ready',Date.parse('2026-10-20T17:00:00Z'));
let initialized=false;
const live={resolve(){initialized=true;}},context={starLive:live,URL,URLSearchParams,AbortSignal,crypto,console,
 DELIVERY_URL:'https://fixture.test/dispatch',sideForUid:()=> 'him',
 bootPage:async()=>({viewer:'him',data:{mode:'firebase',getIdToken:async()=> 'fixture'}}),
 navigator:{},document:{getElementById:()=>({}),addEventListener(){}},
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},location:{search:''},window:{addEventListener(){}},setInterval(){},
 fetch:async(_url,options)=>{sent.push(JSON.parse(options.body));return {ok:true,json:async()=>({star,now:star.updatedAt})};}
};
const source=readFileSync(new URL('../little-star-live.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
await vm.runInNewContext('(async()=>{'+source+'})()',context);
assert.equal(initialized,true);
for(const [recipe,definition] of Object.entries(RECIPES)){
 const command={id:'pending-'+recipe,type:'cook',petId:'star-1',payload:{sessionId:'old-'+recipe,steps:4,grades:definition.stations.map(()=>99)}};
 await live.action(command);const outgoing=sent.at(-1).command;
 assert.equal(outgoing.payload.steps,definition.stations.length);assert.equal(outgoing.id,command.id);
 assert.deepEqual(outgoing.payload.grades,command.payload.grades);assert.equal(command.payload.steps,4,'pending data is not mutated');
}
await live.action({id:'other-action',type:'visit',payload:{}});assert.equal(sent.at(-1).command.type,'visit');
await live.action({id:'new-skill-start',type:'start-cook',payload:{recipe:'toast'}});assert.equal(sent.at(-1).command.payload.challengeVersion,1);
star.cookSessions.him={id:'him-skill-session',petId:star.petId,at:star.updatedAt,recipe:'pancakes',challengeVersion:1,done:false};
const bridge=live.kitchenContext(),run={version:1,sessionId:bridge.session.id,recipe:'pancakes',phase:2},proof={version:1,sessionId:bridge.session.id,failed:false,stages:RECIPES.pancakes.stations.map(kind=>({kind,score:100,elapsed:5,failed:false}))};
bridge.save(run);bridge.proof(proof);assert.deepEqual(JSON.parse(JSON.stringify(bridge.load())),run);
await live.action({id:'resume-skill-run',type:'start-cook',payload:{recipe:'pancakes'}});assert.equal(sent.at(-1).command.payload.resumeSessionId,bridge.session.id);
await live.action({id:'recover-skill-run',type:'cook',payload:{sessionId:bridge.session.id,steps:4,grades:[100,100,100,100,100]}});assert.deepEqual(sent.at(-1).command.payload.challenge,proof);assert.equal(sent.at(-1).command.payload.steps,5);
star.cookSessions.him={...star.cookSessions.him,id:'different-session'};
assert.equal(live.kitchenContext().load(),null,'saved progress cannot leak into a new session');
await live.action({id:'new-session-claim',type:'cook',payload:{sessionId:'different-session',grades:[100,100,100,100,100]}});assert.equal(sent.at(-1).command.payload.challenge,undefined,'a different session cannot inherit a perfect proof');
console.log('COOKING ADAPTER: every recipe and persisted pending meal uses its real grade count without changing receipt IDs');
