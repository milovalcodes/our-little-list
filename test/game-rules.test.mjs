// Real Firestore rule evaluation, exclusively in a demo-project emulator.
import assert from 'node:assert/strict';
import {nextGame,gameMessage,gameNeedsPing} from '../couple-game.js';
import {startArcade,moveArcade,playout,FOUR_DRAW} from './arcade-fixtures.mjs';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host||'',/^(127\.0\.0\.1|localhost):8089$/,'refuse to test against a live database');
const project='demo-little-list', household='oLSxADOwjqS04hSS2aHGOcvozmz2';
const base=`http://${host}/v1/projects/${project}/databases/(default)/documents/households/${household}`;
const uid={her:'cwQndCjlRlcaHasR1xzp9EYICFz2',him:household,stranger:'stranger'};
function token(person){return `${Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({iss:`https://securetoken.google.com/${project}`,aud:project,sub:uid[person],user_id:uid[person],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'custom'}})).toString('base64url')}.`;}
function value(item){if(typeof item==='string')return{stringValue:item};if(typeof item==='number')return{integerValue:String(item)};if(typeof item==='boolean')return{booleanValue:item};return{mapValue:{fields:Object.fromEntries(Object.entries(item).map(([k,v])=>[k,value(v)]))}};}
async function write(person,game,okay=true){const res=await fetch(`${base}/games/${game.mode||'sun-moon'}`,{method:'PATCH',headers:{authorization:`Bearer ${token(person)}`,'content-type':'application/json'},body:JSON.stringify({fields:value(game).mapValue.fields})});assert.equal(res.ok,okay,`${game.mode||'sun-moon'} ${person} write ${game.ply}: ${await res.text()}`);}
async function moveWithPing(person,game){
  const name=`projects/${project}/databases/(default)/documents/households/${household}`,id=game.mode||'sun-moon';
  const writes=[{update:{name:`${name}/games/${id}`,fields:value(game).mapValue.fields}}];
  if(gameNeedsPing(game))writes.push({update:{name:`${name}/outbox/game-${id}-${game.round}-${game.ply}`,fields:value(gameMessage(game,'Test player')).mapValue.fields}});
  const res=await fetch(`http://${host}/v1/projects/${project}/databases/(default)/documents:commit`,{method:'POST',headers:{authorization:`Bearer ${token(person)}`,'content-type':'application/json'},body:JSON.stringify({writes})});
  assert.ok(res.ok,`${id} atomic move + ping: ${await res.text()}`);
}
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

for(const id of ['connect-four','dots-boxes']){
  let current=null;
  const doubles=[0,1,3,4,12,14,13];
  const rounds=id==='connect-four'?[[0,1,0,1,0,1,0],[0,6,1,6,2,5,3],FOUR_DRAW,...Array.from({length:10},(_,i)=>playout(id,i+1).cells)]:[[...doubles,...Array.from({length:24},(_,i)=>i).filter(i=>!doubles.includes(i))],...Array.from({length:5},(_,i)=>playout(id,i+1).cells)];
  for(const cells of rounds){
    current=startArcade(id,`arcade-${++round}`,current);
    await write('stranger',current,false);await write('him',current);
    if(id==='connect-four')await write('her',{...moveArcade(current,0),board:{0:'her'},lastCell:0},false);
    for(const cell of cells){
      const actor=current.turn,next=moveArcade(current,cell);
      await write(actor==='her'?'him':'her',next,false);
      await write(actor,{...next,score:{her:3,him:3}},false);
      if(next.ply===1){
        await write(actor,{...next,winner:actor},false);
        if(id==='dots-boxes'){
          await write(actor,{...next,boxes:{0:actor},turn:actor},false);
          await write(actor,{...next,boxes:{0:''},turn:actor},false);
        }
      }
      if(id==='dots-boxes'&&Object.keys(current.boxes).length){
        const key=Object.keys(current.boxes)[0];
        await write(actor,{...next,boxes:{...next.boxes,[key]:current.boxes[key]==='her'?'him':'her'}},false);
      }
      await moveWithPing(actor,next);current=next;
    }
  }
  current=startArcade(id,`close-${++round}`,current);await write('him',current);
  const closed=nextGame(current,{gameId:id,action:'close',person:'her',expectedRound:current.round,expectedPly:0});await write('her',closed);
  console.log(`FIRESTORE ARCADE: ${id} legal rounds, turn checks, forged scores/wins/boxes, gravity, resets and close`);
}
