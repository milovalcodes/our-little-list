import {PRACTICE_EDITION_WORDS,PRACTICE_EDITION_EXTRAS} from './practice-edition-bank.js';
import {random,searchGrid} from './daily-puzzles.js';
import {miniLattice} from './mini-crossword.js';

// Changed answers need a separate save namespace; keep old progress intact.
export const PRACTICE_VERSION=3;
export const PRACTICE_VERSIONS={word:3,search:3,crossword:5};
export const PRACTICE_COUNTS={word:200,search:100,crossword:100};
export const PRACTICE_NAMES={word:'Little Word',search:'Word Search',crossword:'Mini crossword'};
// Spread practice across starting letters, then freeze a shuffled order within
// each difficulty. Alphabetical answers accidentally give away the next puzzle.
function practiceWords(difficulty){
 const rng=random('practice-words-v3:'+difficulty),groups=new Map();
 for(const e of PRACTICE_EDITION_WORDS.filter(e=>e.difficulty===difficulty)){
  if(!groups.has(e.word[0]))groups.set(e.word[0],[]);
  groups.get(e.word[0]).push(e);
 }
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const buckets=shuffle([...groups.values()].map(shuffle)),chosen=[];
 while(chosen.length<100){
  let added=false;
  for(const group of buckets)if(group.length&&chosen.length<100){chosen.push(group.pop());added=true;}
  if(!added)throw Error('Incomplete practice difficulty');
 }
 return shuffle(chosen);
}
// A regression hash freezes the exact words and all 400 generated puzzles.
export const PRACTICE_WORDS=[...practiceWords('normal'),...practiceWords('hard')];
if(PRACTICE_WORDS.length!==200||PRACTICE_WORDS.some(e=>!e))throw Error('Incomplete practice edition');
const cache=new Map();
const boardBank=[...PRACTICE_EDITION_WORDS,...PRACTICE_EDITION_EXTRAS];
const minis=[],miniGrids=new Set();
function practiceMini(index){
 // Build in index order so opening puzzle 99 first produces the same edition.
 while(minis.length<=index){
  const n=minis.length,level=n>=50?'hard':'normal',pool=boardBank.filter(e=>e.difficulty===level);
  let mini=null;
  for(let attempt=0;attempt<500;attempt++){
   const rng=random('practice-mini-v5:'+n+':'+attempt);
   let candidate=miniLattice(pool,rng);
   if(!candidate||miniGrids.has(candidate.grid))candidate=miniLattice(boardBank,rng);
   if(candidate&&!miniGrids.has(candidate.grid)){mini=candidate;break;}
  }
  if(!mini)throw Error('Could not make a distinct practice mini');
  miniGrids.add(mini.grid);minis.push(mini);
 }
 return minis[index];
}
export function practicePuzzle(type,index){
 if(!Object.hasOwn(PRACTICE_COUNTS,type)||!Number.isInteger(index)||index<0||index>=PRACTICE_COUNTS[type])throw Error('That practice puzzle is not in this collection.');
 const key=type+':'+index;
 if(cache.has(key))return cache.get(key);
 const hard=index>=PRACTICE_COUNTS[type]/2,difficulty=hard?'hard':'normal';
 const bank=boardBank.filter(e=>e.difficulty===difficulty),size=hard?12:11,rng=random('practice-v3:'+key);
 const layout=type==='word'?PRACTICE_WORDS[index]:type==='search'
  ?searchGrid(bank,size,rng,true)
  :practiceMini(index);
 if(!layout)throw Error('Could not make a practice mini');
 const puzzle={...layout,type,index,difficulty,id:'practice-v'+PRACTICE_VERSIONS[type]+'-'+key,theme:'A little of everything'};
 cache.set(key,puzzle);return puzzle;
}
