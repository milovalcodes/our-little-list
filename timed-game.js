import {PUZZLE_LIMIT_MS,PUZZLE_TYPES,isHardDay} from './daily-puzzles.js';
import {assertRevision,revisionOf} from './round-revision.js';
import {newScoring} from './word-scores.js';
export function millis(value){return typeof value==='number'?value:value?.toMillis?.()??(value?.seconds!=null?value.seconds*1000+Math.floor((value.nanoseconds||0)/1e6):0);}
export function timedLimit(type,round={}){return PUZZLE_TYPES.includes(type)?([120000,150000,180000,240000,300000,360000].includes(round?.durationMs)?round.durationMs:PUZZLE_LIMIT_MS):0;}
// Snapshot the extra time at start, including boards from frozen weekly plans.
// Started rounds and historical results always use their saved duration.
export const EXTRA_TIME_START=Date.parse('2026-10-22T13:00:00Z');
export function timedStartLimit(type,puzzle,now=Date.now()){
 return timedLimit(type,puzzle)+(now>=EXTRA_TIME_START?(type==='search'?30000:type==='crossword'?60000:0):0);
}
// Finishing a whole board early earns +1 per 5 s left, up to +10 (new-scoring
// days only). Both times are server timestamps checked by the rules.
export const TIME_BONUS_STEP=5000,TIME_BONUS_MAX=10;
export function timeSaved(game){
 if(!game?.complete||!millis(game.finishedAt)||!millis(game.startedAt))return 0;
 return Math.max(0,Math.min(timedLimit(game.type,game),timedLimit(game.type,game)-(millis(game.finishedAt)-millis(game.startedAt))));
}
export function timeBonus(game){return newScoring(game?.day)&&game.complete?Math.min(TIME_BONUS_MAX,Math.floor(timeSaved(game)/TIME_BONUS_STEP)):0;}
export function timedBase(game){
 const count=game.count??game.solved?.length??0;
 if(!Number.isInteger(count)||!Number.isInteger(game.total)||game.total<=0||count<0||count>game.total)return null;
 return Math.round(count/game.total*50);
}
export function timedPoints(game,now=Date.now()){
 if(!timedOver(game,now))return 0;
 const base=timedBase(game),multiplier=isHardDay(game.day)?2:1;
 if(base===null)return 0;
 return (base+(base===50?timeBonus(game):0))*multiplier;
}
export function timedMax(day){return (50+(newScoring(day)?TIME_BONUS_MAX:0))*(isHardDay(day)?2:1);}
// A hidden partner marker (see daily-results.js) is never a finished round.
export function timedOver(game,now=Date.now()){return Boolean(game&&!game.hidden&&(game.done||now>=Math.min(millis(game.startedAt)+timedLimit(game.type,game),game.closesAt||Infinity)));}
export function timedCeiling(game,type,now=Date.now(),day=game?.day){
 if(!PUZZLE_TYPES.includes(type))return 0;
 if(timedOver(game,now))return timedPoints(game,now);
 // An unfinished hard board can still be completed, early, for the maximum.
 return day?timedMax(day):100;
}
export function timedSummary(game){return {day:game.day,type:game.type,person:game.person,startedAt:game.startedAt,finishedAt:game.finishedAt,done:game.done,complete:game.complete,count:game.solved.length,total:game.total,closesAt:game.closesAt,...(game.durationMs?{durationMs:game.durationMs}:{}),...(revisionOf(game)?{revision:revisionOf(game)}:{})};}
export function newTimedGame(puzzle,person,now=Date.now()){
 if(!puzzle||!['her','him'].includes(person)||now<puzzle.opensAt||now>=puzzle.closesAt)throw Error('This puzzle is not open.');
 return {day:puzzle.day,type:puzzle.type,person,startedAt:now,finishedAt:null,solved:[],foundAt:[],done:false,complete:false,total:puzzle.entries.length,closesAt:puzzle.closesAt,...(puzzle.durationMs||now>=EXTRA_TIME_START?{durationMs:timedStartLimit(puzzle.type,puzzle,now)}:{}),...(revisionOf(puzzle)?{revision:revisionOf(puzzle)}:{})};
}
export function advanceTimedGame(game,puzzle,{index,expectedCount,expectedRevision=0,now=Date.now()}){
 assertRevision(puzzle,expectedRevision,game);
 if(!game||!puzzle||game.day!==puzzle.day||game.type!==puzzle.type)throw Error('Start this puzzle first.');
 if(game.done)return game;
 if(game.solved.length!==expectedCount)throw Error('Your other screen is catching up. Try again.');
 const elapsed=Math.max(0,now-millis(game.startedAt)),expired=elapsed>=timedLimit(game.type,game)||now>=puzzle.closesAt;
 if(expired)return {...game,done:true,complete:false,finishedAt:now};
 if(!Number.isInteger(index)||index<0||index>=puzzle.entries.length)throw Error('Not a word on this board.');
 if(game.solved.includes(index))throw Error('Already found that one.');
 const solved=[...game.solved,index],complete=solved.length===puzzle.entries.length;
 return {...game,solved,foundAt:[...game.foundAt,elapsed],done:complete,complete,finishedAt:complete?now:null};
}
