// Read-only diagnostics. Never sends a test ping or prints private content,
// device endpoints, credentials, document IDs or subscription keys.
import {createRequire} from 'node:module';
import {HOUSEHOLD_ID} from '../household.js';
import {firebaseConfig} from '../firebase-config.js';
import {activityClock} from '../activity-clock.js';
const require=createRequire(import.meta.url),project=firebaseConfig.projectId;
const {configstore}=require('firebase-tools/lib/configstore');
await require('firebase-tools/lib/requireAuth').requireAuth({project,user:configstore.get('user'),tokens:configstore.get('tokens')});
const client=new(require('firebase-tools/lib/apiv2').Client)({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
const root=`/projects/${project}/databases/(default)/documents/households/${HOUSEHOLD_ID}`;
const read=value=>'integerValue'in value?Number(value.integerValue):'stringValue'in value?value.stringValue:'booleanValue'in value?value.booleanValue:null;
const records=body=>(body?.documents||[]).map(doc=>Object.fromEntries(Object.entries(doc.fields||{}).map(([k,v])=>[k,read(v)])));
const list=async name=>{
 const rows=[];let pageToken='';
 do {
  const {body}=await client.get(`${root}/${name}`,{queryParams:{pageSize:300,...(pageToken?{pageToken}:{})}});
  rows.push(...records(body));pageToken=body.nextPageToken||'';
 }while(pageToken);
 return rows;
};
const [queue,subscriptions,locks]=await Promise.all(['outbox','pushSubs','deliveryLocks'].map(list));
const now=Date.now(),due=queue.filter(row=>Number(row.sendAt)<=now);
console.log(JSON.stringify({source:'firestore',at:new Date(now).toISOString(),subscriptions:subscriptions.map(s=>s.person),queued:queue.length,due:due.length,oldestDueMs:due.length?Math.max(...due.map(r=>now-r.sendAt)):0,activeLeases:locks.filter(r=>r.owner).map(r=>({ageMs:now-r.acquiredAt,stale:now-r.acquiredAt>120000}))}));
const day=activityClock(now).day;
console.log(JSON.stringify({source:'activities',day,puzzles:(await list('timedPuzzles')).filter(p=>p.day===day).map(p=>({type:p.type,durationMs:p.durationMs,catalogVersion:p.catalogVersion})),questions:(await list('questions')).filter(q=>q.day===day).length}));
