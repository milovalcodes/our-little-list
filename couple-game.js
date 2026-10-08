// One shared, asynchronous board. This module has no browser dependencies:
// the UI, transaction, delivery worker and tests use the same turn logic.
import { ARCADE_MODES, arcadeResult, nextArcade } from './arcade-game.js';
export const GAME_ID = 'sun-moon';
export const GAME_CATALOG = { [GAME_ID]:{name:'Three to Move',icon:'☀︎☾',hint:'place three · then move them'}, ...ARCADE_MODES };
export function selectedGameId(id=GAME_ID) {
  if(!Object.hasOwn(GAME_CATALOG,id))throw new Error('Choose a game first.');
  return id;
}
export function gameHref(game, id=game?.mode||GAME_ID) {
  return `activities.html#game-${id===GAME_ID?'':`${selectedGameId(id)}--`}${game.round}`;
}
export function gameRoute(hash) {
  for(const id of Object.keys(ARCADE_MODES)) {
    if(hash===`#game-${id}`)return {id,round:''};
    if(hash.startsWith(`#game-${id}--`))return {id,round:hash.slice(`#game-${id}--`.length)};
  }
  return {id:GAME_ID,round:/^#game-(.+)$/.exec(hash)?.[1]||''};
}
export const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const partner = person => person === 'her' ? 'him' : 'her';

export function gameResult(game) {
  if(game?.mode)return arcadeResult(game);
  const board = game?.board || {};
  const line = WIN_LINES.find(cells => board[cells[0]] && cells.every(cell => board[cell] === board[cells[0]]));
  if (line) return { over:true, winner:board[line[0]], line };
  if (game?.ply >= 30) return { over:true, draw:true, line:[] };
  return { over:!game || game.closed === true, line:[] };
}

export function nextGame(current, options) {
  const id=selectedGameId(options.gameId||current?.mode||GAME_ID);
  if(id!==GAME_ID)return nextArcade(current,{...options,gameId:id});
  const { action, person, cell, fromCell = '', expectedRound, expectedPly, round, now = Date.now() }=options;
  if (!['her','him'].includes(person)) throw new Error('Sign in to play.');
  if ((current?.round || '') !== (expectedRound || '')) throw new Error('The board changed. Take another look.');
  if (action === 'start') {
    if (current && !gameResult(current).over) throw new Error('There’s already a round going.');
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(round || '') || round === current?.round) throw new Error('Try starting a fresh round.');
    const matchOver=current && Math.max(current.score.her,current.score.him)>=3;
    return { round, board:{}, turn:partner(person), startedBy:person, lastBy:person, lastCell:'', fromCell:'', ply:0,
      score:!current||matchOver?{her:0,him:0}:{...current.score}, wins:current?{...current.wins}:{her:0,him:0}, createdAt:now, updatedAt:now, closed:false };
  }
  if (!current || gameResult(current).over) throw new Error('This round has ended.');
  if(current.ply !== expectedPly)throw new Error('The board changed. Take another look.');
  if (action === 'close') return { ...current, closed:true, lastBy:person, updatedAt:now };
  if (action !== 'move' || current.turn !== person) throw new Error('It’s not your turn yet.');
  const key = String(cell);
  if (!/^[0-8]$/.test(key) || current.board[key]) throw new Error('That square is already taken.');
  const board={...current.board};
  const shifting=Object.values(board).filter(value=>value===person).length===3;
  if(shifting){
    if(!/^[0-8]$/.test(fromCell)||board[fromCell]!==person)throw new Error('Pick one of your pieces to move first.');
    delete board[fromCell];
  }else if(fromCell)throw new Error('Place your three pieces first.');
  board[key]=person;
  const next={...current,board,turn:partner(person),lastBy:person,lastCell:key,fromCell:shifting?fromCell:'',ply:current.ply+1,updatedAt:now,score:{...current.score},wins:{...current.wins}};
  if(gameResult(next).winner){next.score[person]+=1;if(next.score[person]===3)next.wins[person]+=1;}
  return next;
}

export function gameMessage(game, name) {
  const count=game.ply;
  const result=gameResult(game);
  const matchWon=result.winner&&game.score[result.winner]===3;
  const id=game.mode||GAME_ID,label=GAME_CATALOG[id].name;
  const wonByLast=result.winner===game.lastBy;
  const title=game.closed?'Round put away':matchWon?(wonByLast?`${name} won the match 🏆`:'You won the match 🏆'):result.winner?(wonByLast?`${name} took the round`:'You took the round ✦'):result.draw?'A very diplomatic draw':count?(game.turn===game.lastBy?`${name} claimed a box`:'Your turn ☀︎☾'):`${name} invited you to play`;
  return { to:partner(game.lastBy), title, body:game.closed?'Another time.':result.over?`${label} · Sun ${game.score.her} · Moon ${game.score.him}. ${matchWon?'Rematch?':'Next round?'}`:count?`${label} · ${game.turn===game.lastBy?'they get another turn.':`${name} made a move.`}`:`${label} · you get the first move.`, url:gameHref(game), kind:'game', ref:`${id===GAME_ID?'':`${id}/`}${game.round}/${count}/${game.closed?'closed':'open'}`, sendAt:game.updatedAt, createdAt:game.updatedAt };
}

export function messageGameId(message) {
  const parts=String(message.ref||'').split('/');
  return parts.length===3?GAME_ID:parts.length===4&&Object.hasOwn(ARCADE_MODES,parts[0])?parts[0]:null;
}
export function gameNeedsPing(game) {
  return game.turn !== game.lastBy || gameResult(game).over;
}
export function gamePingCurrent(message, game) {
  const id=messageGameId(message);
  return Boolean(game && id && id===(game.mode||GAME_ID) && message.ref === `${id===GAME_ID?'':`${id}/`}${game.round}/${game.ply}/${game.closed?'closed':'open'}`);
}
