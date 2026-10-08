// Real Firestore rule evaluation, exclusively in a demo-project emulator.
import assert from 'node:assert/strict';
import {nextGame} from '../couple-game.js';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):8089$/,'refuse to test against a live database');
const project='demo-little-list', household='oLSxADOwjqS04hSS2aHGOcvozmz2';
const base=`http://${host}/v1/projects/${project}/databases/(default)/documents/households/${household}`;
const uid={her:'cwQndCjlRlcaHasR1xzp9EYICFz2',him:household,stranger:'stranger'};
function token(person){return `${Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({iss:`https://securetoken.google.com/${project}`,aud:project,sub:uid[person],user_id:uid[person],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')}.`;}
function value(item){if(typeof item==='string')return{stringValue:item};if(typeof item==='number')return{integerValue:String(item)};if(typeof item==='boolean')return{booleanValue:item};return{mapValue:{fields:Object.fromEntries(Object.entries(item).map(([k,v])=>[k,value(v)]))}};}
async function write(person,game,okay=true){const res=await fetch(`${base}/games/sun-moon`,{method:'PATCH',headers:{authorization:`Bearer ${token(person)}`,'content-type':'application/json'},body:JSON.stringify({fields:value(game).mapValue.fields})});assert.equal(res.ok,okay,`${person} write ${game.ply}: ${await res.text()}`);}
let round=0;
let game=nextGame(null,{action:'start',person:'him',expectedRound:'',round:`rules-${++round}`});
await write('stranger',game,false);await write('her',game,false);await write('him',game);
await write('him',{...game,score:{her:3,him:0}},false);
for(let n=1;n<=3;n++){
  for(const cell of [0,3,1,4,2]){
    const actor=game.turn;
    const next=nextGame(game,{action:'move',person:actor,cell,expectedRound:game.round,expectedPly:game.ply});
    await write(actor==='her'?'him':'her',next,false);
    await write(actor,{...next,score:{her:3,him:3}},false);
    await write(actor,next);game=next;
  }
  const next=nextGame(game,{action:'start',person:'him',expectedRound:game.round,round:`rules-${++round}`});
  await write('him',next);game=next;
}
assert.equal(game.wins.her,1);assert.equal(game.score.her,0);
for(const cell of [0,1,5,2,7,6]){
  const actor=game.turn;game=nextGame(game,{action:'move',person:actor,cell,expectedRound:game.round,expectedPly:game.ply});await write(actor,game);
}
for(let loop=0;loop<6;loop++)for(const [from,to]of [['5','4'],['1','3'],['4','5'],['3','1']]){
  const actor=game.turn;const next=nextGame(game,{action:'move',person:actor,cell:to,fromCell:from,expectedRound:game.round,expectedPly:game.ply});
  await write(actor,{...next,board:{...next.board,[from]:actor}},false);
  await write(actor,next);game=next;
}
assert.equal(game.ply,30);
game=nextGame(game,{action:'start',person:'her',expectedRound:game.round,round:`rules-${++round}`});await write('her',game);
game=nextGame(game,{action:'close',person:'him',expectedRound:game.round,expectedPly:game.ply});await write('him',game);
const strangerRead=await fetch(`${base}/games/sun-moon`,{headers:{authorization:`Bearer ${token('stranger')}`}});assert.equal(strangerRead.status,403);
console.log('FIRESTORE RULES: both sides, match scores, shifting, illegal moves, outsider access, draws and ending checked');
