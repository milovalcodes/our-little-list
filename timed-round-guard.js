import {millis,timedLimit,timedOver} from './timed-game.js';
import {revisionOf} from './round-revision.js';

export function competingRound(games,{day,type,person},puzzles=[],now=Date.now()){
 return games.find(game=>{
  if(game.day!==day||game.person!==person||game.type===type||!['search','crossword'].includes(game.type)||!millis(game.startedAt)||timedOver(game,now))return false;
  const puzzle=puzzles.find(p=>p.day===day&&p.type===game.type);
  return !puzzle||revisionOf(game)===revisionOf(puzzle);
 })||null;
}
export function roundWaitMessage(game,now=Date.now()){
 const remaining=Math.max(0,Math.ceil((Math.min(millis(game.startedAt)+timedLimit(game.type,game),game.closesAt||Infinity)-now)/1000));
 return `Finish ${game.type==='search'?'Word Search':'Crossword'} first · ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} left`;
}
