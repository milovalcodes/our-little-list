import assert from 'node:assert/strict';
import {timedPuzzle} from '../daily-puzzles.js';
import {newTimedGame,advanceTimedGame,timedSummary} from '../timed-game.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;assert.match(host||'',/^(127\.0\.0\.1|localhost):8089$/,'emulator only');
const project='demo-little-list',household='oLSxADOwjqS04hSS2aHGOcvozmz2',root=`projects/${project}/databases/(default)/documents`,base='http://'+host+'/v1/'+root;
const path=name=>'households/'+household+'/'+name;
function token(p){const uid=p==='her'?'cwQndCjlRlcaHasR1xzp9EYICFz2':p==='him'?household:'stranger';return Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+project,aud:project,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')+'.';}
const headers=p=>({authorization:'Bearer '+(p==='admin'?'owner':token(p)),'content-type':'application/json'});
function value(v,k=''){if(v===null)return {nullValue:null};if(['startedAt','finishedAt'].includes(k)&&typeof v==='number')return {timestampValue:new Date(v).toISOString()};if(Array.isArray(v))return {arrayValue:{values:v.map(x=>value(x))}};if(typeof v==='string')return {stringValue:v};if(typeof v==='number')return {integerValue:String(v)};if(typeof v==='boolean')return {booleanValue:v};return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x,k)]))}};}
const fields=v=>value(v).mapValue.fields;
function decode(v){if(v.timestampValue)return Date.parse(v.timestampValue);if(v.integerValue!=null)return Number(v.integerValue);if(v.stringValue!=null)return v.stringValue;if(v.booleanValue!=null)return v.booleanValue;if('nullValue'in v)return null;if(v.arrayValue)return(v.arrayValue.values||[]).map(decode);return Object.fromEntries(Object.entries(v.mapValue?.fields||{}).map(([k,x])=>[k,decode(x)]));}
async function write(p,name,data,ok=true){const r=await fetch(base+'/'+path(name),{method:'PATCH',headers:headers(p),body:JSON.stringify({fields:fields(data)})});assert.equal(r.ok,ok,name+': '+await r.text());}
async function read(p,name,status=200){const r=await fetch(base+'/'+path(name),{headers:headers(p)});const body=await r.json();assert.equal(r.status,status,name+': '+JSON.stringify(body));return body.fields?decode({mapValue:{fields:body.fields}}):null;}
async function commit(p,game,{start=false,ok=true,summary=timedSummary(game)}={}){
 const writes=[['timedGames',game],['timedResults',summary]].map(([collection,g])=>{
  const transform=start?'startedAt':g.done?'finishedAt':null,f=fields(g);if(transform)delete f[transform];
  return {update:{name:root+'/'+path(`${collection}/${g.day}-${g.type}-${g.person}`),fields:f},...(transform?{updateTransforms:[{fieldPath:transform,setToServerValue:'REQUEST_TIME'}]}:{})};
 });
 const r=await fetch(base+':commit',{method:'POST',headers:headers(p),body:JSON.stringify({writes})});assert.equal(r.ok,ok,await r.text());
 if(ok)return read(p,`timedGames/${game.day}-${game.type}-${game.person}`);
}
const now=Date.now(),day='2026-10-21',puzzle={...timedPuzzle(day,'crossword'),opensAt:now-1000,closesAt:now+86400000};
await write('him','timedPuzzles/'+day+'-crossword',puzzle);
await write('him','timedPuzzles/'+day+'-crossword',{...puzzle,theme:'changed'},false);
let g=newTimedGame(puzzle,'her',now);
await commit('her',g,{ok:false}); // A fabricated client clock is not a start timestamp.
await commit('him',g,{start:true,ok:false});
g=await commit('her',g,{start:true});
await read('him',`timedGames/${day}-crossword-her`,403);
await read('him',`timedResults/${day}-crossword-her`);
await read('stranger',`timedResults/${day}-crossword-her`,403);
await commit('her',newTimedGame(puzzle,'her'),{start:true,ok:false});
await commit('her',{...g,total:1},{ok:false});
for(let i=0;i<puzzle.entries.length;i++){
 const next=advanceTimedGame(g,puzzle,{index:i,expectedCount:i});
 await commit('her',next,{ok:false,summary:{...timedSummary(next),count:99}});
 g=await commit('her',next);
}
await read('him',`timedGames/${day}-crossword-her`,403);
let moon=await commit('him',newTimedGame(puzzle,'him'),{start:true});
for(let i=0;i<puzzle.entries.length;i++)moon=await commit('him',advanceTimedGame(moon,puzzle,{index:i,expectedCount:i}));
await read('him',`timedGames/${day}-crossword-her`);
await commit('her',{...g,done:false,complete:false,solved:[],foundAt:[],finishedAt:null},{ok:false});
// Backdate a demo fixture using the emulator's admin token; users never have this authority.
const expiredPuzzle={...timedPuzzle('2026-10-22','search'),opensAt:now-86400000,closesAt:now+100000};
await write('him','timedPuzzles/2026-10-22-search',expiredPuzzle);
const expired={...newTimedGame(expiredPuzzle,'her',now-121000),solved:[0],foundAt:[5000]};
await write('admin','timedGames/2026-10-22-search-her',expired);await write('admin','timedResults/2026-10-22-search-her',timedSummary(expired));
await commit('her',{...expired,solved:[0,1],foundAt:[5000,119000]},{ok:false});
await commit('her',advanceTimedGame(expired,expiredPuzzle,{index:null,expectedCount:1}));
const tie={...timedPuzzle('2026-10-19-tie-1','search',now-1000)};
await write('him','timedPuzzles/'+tie.day+'-search',tie);
let tieGame=await commit('him',newTimedGame(tie,'him'),{start:true});
await write('him','wordDuelEnds/'+tie.day,{week:'2026-10-19',outcome:'her',closedAt:now});
await commit('him',advanceTimedGame(tieGame,tie,{index:0,expectedCount:0}),{ok:false});
const final={week:'2026-10-19',format:'trio',scoreVersion:2,round:1,scores:{her:1900,him:1500},winners:['her'],settledAt:now};
await write('him','wordWeeks/'+final.week,{...final,scores:{her:2001,him:1500}},false);
await write('him','wordWeeks/'+final.week,final);
console.log('TIMED RULES: server start times, private routes, no resets, atomic counts, expired attempts, closed ties and scaled weekly bounds pass');
