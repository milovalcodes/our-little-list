import {NO_REPEAT_START,REPEAT_GAP_DAYS,roundWords} from '../round-engine.js';
import {INITIAL_ROUND_HISTORY} from '../round-history.js';
import {WORD_BOOK} from '../word-book.js';
import {wordHint} from '../word-hints.js';
import {WORD_LEXICON} from '../word-lexicon.js';
export function auditDailyCalendar(calendar){
 const seen=new Map(),signatures=new Set();
 const check=(ok,message)=>{if(!ok)throw Error('Daily calendar: '+message);};
 for(const [day,rounds]of Object.entries(calendar.rounds).sort(([a],[b])=>a.localeCompare(b))){
  const modern=day>=NO_REPEAT_START;
  check(Object.keys(rounds).sort().join(',')==='crossword,search,word',day+' needs all three games');
  for(const [type,p]of Object.entries(rounds)){
   check(p.day===day,day+' has a mismatched day');
   check(p.closesAt>p.opensAt,day+' has an invalid opening window');
   if(type==='word'){
    check(/^[a-z]{5}$/.test(p.word),day+' has an invalid Little Word');
    check(WORD_LEXICON.has(p.word),day+' answer is not an accepted guess');
    check(Boolean(wordHint(p.word)),day+' answer lacks an individual hint');
   }else{
    check(p.grid.length===p.size*p.size,day+' has invalid grid dimensions');
    check(p.entries.length===(type==='search'?10:p.catalogVersion===7?6:p.hard?20:10),day+' has an incomplete '+type);
    for(const e of p.entries){
     check(/^[A-Z]{3,}$/.test(e.word),day+' has an invalid entry');
     const cells=[...e.word].map((_,i)=>e.start+i*e.step);
     check(cells.every(i=>i>=0&&i<p.grid.length),day+' has an out-of-grid answer');
     check(cells.map(i=>p.grid[i]).join('')===e.word,day+' has misplaced letters');
     const steps=new Map([-1,0,1].flatMap(dr=>[-1,0,1].filter(dc=>dr||dc).map(dc=>[dr*p.size+dc,[dr,dc]])));
     const [dr,dc]=steps.get(e.step)||[];
     check(Number.isInteger(dr),day+' has an invalid answer direction');
     check(cells.every((pos,i)=>Math.floor(pos/p.size)===Math.floor(e.start/p.size)+i*dr&&pos%p.size===e.start%p.size+i*dc),day+' answer wraps around an edge');
     if(modern){check(typeof e.clue==='string'&&e.clue.length>=12,day+' has a missing or empty clue');check(!new RegExp('\\b'+e.word+'\\b','i').test(e.clue),day+' clue reveals '+e.word);}
    }
    if(modern&&type==='crossword'){
     const cells=p.entries.map(e=>[...e.word].map((_,i)=>e.start+i*e.step));
     check(p.entries.every(e=>e.step===1||e.step===p.size),day+' crossword has a diagonal answer');
     const covered=new Set(cells.flat());
     check([...p.grid].every((letter,i)=>letter==='#'||covered.has(i)),day+' has an unclued square');
     const visited=new Set([0]);
     for(let n=0;n<p.entries.length;n++)for(let i=0;i<cells.length;i++)if([...visited].some(j=>cells[j].some(c=>cells[i].includes(c))))visited.add(i);
     check(visited.size===p.entries.length,day+' has a disconnected crossword');
     for(let start=0;start<p.grid.length;start++)for(const step of [1,p.size]){
      if(p.grid[start]==='#')continue;
      if(step===1?start%p.size>0&&p.grid[start-1]!=='#':start>=p.size&&p.grid[start-p.size]!=='#')continue;
      const run=[];for(let i=start;i<p.grid.length&&p.grid[i]!=='#'&&(step!==1||Math.floor(i/p.size)===Math.floor(start/p.size));i+=step)run.push(i);
      if(run.length>1)check(p.entries.filter(e=>e.start===start&&e.step===step&&e.word.length===run.length).length===1,day+' has an accidental unclued run');
     }
    }
    if(modern){const signature=type+':'+p.grid+':'+p.entries.map(e=>e.word).join(',');check(!signatures.has(signature),day+' repeats a whole board');signatures.add(signature);}
   }
   for(const word of roundWords(p)){
    const last=seen.get(word),gap=last?(Date.parse(day)-Date.parse(last))/86400000:Infinity;
    if(modern){
     check(gap>=REPEAT_GAP_DAYS,day+' repeats '+word+' from '+last);
     check(!INITIAL_ROUND_HISTORY.some(h=>h.day<=day&&(Date.parse(day)-Date.parse(h.day))/86400000<REPEAT_GAP_DAYS&&h.words.includes(word)),day+' repeats a published or retired answer '+word);
    }
    seen.set(word,day);
   }
  }
 }
 const clues=new Map();
 for(const e of WORD_BOOK){
  check(!(e.word.length>=4?e.clue.toUpperCase().includes(e.word):new RegExp('\\b'+e.word+'\\b','i').test(e.clue)),'word bank clue reveals '+e.word);
  const key=e.word.length+':'+e.clue.toLowerCase().replace(/[^a-z ]/g,'');
  check(!clues.has(key)||clues.get(key)===e.word,'identical same-length clues for '+e.word+' and '+clues.get(key));
  clues.set(key,e.word);
 }
 return {days:Object.keys(calendar.rounds).length,reviewedWords:WORD_BOOK.length};
}
