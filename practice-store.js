import {PRACTICE_COUNTS,PRACTICE_VERSION,PRACTICE_VERSIONS} from './practice-catalog.js';

// Deliberately local and namespaced by account AND side. Never writes competitive collections.
export function practiceStore(scope,storage){
 if(!storage){try{storage=globalThis.localStorage;}catch(_){storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};}}
 const prefix=key=>'our-little-app-practice-v'+(PRACTICE_VERSIONS[key.split(':')[key.startsWith('cursor:')?1:0]]||PRACTICE_VERSION)+':'+scope+':',memory=new Map();
 let problem='';
 function read(key){if(memory.has(key))return memory.get(key);try{return JSON.parse(storage.getItem(prefix(key)+key))||{};}catch(_){problem='Practice can’t save on this phone right now. Keep this tab open, or allow site storage.';return {};}}
 function write(key,value){memory.set(key,value);try{storage.setItem(prefix(key)+key,JSON.stringify(value));problem='';}catch(_){problem='Practice can’t save on this phone right now. Keep this tab open, or free some browser storage.';}}
 return {
  get warning(){return problem;},
  cursor(type,difficulty){const start=difficulty==='hard'?PRACTICE_COUNTS[type]/2:0,end=difficulty==='normal'?PRACTICE_COUNTS[type]/2:PRACTICE_COUNTS[type];const n=read('cursor:'+type+(difficulty?':'+difficulty:'')).index;return Number.isInteger(n)&&n>=start&&n<end?n:start;},
  move(type,index,difficulty){write('cursor:'+type,{index});if(difficulty)write('cursor:'+type+':'+difficulty,{index});},
  load(type,index){
   const raw=read(type+':'+index);
   return {guesses:Array.isArray(raw.guesses)?raw.guesses.filter(w=>/^[a-z]{5}$/.test(w)).slice(0,6):[],
    solved:Array.isArray(raw.solved)?[...new Set(raw.solved.filter(n=>Number.isInteger(n)&&n>=0&&n<(type==='crossword'?20:10)))]:[],
    hints:Number.isInteger(raw.hints)?Math.max(0,Math.min(3,raw.hints)):0,
    selected:Number.isInteger(raw.selected)&&raw.selected>=0&&raw.selected<(type==='crossword'?20:10)?raw.selected:0,
    draft:typeof raw.draft==='string'?raw.draft.slice(0,12):'',completed:raw.completed===true};
  },
  save(type,index,state){write(type+':'+index,state);},
  completed(type,difficulty){let total=0;const start=difficulty==='hard'?PRACTICE_COUNTS[type]/2:0,end=difficulty==='normal'?PRACTICE_COUNTS[type]/2:PRACTICE_COUNTS[type];for(let i=start;i<end;i++)if(read(type+':'+i).completed===true)total++;return total;}
 };
}
