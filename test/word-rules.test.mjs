import assert from 'node:assert/strict';
import {nextWordAttempt,wordSummary} from '../word-game.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):8089$/,'never run against live data');
const project='demo-little-list',household='oLSxADOwjqS04hSS2aHGOcvozmz2';
const root=`projects/${project}/databases/(default)/documents`,base='http://'+host+'/v1/'+root;
const path=name=>'households/'+household+'/'+name;
function token(person){const uid=person==='her'?'cwQndCjlRlcaHasR1xzp9EYICFz2':person==='him'?household:'stranger';return Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+project,aud:project,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')+'.';}
const headers=p=>({authorization:'Bearer '+token(p),'content-type':'application/json'});
function value(v){if(Array.isArray(v))return {arrayValue:{values:v.map(value)}};if(typeof v==='string')return {stringValue:v};if(typeof v==='number')return {integerValue:String(v)};if(typeof v==='boolean')return {booleanValue:v};return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,value(v)]))}};}
async function write(person,name,data,okay=true){const r=await fetch(base+'/'+path(name),{method:'PATCH',headers:headers(person),body:JSON.stringify({fields:value(data).mapValue.fields})});assert.equal(r.ok,okay,name+': '+await r.text());}
async function read(person,name,status){const r=await fetch(base+'/'+path(name),{headers:headers(person)});assert.equal(r.status,status,name+': '+await r.text());}
async function commit(person,game,okay=true,summary=wordSummary(game)){
 const writes=[['wordGames',game],['wordResults',summary]].map(([collection,data])=>({update:{name:root+'/'+path(collection+'/'+game.day+'-'+game.person),fields:value(data).mapValue.fields}}));
 const r=await fetch(base+':commit',{method:'POST',headers:headers(person),body:JSON.stringify({writes})});assert.equal(r.ok,okay,'commit: '+await r.text());
}
const now=Date.now(),day='2026-10-08',puzzle={day,word:'apple',opensAt:now-60000,closesAt:now+86340000};
await write('him','wordPuzzles/'+day,puzzle);
await read('her','wordGames/'+day+'-her',404);
await read('him','wordGames/'+day+'-her',403);
let game=nextWordAttempt(null,puzzle,{day,person:'her',guess:'grape',expectedCount:0});
await commit('her',game);
await read('her','wordGames/'+day+'-her',200);
await read('him','wordGames/'+day+'-her',403);
await read('him','wordResults/'+day+'-her',200);
await read('stranger','wordResults/'+day+'-her',403);
await commit('him',{...game,guesses:['apple'],won:true,done:true},false);
await commit('her',{...game,guesses:['table','apple'],won:true,done:true},false);
await commit('her',{...game,guesses:['grape','table'],won:true,done:true},false);
await commit('her',{...game,guesses:['grape','grape']},false);
const won=nextWordAttempt(game,puzzle,{day,person:'her',guess:'apple',expectedCount:1});
await commit('her',won,false,{...wordSummary(won),attempts:1});
await commit('her',won);
await commit('her',{...won,guesses:['grape','apple','table'],won:false,done:false},false);
await write('him','wordPuzzles/'+day,{...puzzle,word:'table'},false);
const expired={...puzzle,day:'2026-10-07',opensAt:now-86500000,closesAt:now-100000};
await write('him','wordPuzzles/'+expired.day,expired);
await commit('her',{day:expired.day,person:'her',guesses:['apple'],won:true,done:true,updatedAt:now},false);
const tie={...puzzle,day:'2026-10-05-tie-1',week:'2026-10-05',closesAt:4102444800000};
await write('him','wordPuzzles/'+tie.day,tie);
await commit('him',nextWordAttempt(null,tie,{day:tie.day,person:'him',guess:'table',expectedCount:0}));
await write('him','wordDuelEnds/'+tie.day,{week:tie.week,outcome:'her',closedAt:now});
await commit('him',{day:tie.day,person:'him',guesses:['table','apple'],won:true,done:true,updatedAt:now},false);
// Archived question answers keep the same no-peeking rule.
await write('him','questions/2026-10-06',{day:'2026-10-06',promptId:1,answers:{},openedAt:1});
await write('her','questionAnswers/2026-10-06-her',{day:'2026-10-06',person:'her',text:'private',at:2});
await write('her','questions/2026-10-06',{day:'2026-10-06',promptId:1,answers:{her:{at:2}},openedAt:1});
await read('him','questionAnswers/2026-10-06-her',403);
await read('her','questionAnswers/2026-10-06-her',200);
await write('him','questionAnswers/2026-10-06-him',{day:'2026-10-06',person:'him',text:'second',at:3});
await write('him','questions/2026-10-06',{day:'2026-10-06',promptId:1,answers:{her:{at:2},him:{at:3}},openedAt:1});
await read('him','questionAnswers/2026-10-06-her',200);
console.log('FIRESTORE WORD: ownership, private guesses, atomic scores, immutable history, invalid wins, closed puzzles, closed duels and archived answer privacy pass');
