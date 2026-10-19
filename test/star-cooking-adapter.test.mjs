import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {scenario,RECIPES} from '../little-star/engine.mjs';

const sent=[],star=scenario('ready',Date.parse('2026-10-20T17:00:00Z'));
let initialized=false;
const live={resolve(){initialized=true;}},context={starLive:live,URL,URLSearchParams,AbortSignal,crypto,console,
 DELIVERY_URL:'https://fixture.test/dispatch',sideForUid:()=> 'him',
 bootPage:async()=>({viewer:'him',data:{mode:'firebase',getIdToken:async()=> 'fixture'}}),
 navigator:{},document:{getElementById:()=>({}),addEventListener(){}},
 localStorage:{getItem:()=>null},location:{search:''},window:{addEventListener(){}},setInterval(){},
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
console.log('COOKING ADAPTER: every recipe and persisted pending meal uses its real grade count without changing receipt IDs');
