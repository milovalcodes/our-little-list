// One shared, asynchronous board. This module has no browser dependencies:
// the UI, transaction, delivery worker and tests use the same turn logic.
export const GAME_ID = 'sun-moon';
export const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const partner = person => person === 'her' ? 'him' : 'her';

export function gameResult(game) {
  const board = game?.board || {};
  const line = WIN_LINES.find(cells => board[cells[0]] && cells.every(cell => board[cell] === board[cells[0]]));
  if (line) return { over:true, winner:board[line[0]], line };
  if (game?.ply >= 30) return { over:true, draw:true, line:[] };
  return { over:!game || game.closed === true, line:[] };
}

export function nextGame(current, { action, person, cell, fromCell = '', expectedRound, expectedPly, round, now = Date.now() }) {
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
  const title=game.closed?'Round put away':matchWon?`${name} won the match 🏆`:result.winner?`${name} took the round`:result.draw?'A very diplomatic draw':count?`Your turn ☀︎☾`:`${name} invited you to play`;
  return { to:partner(game.lastBy), title, body:game.closed?'Another time.':result.over?`Sun ${game.score.her} · Moon ${game.score.him}. ${matchWon?'Rematch?':'Next round?'}`:count?`${name} made a move.`:'Sun vs Moon · you get the first move.', url:`today.html#game-${game.round}`, kind:'game', ref:`${game.round}/${count}/${game.closed?'closed':'open'}`, sendAt:game.updatedAt, createdAt:game.updatedAt };
}

export function gamePingCurrent(message, game) {
  return Boolean(game && message.ref === `${game.round}/${game.ply}/${game.closed?'closed':'open'}`);
}
