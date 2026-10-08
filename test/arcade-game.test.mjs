import assert from 'node:assert/strict';
import {nextGame,gameResult,gameMessage,gamePingCurrent,messageGameId,gameRoute,gameHref,selectedGameId,gameNeedsPing} from '../couple-game.js';
import {BOX_EDGES,FOUR_LINES,boxCounts} from '../arcade-game.js';
import {startArcade,moveArcade,playout,FOUR_DRAW} from './arcade-fixtures.mjs';
assert.equal(FOUR_LINES.length,69);assert.equal(BOX_EDGES.length,9);
assert.throws(()=>selectedGameId('constructor'));assert.throws(()=>selectedGameId('../notes'));
for(const id of ['connect-four','dots-boxes']){
  let game=startArcade(id);
  const ping=gameMessage(game,'Moon');assert.equal(messageGameId(ping),id);assert.equal(gamePingCurrent(ping,game),true);
  assert.deepEqual(gameRoute(gameHref(game).split('games.html')[1]),{id,round:game.round});
  assert.equal(gameRoute(`#game-${id}`).id,id);
  assert.throws(()=>nextGame(game,{gameId:id,action:'start',person:'him',expectedRound:game.round,round:'new'}),/already/);
  assert.throws(()=>nextGame(game,{gameId:id,action:'move',person:'him',cell:0,expectedRound:game.round,expectedPly:0}),/turn/);
  game=moveArcade(game,0);assert.equal(gamePingCurrent(ping,game),false);
  assert.throws(()=>nextGame(game,{gameId:id,action:'move',person:game.turn,cell:1,expectedRound:game.round,expectedPly:0}),/changed/);
  for(const cell of [-1,'1e1',null,100])assert.throws(()=>moveArcade(game,cell));
  const closed=nextGame(game,{gameId:id,action:'close',person:'her',expectedRound:game.round,expectedPly:game.ply});
  assert.equal(gameResult(closed).over,true);assert.equal(gameMessage(closed,'Sun').title,'Round put away');
  assert.throws(()=>moveArcade(closed,2),/ended/);
}
let four=startArcade('connect-four');
for(let round=1;round<=3;round++){
  for(const col of [0,1,0,1,0,1,0])four=moveArcade(four,col);
  assert.equal(four.winner,'her');assert.equal(four.score.her,round);assert.equal(four.wins.her,round===3?1:0);
  four=startArcade('connect-four',`round-${round}`,four);
}
assert.equal(four.wins.her,1);assert.equal(four.score.her,0);
for(let i=0;i<6;i++)four=moveArcade(four,0);
assert.throws(()=>moveArcade(four,0),/full/);
const directions=new Set();
for(let seed=1;seed<=1000;seed++){
  const {game,states}=playout('connect-four',seed),result=gameResult(game);
  if(result.winner)directions.add(result.line[1]-result.line[0]);
  assert.equal(game.winner,result.winner||'');
  for(const state of states){assert.equal(Object.keys(state.board).length,state.ply);for(const key of Object.keys(state.board))if(Number(key)<35)assert.ok(state.board[Number(key)+7]);}
}
assert.deepEqual([...directions].sort(),[1,6,7,8]);
let draw=startArcade('connect-four');for(const cell of FOUR_DRAW)draw=moveArcade(draw,cell);
assert.equal(gameResult(draw).draw,true);assert.equal(draw.ply,42);assert.equal(draw.winner,'');
let boxes=startArcade('dots-boxes');
for(const edge of [0,1,3,4,12,14,13])boxes=moveArcade(boxes,edge);
assert.deepEqual(boxCounts(boxes),{her:2,him:0});assert.equal(boxes.turn,'her');assert.equal(boxes.ply,7);
assert.equal(gameNeedsPing(boxes),false,'extra turn does not ping the waiting person');
assert.throws(()=>moveArcade(boxes,13),/taken/);
let loserClosed=false;
for(let seed=1;seed<=100;seed++){
  const {game,states}=playout('dots-boxes',seed);
  assert.equal(game.ply,24);assert.equal(Object.keys(game.boxes).length,9);
  assert.equal(gameNeedsPing(game),true,'the end of the round always pings');
  const count=boxCounts(game);assert.equal(game.winner,count.her>count.him?'her':'him');
  assert.equal(game.score[game.winner],1);assert.equal(game.score[game.winner==='her'?'him':'her'],0);
  for(const state of states)for(const key of Object.keys(state.boxes))assert.ok(BOX_EDGES[key].every(edge=>state.board[edge]));
  if(game.winner!==game.lastBy){loserClosed=true;assert.equal(gameMessage(game,'Moon').title,'You took the round ✦');}
}
assert.ok(loserClosed,'winner may not be the final mover');
assert.equal(messageGameId({ref:'../../x/a/open'}),null);
console.log('ARCADE: 1,100 full games, all win directions, gravity, draws, double boxes, bonus turns, scores and exact links');
