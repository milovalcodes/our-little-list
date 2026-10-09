import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import webpush from 'web-push';
import worker,{deliver} from '../worker/src/index.js';
import {createClient} from '../worker/src/firestore.js';
import {authorizeWake} from '../worker/src/immediate.js';
import {acquireDeliveryLock,releaseDeliveryLock} from '../worker/src/delivery-lock.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):8089$/,'demo emulator only');
const project='demo-little-list',household='oLSxADOwjqS04hSS2aHGOcvozmz2',base=`households/${household}`;
function token(uid){return Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+project,aud:project,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')+'.';}
const key=webpush.generateVAPIDKeys(),receiver=crypto.createECDH('prime256v1');receiver.generateKeys();
const env={FIREBASE_PROJECT_ID:project,FIREBASE_API_KEY:'demo-key',HOUSEHOLD_ID:household,LITTLE_EMAIL:'demo@example.test',LITTLE_PASSWORD:'demo-only',VAPID_PUBLIC_KEY:key.publicKey,VAPID_PRIVATE_KEY:key.privateKey};
const original=globalThis.fetch;
assert.ok((await original(`http://${host}/emulator/v1/projects/${project}/databases/(default)/documents`,{method:'DELETE'})).ok);
let pushes=0,failCleanup=false;const conditionalFailures=[];
globalThis.fetch=async(url,options={})=>{
  const target=String(url);
  if(target.startsWith('https://identitytoolkit.googleapis.com/'))return Response.json({idToken:token(household),expiresIn:3600});
  if(target==='https://push.example.test/demo'){pushes++;assert.equal(options.headers.Urgency,'high');return new Response('',{status:201});}
  assert.ok(target.startsWith(`https://firestore.googleapis.com/v1/projects/${project}/`),'no production backend access: '+target);
  if(failCleanup&&options.method==='DELETE'&&target.endsWith('/outbox/cleanup')){failCleanup=false;return new Response('test cleanup failure',{status:503});}
  const response=await original(target.replace('https://firestore.googleapis.com','http://'+host),options);
  if(target.includes('currentDocument.updateTime')&&!response.ok)conditionalFailures.push(await response.clone().text());
  return response;
};
try{
  const req=uid=>new Request('https://worker.test/dispatch',{method:'POST',headers:{Origin:'https://milovalcodes.github.io',Authorization:'Bearer '+token(uid)}});
  for(const uid of [household,'cwQndCjlRlcaHasR1xzp9EYICFz2'])assert.equal((await authorizeWake(req(uid),env)).response,undefined,'real rules permit either member even with no profile');
  assert.equal((await authorizeWake(req('not-a-member'),env)).response.status,403,'real rules reject stranger');
  const db=createClient({projectId:project,idToken:token(household)});
  const lockPath=base+'/deliveryLocks/race';
  await db.create(lockPath,{owner:'old',acquiredAt:Date.now()-180000});
  const locks=await Promise.all(Array.from({length:8},()=>acquireDeliveryLock(db,lockPath,Date.now())));
  assert.equal(locks.filter(Boolean).length,1,'real Firestore CAS gives one stale-lock winner: '+JSON.stringify({current:await db.getVersioned(lockPath),conditionalFailures}));
  assert.equal(await releaseDeliveryLock(db,lockPath,{owner:'old'}),false);
  assert.equal(await releaseDeliveryLock(db,lockPath,locks.find(Boolean)),true);
  await db.create(base+'/pushSubs/him',{person:'him',subscription:{endpoint:'https://push.example.test/demo',keys:{p256dh:receiver.getPublicKey().toString('base64url'),auth:crypto.randomBytes(16).toString('base64url')}}});
  const queue=id=>db.create(base+'/outbox/'+id,{to:'him',kind:'note',title:'demo',body:'same text',url:'index.html',sendAt:Date.now(),createdAt:Date.now()});
  await queue('race');
  const pending=[];
  // The immediate endpoint and the scheduled sender race the same queued row.
  await Promise.all([deliver(env,{scheduleQuestions:false}),...Array.from({length:4},async()=>{
    const response=await worker.fetch(req(household),env,{waitUntil:work=>pending.push(work)});
    assert.equal(response.status,202);
  })]);
  await Promise.all(pending);
  assert.equal(pushes,1,'one push across simultaneous immediate and cron passes');
  assert.equal(await db.get(base+'/outbox/race'),null);
  assert.ok(await db.get(base+'/deliveryLocks/sent-race'));
  await queue('cleanup');failCleanup=true;
  await assert.rejects(deliver(env,{scheduleQuestions:false}),/503/);
  assert.equal(pushes,2);assert.ok(await db.get(base+'/outbox/cleanup'));
  await deliver(env,{scheduleQuestions:false});
  assert.equal(pushes,2,'saved receipt prevents resend after actual failed DELETE');
  assert.equal(await db.get(base+'/outbox/cleanup'),null);
  await queue('distinct-same-text');await deliver(env,{scheduleQuestions:false});
  assert.equal(pushes,3,'identical text with a different event ID is not lost');
  await db.create(base+'/outbox/future',{to:'him',kind:'note',title:'later',body:'',url:'index.html',sendAt:Date.now()+3600000,createdAt:Date.now()});
  await deliver(env,{scheduleQuestions:false,scheduleReminders:false});assert.equal(pushes,3,'immediate delivery never advances future reminders');
  console.log('REAL IMMEDIATE: both-member authorization, rejected stranger, stale CAS race, HTTP/cron overlap, failed-delete receipt, distinct same-text notes and future schedule safety pass');
}finally{globalThis.fetch=original;}
