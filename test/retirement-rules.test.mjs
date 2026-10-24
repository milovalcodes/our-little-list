import assert from 'node:assert/strict';
import {HOUSEHOLD_ID,MEMBERS} from '../household.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):808[89]$/,'emulator only');
const project='demo-little-list',root=`projects/${project}/databases/(default)/documents`,base='http://'+host+'/v1/'+root,household=HOUSEHOLD_ID;
function token(person){const uid=Object.entries(MEMBERS).find(([uid,side])=>side===person)?.[0]||'stranger';return Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+project,aud:project,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')+'.';}
const headers=p=>({authorization:'Bearer '+(p==='owner'?'owner':token(p)),'content-type':'application/json'});
function value(v){if(Array.isArray(v))return {arrayValue:{values:v.map(value)}};if(typeof v==='string')return {stringValue:v};if(typeof v==='number')return {integerValue:String(v)};if(typeof v==='boolean')return {booleanValue:v};return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,value(v)]))}};}
const path=n=>'households/'+household+'/'+n;
async function request(person,name,method='GET',data,status=200){const r=await fetch(base+'/'+path(name),{method,headers:headers(person),...(data?{body:JSON.stringify({fields:value(data).mapValue.fields})}:{})});assert.equal(r.status,status,person+' '+method+' '+name+': '+await r.text());}
const archived=['wordWeeks','wordResults','timedResults','wordDuels','wordDuelEnds','wordPuzzles','timedPuzzles','wordGames','timedGames','gameResets','gameResetWeeks','gamePlans','gameReactions','activityEvents','games'];
for(const collection of archived){
 await request('owner',collection+'/saved','PATCH',{week:'2026-10-12',person:'him',scores:{him:50,her:40},winners:['him']});
 for(const side of ['her','him','stranger']){
  await request(side,collection+'/new','PATCH',{person:side},403);
  await request(side,collection+'/saved','PATCH',{person:side},403);
  await request(side,collection+'/saved','DELETE',null,403);
 }
}
for(const side of ['her','him']){
 await request(side,'wordWeeks/saved');await request(side,'wordResults/saved');
 await request(side,'wordGames/saved','GET',null,403);
 const q=await fetch(base+'/households/'+household+':runQuery',{method:'POST',headers:headers(side),body:JSON.stringify({structuredQuery:{from:[{collectionId:'wordWeeks'}]}})});assert.equal(q.status,200,'history query');
}
await request('stranger','wordWeeks/saved','GET',null,403);
const day='2026-10-24',now=Date.now();
await request('him','questions/'+day,'PATCH',{day,promptId:1,answers:{},openedAt:now,closesAt:now+3600000});
await request('her','questionAnswers/'+day+'-her','PATCH',{day,person:'her',text:'sun answer',at:now});
await request('him','questionAnswers/'+day+'-her','GET',null,403);
await request('her','questions/'+day,'PATCH',{day,promptId:1,answers:{her:{at:now}},openedAt:now,closesAt:now+3600000});
await request('him','questionAnswers/'+day+'-him','PATCH',{day,person:'him',text:'moon answer',at:now});
await request('him','questions/'+day,'PATCH',{day,promptId:1,answers:{her:{at:now},him:{at:now}},openedAt:now,closesAt:now+3600000});
await request('him','questionAnswers/'+day+'-her');await request('her','questionAnswers/'+day+'-him');
await request('stranger','questionAnswers/'+day+'-her','GET',null,403);
await request('him','questionAnswers/'+day+'-her','PATCH',{day,person:'her',text:'forged',at:now},403);
for(const kind of ['game','game-turn','game-streak','word-week','activity-result','activity-reset','activities-open','question-open','question-answered','question-reveal','note','list-reminder']){
 const retired=/^(game|word-week|activity|activities)/.test(kind);
 await request('him','outbox/check-'+kind,'PATCH',{to:'her',title:'test',body:'body',url:'activities.html#question',kind,sendAt:now,createdAt:now},retired?403:200);
}
console.log('RULES: both accounts cannot create/update/delete games or history; strangers denied; saved wins readable; private question answers and active notifications preserved');
