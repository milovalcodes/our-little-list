import {PUZZLE_LIMIT_MS,PUZZLE_TYPES,isHardDay} from './daily-puzzles.js';
export function millis(value){return typeof value==='number'?value:value?.toMillis?.()??(value?.seconds!=null?value.seconds*1000+Math.floor((value.nanoseconds||0)/1e6):0);}
export function timedLimit(type){return PUZZLE_TYPES.includes(type)?PUZZLE_LIMIT_MS:0;}
export function timedPoints(game,now=Date.now()){
 if(!timedOver(game,now))return 0;
 const count=game.count??game.solved?.length??0,multiplier=isHardDay(game.day)?2:1;
 if(!Number.isInteger(count)||!Number.isInteger(game.total)||game.total<=0||count<0||count>game.total)return 0;
 return Math.round(count/game.total*50)*multiplier;
}
export function timedOver(game,now=Date.now()){return Boolean(game&&(game.done||now>=Math.min(millis(game.startedAt)+timedLimit(game.type),game.closesAt||Infinity)));}
export function timedCeiling(game,type,now=Date.now()){
 if(!PUZZLE_TYPES.includes(type))return 0;
 if(timedOver(game,now))return timedPoints(game,now);
 return 100; // An unfinished hard board can still be completed for 100.
}
export function timedSummary(game){return {day:game.day,type:game.type,person:game.person,startedAt:game.startedAt,finishedAt:game.finishedAt,done:game.done,complete:game.complete,count:game.solved.length,total:game.total,closesAt:game.closesAt};}
export function newTimedGame(puzzle,person,now=Date.now()){
 if(!puzzle||!['her','him'].includes(person)||now<puzzle.opensAt||now>=puzzle.closesAt)throw Error('This puzzle is not open.');
 return {day:puzzle.day,type:puzzle.type,person,startedAt:now,finishedAt:null,solved:[],foundAt:[],done:false,complete:false,total:puzzle.entries.length,closesAt:puzzle.closesAt};
}
export function advanceTimedGame(game,puzzle,{index,expectedCount,now=Date.now()}){
 if(!game||!puzzle||game.day!==puzzle.day||game.type!==puzzle.type)throw Error('Start this puzzle first.');
 if(game.done)return game;
 if(game.solved.length!==expectedCount)throw Error('Your other screen is catching up. Try again.');
 const elapsed=Math.max(0,now-millis(game.startedAt)),expired=elapsed>=timedLimit(game.type)||now>=puzzle.closesAt;
 if(expired)return {...game,done:true,complete:false,finishedAt:now};
 if(!Number.isInteger(index)||index<0||index>=puzzle.entries.length)throw Error('Not a word on this board.');
 if(game.solved.includes(index))throw Error('Already found that one.');
 const solved=[...game.solved,index],complete=solved.length===puzzle.entries.length;
 return {...game,solved,foundAt:[...game.foundAt,elapsed],done:complete,complete,finishedAt:complete?now:null};
}
