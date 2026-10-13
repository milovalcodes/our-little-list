import assert from 'node:assert/strict';
import {activityClock} from '../activity-clock.js';
import {wordForDay} from '../daily-words.js';
import {timedPuzzle} from '../daily-puzzles.js';
import {prepareReset} from '../game-reset.js';
import {nextWordAttempt,wordSummary} from '../word-game.js';
import {weeklyRounds} from '../round-engine.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):8089$/,'emulator only');
const project='demo-little-list',uid='oLSxADOwjqS04hSS2aHGOcvozmz2',root=`projects/${project}/databases/(default)/documents`,base=`http://${host}/v1/${root}`,prefix=root+'/households/'+uid+'/';
const day=activityClock().day,now=Date.now();
const value=v=>v===null?{nullValue:null}:Array.isArray(v)?{arrayValue:{values:v.map(value)}}:typeof v==='string'?{stringValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='boolean'?{booleanValue:v}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))}};
const update=(path,data)=>({update:{name:prefix+path,fields:value(data).mapValue.fields}}),remove=path=>({delete:prefix+path});
function auth(side){if(side==='owner')return 'owner';const id=side==='him'?uid:side==='her'?'cwQndCjlRlcaHasR1xzp9EYICFz2':'stranger';return Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({iss:'https://securetoken.google.com/'+project,aud:project,sub:id,user_id:id,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')+'.';}
async function commit(side,writes,ok=true){const r=await fetch(base+':commit',{method:'POST',headers:{authorization:'Bearer '+auth(side),'content-type':'application/json'},body:JSON.stringify({writes})});assert.equal(r.ok,ok,'commit '+side+': '+await r.text());}
const puzzles=[wordForDay(day),timedPuzzle(day,'search'),timedPuzzle(day,'crossword')];
const location=p=>`${p.word?'wordPuzzles':'timedPuzzles'}/${day}${p.word?'':'-'+p.type}`;
await commit('owner',puzzles.map(p=>update(location(p),p)));
const game=nextWordAttempt(null,puzzles[0],{day,person:'her',guess:puzzles[0].word,expectedCount:0,now});
await commit('her',[update('wordGames/'+day+'-her',game),update('wordResults/'+day+'-her',wordSummary(game))]);
await commit('him',[remove('wordGames/'+day+'-her')],false);
const requestId='rules-reset-1234567890abcdef',reset=prepareReset({day,scope:'all',puzzles,requestId,now});
const writes=Object.entries(reset.rounds).flatMap(([type,p])=>[update(location(p),p),...['her','him'].flatMap(person=>(type==='word'?['wordGames','wordResults']:['timedGames','timedResults']).map(c=>remove(`${c}/${day}${type==='word'?'':'-'+type}-${person}`)))]);
writes.push(update('gameResetWeeks/'+reset.week,{week:reset.week,used:reset.used,updatedAt:now}),update('gameResets/'+requestId,{day,scope:'all',requestId,by:uid,before:puzzles,createdAt:now}),update('gamePlans/'+reset.week,{week:reset.week,days:weeklyRounds(day),createdAt:now}));
await commit('her',writes,false);await commit('stranger',writes,false);
await commit('him',writes.filter(w=>!w.delete?.endsWith('wordGames/'+day+'-her')),false);
await commit('him',writes);
await commit('him',[update('gamePlans/'+reset.week,{week:reset.week,days:weeklyRounds(day),createdAt:now+1})],false,'frozen weekly reservations cannot be changed');
await commit('him',writes,false,'a duplicate cannot change an immutable reset receipt');
const old=nextWordAttempt(null,puzzles[0],{day,person:'her',guess:'apple',expectedCount:0,now});
await commit('her',[update('wordGames/'+day+'-her',old),update('wordResults/'+day+'-her',wordSummary(old))],false);
const fresh=nextWordAttempt(null,reset.rounds.word,{day,person:'her',guess:reset.rounds.word.word,expectedCount:0,expectedRevision:1,now});
await commit('her',[update('wordGames/'+day+'-her',fresh),update('wordResults/'+day+'-her',wordSummary(fresh))]);
await commit('him',[remove('wordResults/'+day+'-her')],false);
for(const side of ['her','stranger']){const r=await fetch(base+'/households/'+uid+'/gameResets/'+requestId,{headers:{authorization:'Bearer '+auth(side)}});assert.equal(r.status,403);}
console.log('ADMIN RESET RULES: atomic all-game reset, absent games, auth isolation, private audit, stale revisions, immutable receipts and points protection pass');
