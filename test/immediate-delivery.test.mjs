import assert from 'node:assert/strict';
import {authorizeWake,wakeDelivery} from '../worker/src/immediate.js';
import {acquireDeliveryLock,releaseDeliveryLock} from '../worker/src/delivery-lock.js';
import {createDeliveryWake} from '../delivery-wake.js';
import {readFileSync} from 'node:fs';

const origin='https://milovalcodes.github.io',env={FIREBASE_PROJECT_ID:'demo-test',HOUSEHOLD_ID:'HOUSE'};
const token='fake.firebase.token.for.tests',realFetch=globalThis.fetch;
const request=(options={})=>new Request('https://worker.test/dispatch',{
  method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token},...options});
let checked=0;
globalThis.fetch=async(url,options)=>{
  checked++;assert.equal(new URL(url).hostname,'firestore.googleapis.com');
  assert.match(url,/\/projects\/demo-test\/.*\/households\/HOUSE\/profiles\?pageSize=1$/);
  assert.equal(options.headers.Authorization,'Bearer '+token);
  return Response.json({documents:[]});
};
try{
  const allowed=await authorizeWake(request(),env);
  assert.equal(allowed.response,undefined);assert.equal(checked,1);
  assert.equal(allowed.headers['Access-Control-Allow-Origin'],origin);
  assert.equal((await authorizeWake(request({body:new Uint8Array(0)}),env)).response,undefined,'an empty POST stream is valid on Cloudflare');
  for(const [options,status] of [
    [{headers:{Origin:'https://evil.test',Authorization:'Bearer '+token}},403],
    [{headers:{Origin:origin}},401],
    [{method:'GET'},405],
    [{body:JSON.stringify({to:'him',body:'not allowed'})},400],
    [{method:'OPTIONS',headers:{Origin:origin}},204]
  ])assert.equal((await authorizeWake(request(options),env)).response.status,status);
  assert.equal(checked,2,'bad requests never get to the database or sender');
  for(const status of [401,403,404,429,500]){
    globalThis.fetch=async()=>new Response('',{status});
    assert.equal((await authorizeWake(request(),env)).response.status,[401,403].includes(status)?403:503);
  }
  globalThis.fetch=async()=>{throw Error('offline');};
  assert.equal((await authorizeWake(request(),env)).response.status,503);
}finally{globalThis.fetch=realFetch;}

{
  let attempts=0;const delays=[];
  const result=await wakeDelivery(env,async(_,options)=>{
    assert.deepEqual(options,{scheduleQuestions:true,scheduleReminders:false});
    return ++attempts<3?{skipped:'already-running'}:{sent:1};
  },{activities:true,sleep:async delay=>delays.push(delay)});
  assert.equal(result.sent,1);assert.deepEqual(delays,[300,700]);
  attempts=0;
  assert.equal((await wakeDelivery(env,async()=>{attempts++;return {skipped:'already-running'};},{sleep:async()=>{}})).skipped,'backup-will-retry');
  assert.equal(attempts,6,'bounded retries, never a tight or infinite loop');
}

// An in-memory CAS store models simultaneous HTTP/cron callers, an abandoned
// lease, and a delayed old owner attempting to release a newer lease.
{
  const rows=new Map();let revision=0;
  const db={
    async create(path,record){if(rows.has(path))return false;rows.set(path,{record,updateTime:String(++revision)});return true;},
    async getVersioned(path){const row=rows.get(path);return row?structuredClone(row):null;},
    async removeIfUnchanged(path,time){if(rows.get(path)?.updateTime!==time)return false;rows.delete(path);return true;}
  };
  const leases=await Promise.all(Array.from({length:20},()=>acquireDeliveryLock(db,'lock',1000)));
  assert.equal(leases.filter(Boolean).length,1,'one sender wins a fresh race');
  const old=leases.find(Boolean);
  const stale=await Promise.all(Array.from({length:20},()=>acquireDeliveryLock(db,'lock',122000)));
  assert.equal(stale.filter(Boolean).length,1,'one sender wins stale-lock recovery');
  assert.equal(await releaseDeliveryLock(db,'lock',old),false,'old owner cannot delete new lease');
  assert.equal(await releaseDeliveryLock(db,'lock',stale.find(Boolean)),true);
  assert.equal(rows.size,0);
}

{
  const sent=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let release;
  const first=new Promise(resolve=>release=resolve);
  const wake=createDeliveryWake({getToken:async()=>token,url:'https://worker.test/dispatch',fetcher:async(url,options)=>{
    sent.push({url,options});if(sent.length===1)await first;return {ok:true};
  }});
  wake();wake({activities:true});wake();
  await wait(140);assert.equal(sent.length,1);assert.ok(sent[0].url.endsWith('/activities'));
  wake();wake();release();await wait(140);
  assert.equal(sent.length,2,'a save while the request is in flight gets its own wake');
  assert.ok(sent[1].url.endsWith('/dispatch'));
  assert.equal(sent[0].options.keepalive,true);assert.equal(sent[0].options.body,undefined);
  assert.equal(sent[0].options.headers.Authorization,'Bearer '+token);
  let anonymousCalls=0;
  createDeliveryWake({getToken:async()=>null,fetcher:async()=>anonymousCalls++})();await wait(140);
  assert.equal(anonymousCalls,0);
  const failed=createDeliveryWake({getToken:async()=>token,fetcher:async()=>{throw Error('offline');}});
  failed();await wait(140); // no unhandled rejection or attempt to delete a queue row
  let tokenAttempts=0,recovered=0;
  const stalled=createDeliveryWake({timeoutMs:20,getToken:()=>++tokenAttempts===1?new Promise(()=>{}):token,fetcher:async()=>{recovered++;return {ok:true};}});
  stalled();await wait(140);stalled();await wait(140);
  assert.equal(recovered,1,'a stuck token refresh cannot block every later immediate wake');
}

const data=readFileSync(new URL('../firebase-data.js',import.meta.url),'utf8');
assert.match(data,/work\.then\(\(\)=>\{if\(Number\(item.sendAt\)<=Date.now\(\)\)wakeDelivery\(\);\}/,'wake follows Firestore confirmation');
assert.match(data,/if\(saved.done\)wakeDelivery\(\{activities:true\}\)/);
assert.match(data,/work\.then\(\(\)=>wakeDelivery\(\{activities:true\}\),\(\)=>\{\}\)/);
console.log('IMMEDIATE DELIVERY: authenticated/CORS-only wake, no arbitrary payload, bounded retries, 40 lease races, old-owner fencing, batching and confirmed-save hooks pass');
