import assert from 'node:assert/strict';
const host=process.env.FIRESTORE_EMULATOR_HOST;assert.match(host||'',/^(127\.0\.0\.1|localhost):808[89]$/,'emulator only');
const project='demo-little-list',household='oLSxADOwjqS04hSS2aHGOcvozmz2',root=`projects/${project}/databases/(default)/documents`,base='http://'+host+'/v1/'+root;
const path=name=>'households/'+household+'/'+name;
function token(p){const uid=p==='her'?'cwQndCjlRlcaHasR1xzp9EYICFz2':p==='him'?household:'stranger';return Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+project,aud:project,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')+'.';}
const headers=p=>({authorization:'Bearer '+(p==='admin'?'owner':token(p)),'content-type':'application/json'});
function value(v,k=''){if(v===null)return {nullValue:null};if(['startedAt','finishedAt'].includes(k)&&typeof v==='number')return {timestampValue:new Date(v).toISOString()};if(Array.isArray(v))return {arrayValue:{values:v.map(x=>value(x))}};if(typeof v==='string')return {stringValue:v};if(typeof v==='number')return {integerValue:String(v)};if(typeof v==='boolean')return {booleanValue:v};return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x,k)]))}};}
const fields=v=>value(v).mapValue.fields;
function decode(v){if(v.timestampValue)return Date.parse(v.timestampValue);if(v.integerValue!=null)return Number(v.integerValue);if(v.stringValue!=null)return v.stringValue;if(v.booleanValue!=null)return v.booleanValue;if('nullValue'in v)return null;if(v.arrayValue)return(v.arrayValue.values||[]).map(decode);return Object.fromEntries(Object.entries(v.mapValue?.fields||{}).map(([k,x])=>[k,decode(x)]));}
async function write(p,name,data,ok=true){const r=await fetch(base+'/'+path(name),{method:'PATCH',headers:headers(p),body:JSON.stringify({fields:fields(data)})});assert.equal(r.ok,ok,name+': '+await r.text());}
async function read(p,name,status=200){const r=await fetch(base+'/'+path(name),{headers:headers(p)});const body=await r.json();assert.equal(r.status,status,name+': '+JSON.stringify(body));return body.fields?decode({mapValue:{fields:body.fields}}):null;}

const day='2026-10-20',now=Date.now();
for(const type of ['word','search','crossword']){
 const prefix=type==='word'?'word':'timed',round=type==='word'?day:day+'-'+type;
 const puzzle={day,type,revision:0};
 const summary={day,type,done:true,revision:0,startedAt:now-5000,finishedAt:now,closesAt:now+100000,durationMs:120000};
 const reaction={day,type,revision:0,person:'her',emoji:'🔥'},id=`${day}-${type}-0-her`;
 const name='gameReactions/'+id;
 await write('admin',prefix+'Puzzles/'+round,puzzle);
 await write('her',name,reaction,false);
 await write('admin',prefix+'Results/'+round+'-her',{...summary,person:'her'});
 await write('admin',prefix+'Results/'+round+'-him',{...summary,person:'him',done:false});
 await write('her',name,reaction,false);
 await write('admin',prefix+'Results/'+round+'-him',{...summary,person:'him'});
 await write('stranger',name,reaction,false);
 await write('him',name,reaction,false);
 await write('her',name,{...reaction,emoji:'arbitrary text'},false);
 await write('her',name,{...reaction,score:1000},false);
 await write('her',name,{...reaction,person:'him'},false);
 await write('her',name,reaction);
 await read('him',name);
 await read('stranger',name,403);
 await write('her',name,{...reaction,emoji:'👑'});
 await write('him',`gameReactions/${day}-${type}-0-him`,{...reaction,person:'him',emoji:'😂'});
 await write('admin',prefix+'Puzzles/'+round,{...puzzle,revision:1});
 await write('her',name,reaction,false);
 await write('her',`gameReactions/${day}-${type}-1-her`,{...reaction,revision:1},false);
 for(const person of ['her','him'])await write('admin',prefix+'Results/'+round+'-'+person,{...summary,person,revision:1});
 await write('her',`gameReactions/${day}-${type}-1-her`,{...reaction,revision:1});
 if(type!=='word'){
  await write('admin',prefix+'Results/'+round+'-him',{...summary,person:'him',revision:1,done:false,startedAt:now-121000});
  await write('her',`gameReactions/${day}-${type}-1-her`,{...reaction,revision:1,emoji:'😭'});
 }
}
console.log('ROUND REACTION RULES: both finished, household privacy, owner-only writes, enum/shape checks, expiry and revision isolation pass');
