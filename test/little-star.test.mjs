import assert from 'node:assert/strict';
import {StarNursery,freshRecord,creditResults,collectStarPings,starPingWanted} from '../worker/src/star-store.js';
import {authorizeStar,handleStar,scheduleStar,queuedStarWanted} from '../worker/src/star-api.js';
import {scenario,DAY,COFFEE,eggProgress} from '../little-star/engine.mjs';
import {notificationKindEnabled} from '../notification-policy.js';
import {ADMIN_UID} from '../household.js';
const realNow=Date.now,realFetch=globalThis.fetch;
let now=Date.parse('2026-10-15T17:00:00Z');Date.now=()=>now;
// Rollback + serialization, just like durable storage transactions. The same
// service class is also bundled and smoke-tested by Wrangler before release.
const values=new Map();let queue=Promise.resolve();
const storage={transaction(fn){const promise=queue.then(async()=>{const staged=new Map(structuredClone([...values]));const tx={get:async key=>structuredClone(staged.get(key)),put:async(key,value)=>{staged.set(key,structuredClone(value));}};const result=await fn(tx);values.clear();for(const [k,v] of staged)values.set(k,v);return result;});queue=promise.catch(()=>{});return promise;}};
const object=new StarNursery({storage},{}),internal=async body=>{const r=await object.fetch(new Request('https://internal/',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,...await r.json()};};
let serial=0;
const action=(actor,type,payload={},id='test-'+(++serial),petId='star-1')=>internal({op:'act',actor,command:{type,payload,id,petId}});
try{
 const empty=await internal({op:'tick'});assert.deepEqual(empty.pending,[]);assert.equal(values.has('nursery'),false,'cron must not start the egg');
 let r=await internal({op:'read',actor:'him'});assert.equal(r.star.born,false);assert.deepEqual(r.star.wallets,{him:40,her:40});
 const both=await Promise.all([action('him','wish',{text:'Hi'}),action('her','wish',{text:'Hello'})]);assert.ok(both.every(r=>r.status===200));
 r=await internal({op:'read',actor:'her'});assert.deepEqual(r.star.wishes,{him:'Hi',her:'Hello'});
 assert.equal((await action('him','game-reward',{source:'daily',attempts:1})).status,400);
 assert.equal((await action('__proto__','buy-food',{food:'coffee'})).status,400);
 let paid=await action('him','buy-food',{food:'coffee'},'coffee-retry');assert.equal(paid.star.wallets.him,10);assert.equal(paid.star.pantry.coffee,1);
 for(let i=0;i<105;i++)await action('him','visit');
 let duplicate=await action('him','buy-food',{food:'coffee'},'coffee-retry');assert.equal(duplicate.duplicate,true);assert.equal(duplicate.star.pantry.coffee,1);assert.equal(duplicate.star.wallets.him,10,'old retry is never charged twice');
 assert.equal((await action('him','transfer',{amount:1},'coffee-retry')).status,400,'same ID cannot mean a different action');
 const transfers=await Promise.all([action('him','transfer',{amount:8}),action('him','transfer',{amount:8})]);assert.equal(transfers.filter(r=>r.status===200).length,1);
 r=await internal({op:'read',actor:'him'});assert.deepEqual(r.star.wallets,{him:2,her:48},'concurrent spends cannot overdraft');
 const record=values.get('nursery'),results={words:[{day:'2026-10-14',person:'him',done:true,won:true,attempts:1}],timed:[{day:'2026-10-15',person:'her',type:'search',done:true,count:5,total:10}]};
 creditResults(record,results,now);assert.equal(record.state.wallets.him,102);assert.equal(record.state.wallets.her,73);assert.deepEqual(record.weekly,{him:100,her:25});
 creditResults(record,results,now);assert.equal(record.state.wallets.him,102);
 creditResults(record,{words:[],timed:[]},now);assert.deepEqual(record.weekly,{him:0,her:0});assert.equal(record.state.wallets.him,102,'a reset changes competition, not already granted cash');
 creditResults(record,results,now);assert.equal(record.state.wallets.him,102,'replaying a reset does not repay');
 results.timed[0].count=10;creditResults(record,results,now);assert.equal(record.state.wallets.her,98,'only improved score difference pays');
 creditResults(record,{words:[{day:'2026-10-11',person:'him',done:true,won:true,attempts:1},{day:'2099-01-01',person:'him',done:true,won:true,attempts:1}]},now);assert.equal(record.state.wallets.him,102,'no prelaunch-week or future earnings');
 values.set('nursery',record);
 await action('him','incubate',{form:'dwarf'});now+=DAY;
 const ready=await internal({op:'tick'});assert.equal(ready.pending.filter(p=>p.kind==='star-ready').length,2);assert.equal(eggProgress(values.get('nursery').state,now).ready,true);
 await internal({op:'tick'});assert.equal(values.get('nursery').pending.length,2,'hatch-ready is emitted once per person');
 const hatches=await Promise.all([action('him','hatch'),action('her','hatch')]);assert.equal(hatches.filter(r=>r.status===200).length,1);
 const readyPing=ready.pending[0];assert.equal(starPingWanted(values.get('nursery'),readyPing,now),false,'hatched eggs cancel queued ready pings');
 await action('her','coffee');assert.equal((await action('him','coffee')).status,400,'coffee quota belongs to pet, not account');
 // A second pet can be selected independently on each phone.
 const two=freshRecord(now);two.state=scenario('grown',now);two.state.wallets={him:1000,her:1000};values.set('nursery',two);
 const lastAttention=values.get('nursery').state.seen.him;
 now+=1000;await internal({op:'read',actor:'him'});
 assert.equal(values.get('nursery').state.seen.him,lastAttention,'sync polling must not suppress phone reminders');
 r=await action('him','adopt-second');assert.equal(r.star.petId,'star-2');
 assert.equal((await internal({op:'read',actor:'her'})).star.petId,'star-1');
 assert.equal((await internal({op:'read',actor:'him'})).star.petId,'star-2');
 assert.equal((await action('him','rename',{name:'Wrong pet'},undefined,'star-1')).status,400);
 r=await action('him','rename',{name:'Nova'},undefined,'star-2');assert.equal(r.star.name,'Nova');
 // Cooking and arcade settlement cannot accept old demo payloads or mint instantly.
 await action('him','start-cook',{recipe:'toast',withPet:false},'meal-start','star-2');
 assert.equal((await action('him','cook',{sessionId:'him-meal-start',steps:4,grades:[100,100,100,100]},undefined,'star-2')).status,400);
 now+=9000;r=await action('him','cook',{sessionId:'him-meal-start',steps:4,grades:[100,100,100,100]},'meal-collect','star-2');assert.equal(r.status,200);assert.equal(r.star.pantry.toast,5);
 duplicate=await action('him','cook',{sessionId:'him-meal-start',steps:4,grades:[100,100,100,100]},'meal-collect','star-2');assert.equal(duplicate.star.pantry.toast,5);
 assert.equal((await action('her','start-play',{game:'catch'})).status,400);
 for(const [game,arcade] of [['catch',{caught:40,misses:2,hits:1,bestCombo:15}],['echo',{longest:4,mistakes:3}],['pairs',{total:8,matched:8,moves:12,left:80}]]){
  const started=await action('her','start-play',{game,arcadeVersion:2,level:game==='pairs'?8:0});assert.equal(started.status,200);
  now+=60000;const before=started.star.wallets.her,payload={game,sessionId:started.star.playSessions.her.id,arcade};
  const settled=await action('her','play',payload);assert.equal(settled.status,200);assert.ok(settled.star.wallets.her>before,game+' pays a valid completed result');
  assert.equal((await action('her','play',payload)).status,400,'a new ID cannot reclaim the same '+game+' session');
 }
 // Care events remain durable until the existing push outbox acknowledges them.
 const unattended=freshRecord(now);unattended.state=scenario('ready',now);unattended.state.needs.food=0;unattended.state.seen={him:now-300000,her:now-300000};values.set('nursery',unattended);
 collectStarPings(unattended,now);const care=unattended.pending.find(p=>p.kind==='star-care');assert.ok(care);assert.equal(starPingWanted(unattended,care,now),true);
 const documents=new Map(),env={APP_ORIGIN:'https://example.test',FIREBASE_API_KEY:'test-public-key',FIREBASE_PROJECT_ID:'test',HOUSEHOLD_ID:'test',STAR_NURSERY:{idFromName:v=>v,get:()=>({fetch:(url,options)=>object.fetch(new Request(url,options))})}};
 const db={get:async p=>documents.get(p),createMany:async docs=>{if(docs.some(d=>documents.has(d.path)))return false;for(const d of docs)documents.set(d.path,d.fields);return true;}};
 await scheduleStar(env,db,'households/test');const queued=[...documents.entries()].filter(([path])=>path.includes('/outbox/'));assert.ok(queued.length>=2);
 await scheduleStar(env,db,'households/test');assert.equal([...documents.keys()].filter(p=>p.includes('/outbox/')).length,queued.length,'queue receipts prevent duplicates');
 const message=queued.find(([,m])=>m.kind==='star-care')[1];assert.equal(await queuedStarWanted(env,message),true);
 const fed=values.get('nursery');fed.state.needs.food=100;fed.state.updatedAt=now;values.set('nursery',fed);assert.equal(await queuedStarWanted(env,message),false,'care done before delivery cancels stale ping');
 assert.equal(notificationKindEnabled('star-care',{categories:{pets:false}}),false);
 // Authentication is verified server-side, and privileged internal operations
 // and caller-supplied identities never cross the public API boundary.
 globalThis.fetch=async()=>Response.json({users:[{localId:ADMIN_UID}]});
 const req=body=>new Request('https://worker.test/star',{method:'POST',headers:{Origin:env.APP_ORIGIN,Authorization:'Bearer verified.test.token'},body:JSON.stringify(body)});
 assert.equal((await authorizeStar(new Request('https://worker.test/star',{method:'POST'}),env)).response.status,403);
 assert.equal((await handleStar(req({op:'sync',results:{}}),env)).status,400);
 assert.equal((await handleStar(req({op:'act',actor:'her',command:{type:'transfer',id:'forged-actor',petId:'star-1',payload:{amount:1}}}),env)).status,200);
 assert.equal(values.get('nursery').state.transfers.at(-1).from,'him','only token identity chooses the actor');
 globalThis.fetch=async()=>Response.json({users:[{localId:'outsider'}]});assert.equal((await handleStar(req({op:'read'}),env)).status,403);
 globalThis.fetch=async()=>Response.json({error:'expired'},{status:400});assert.equal((await handleStar(req({op:'read'}),env)).status,401);
 console.log('LITTLE STAR LIVE: shared egg, two accounts, purchases, durable retries, competition high-water rewards, per-pet coffee, independent pet selection, cooking, notification queue/staleness and API authorization passed.');
}finally{Date.now=realNow;globalThis.fetch=realFetch;}
