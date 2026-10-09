import {PRACTICE_BANK,PRACTICE_BOARD_EXTRAS} from './practice-bank.js';
import {random,searchGrid,crosswordGrid} from './daily-puzzles.js';

export const PRACTICE_VERSION=1;
export const PRACTICE_COUNTS={word:200,search:100,crossword:100};
export const PRACTICE_NAMES={word:'Little Word',search:'Word Search',crossword:'Mini crossword'};
// Freeze both catalog order and seed. A saved board must never change on reload.
const words=[...PRACTICE_BANK],rng=random('practice-words-v1');
for(let i=words.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[words[i],words[j]]=[words[j],words[i]];}
export const PRACTICE_WORDS=words.slice(0,PRACTICE_COUNTS.word);
const cache=new Map();
const boardBank=[...PRACTICE_BANK,...PRACTICE_BOARD_EXTRAS];
export function practicePuzzle(type,index){
 if(!Object.hasOwn(PRACTICE_COUNTS,type)||!Number.isInteger(index)||index<0||index>=PRACTICE_COUNTS[type])throw Error('That practice puzzle is not in this collection.');
 const key=type+':'+index;
 if(cache.has(key))return cache.get(key);
 const layout=type==='word'?PRACTICE_WORDS[index]:type==='search'
  ?searchGrid(boardBank,10,random('practice-search-v1:'+index),index%2===1)
  :crosswordGrid(boardBank,9,random('practice-crossword-v1:'+index),6);
 const puzzle={...layout,type,index,id:'practice-v1-'+key,theme:'A little of everything'};
 cache.set(key,puzzle);return puzzle;
}
