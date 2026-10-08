import { nextGame, gameResult } from '../couple-game.js';
export const FOUR_DRAW=Array.from({length:6},()=>[0,2,1,3,4,6,5]).flat();
export const startArcade=(id,round='test-round',current=null,person='him')=>nextGame(current,{gameId:id,action:'start',person,expectedRound:current?.round||'',round});
export const moveArcade=(game,cell)=>nextGame(game,{gameId:game.mode,action:'move',person:game.turn,cell,expectedRound:game.round,expectedPly:game.ply});
export function playout(id,seed=1){
  let game=startArcade(id),state=seed;
  const cells=[],states=[];
  while(!gameResult(game).over){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const available=Array.from({length:id==='connect-four'?7:24},(_,i)=>i).filter(cell=>!game.board[cell]);
    const cell=available[state%available.length];cells.push(cell);game=moveArcade(game,cell);states.push(game);
  }
  return {cells,states,game};
}
