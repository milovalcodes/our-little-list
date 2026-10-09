import {PRACTICE_COUNTS,PRACTICE_VERSION} from './practice-catalog.js';

// Deliberately local and namespaced by account AND side. Never writes competitive collections.
export function practiceStore(scope,storage){
 if(!storage){try{storage=globalThis.localStorage;}catch(_){storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};}}
 const prefix='our-little-app-practice-v'+PRACTICE_VERSION+':'+scope+':',memory=new Map();
 let problem='';
 function read(key){if(memory.has(key))return memory.get(key);try{return JSON.parse(storage.getItem(prefix+key))||{};}catch(_){problem='Practice can’t save on this phone right now. Keep this tab open, or allow site storage.';return {};}}
 function write(key,value){memory.set(key,value);try{storage.setItem(prefix+key,JSON.stringify(value));problem='';}catch(_){problem='Practice can’t save on this phone right now. Keep this tab open, or free some browser storage.';}}
 return {
  get warning(){return problem;},
  cursor(type){const n=read('cursor:'+type).index;return Number.isInteger(n)&&n>=0&&n<PRACTICE_COUNTS[type]?n:0;},
  move(type,index){write('cursor:'+type,{index});},
  load(type,index){
   const raw=read(type+':'+index);
   return {guesses:Array.isArray(raw.guesses)?raw.guesses.filter(w=>/^[a-z]{5}$/.test(w)).slice(0,5):[],
    solved:Array.isArray(raw.solved)?[...new Set(raw.solved.filter(n=>Number.isInteger(n)&&n>=0&&n<10))]:[],
    hints:Number.isInteger(raw.hints)?Math.max(0,Math.min(3,raw.hints)):0,
    selected:Number.isInteger(raw.selected)&&raw.selected>=0&&raw.selected<10?raw.selected:0,
    draft:typeof raw.draft==='string'?raw.draft.slice(0,12):'',completed:raw.completed===true};
  },
  save(type,index,state){write(type+':'+index,state);},
  completed(type){let total=0;for(let i=0;i<PRACTICE_COUNTS[type];i++)if(read(type+':'+i).completed===true)total++;return total;}
 };
}
