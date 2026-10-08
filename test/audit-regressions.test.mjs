import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { saveQuickStatus } from '../status-presets.js';
import * as places from '../place-presets.js';
import * as journey from '../journey.js';

let status={expiresAt:1,text:'old words'};
const data={setTo:async(_,__,patch)=>Object.assign(status,patch),notify:async()=>({queued:true})};
await saveQuickStatus({data,viewer:'him',other:'her',exists:true},'busy');
assert.equal(status.text,'busy');assert.equal(status.expiresAt,0);
status.expiresAt=123;
await saveQuickStatus({data,viewer:'him',other:'her',exists:true},'focus');
assert.equal(status.expiresAt,123,'focus does not extend the separate custom status');
console.log('ok quick statuses replace old expiry, while focus leaves custom words alone');

const source=readFileSync(new URL('../auto-location.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const tick=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function locationHarness({permission='granted',paused=false}={}){
  const local=new Map(paused?[['our-little-list-location-paused-him','yes']]:[]);
  const storage={getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,String(value)),removeItem:key=>local.delete(key)};
  const writes=[],pings=[],callbacks=[];let statusRead=async()=>[];
  const win={isSecureContext:true,addEventListener(){},dispatchEvent(){},setTimeout(){return 1;},clearTimeout(){},setInterval(){return 1;},clearInterval(){}};
  const db={mode:'firebase',listenTo(name,callback){queueMicrotask(()=>callback(name==='places'?[{id:'home',person:'him',preset:'home',lat:26.1,lng:-80.2,radius:150}]:[]));},
    readOnce:name=>name==='statuses'?statusRead():Promise.resolve([]),
    setTo:async(name,id,patch)=>writes.push({op:'set',name,id,patch}),
    updateIn:async(name,id,patch)=>writes.push({op:'update',name,id,patch}),
    removeFrom:async(name,id)=>writes.push({op:'delete',name,id}),notify:async(_,payload)=>{pings.push(payload);return {queued:true};}};
  const sandbox={...places,...journey,metersBetween:places.placeDistance,sharedLayer:async()=>db,awaitViewer:async()=>'him',partnerOf:()=> 'her',personName:()=> 'Milo',
    window:win,document:{hidden:false,body:{dataset:{app:'status'}},addEventListener(){}},localStorage:storage,sessionStorage:{...storage,getItem:()=>null},queueMicrotask,
    navigator:{permissions:permission==='unknown'?undefined:{query:async()=>({state:permission})},geolocation:{watchPosition(success,error){callbacks.push({success,error});return callbacks.length;},clearWatch(){}}},
    CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return {sandbox,writes,pings,callbacks,run:code=>vm.runInContext(code,sandbox),deferStatus(){let release;statusRead=()=>new Promise(resolve=>{release=resolve;});return ()=>release([]);},fix(){callbacks.at(-1).success({coords:{latitude:26.1,longitude:-80.2,accuracy:5}});}};
}
{
  const h=locationHarness({permission:'unknown'});await tick();
  assert.equal(h.callbacks.length,0,'unknown permission must not silently opt into location');
  assert.equal(h.run('locationSnapshot().phase'),'needs-permission');
}
{
  const h=locationHarness();await tick();const release=h.deferStatus();
  h.fix();await tick();
  await h.run('pauseAutoLocation({removeSpot:true})');
  release();await tick();
  assert.equal(h.writes.filter(w=>w.op==='set').length,0,'a delayed GPS fix cannot restore the hidden spot or status');
  assert.equal(h.run('locationSnapshot().phase'),'paused');
  assert.equal(h.run('locationSnapshot().lat'),undefined);
  h.callbacks[0].success({coords:{latitude:26.1,longitude:-80.2,accuracy:5}});await tick();
  h.callbacks[0].error({code:1});await tick();
  assert.equal(h.writes.filter(w=>w.op==='set').length,0,'already queued platform callbacks stay cancelled');
  assert.equal(h.run('locationSnapshot().phase'),'paused','a late permission error cannot replace paused state');
}
{
  const h=locationHarness();await tick();
  const count=h.callbacks.length;
  h.sandbox.document.hidden=true;h.run('startWatcher()');
  assert.equal(h.callbacks.length,count,'a background tab cannot start watching');
  h.sandbox.document.hidden=false;h.run('resumeIfSensible()');
  assert.equal(h.callbacks.length,count+1,'opening it again resumes the permitted watcher');
}
{
  const h=locationHarness({paused:true});await tick();await h.run('resumeAutoLocation()');
  assert.equal(h.pings.length,0,'asking for GPS is not proof sharing resumed');
  h.fix();await tick();
  assert.equal(h.pings.filter(p=>p.title.includes('sharing location again')).length,1);
  assert.ok(h.writes.some(w=>w.name==='locations'&&w.op==='set'));
}
console.log('ok location consent, mid-flight pause, hidden spot and honest resume notifications');
