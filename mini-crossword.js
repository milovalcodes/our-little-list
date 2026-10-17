// The daily 5x5 mini: rows 1, 3, 5 across and columns 1, 3, 5 down, all
// five-letter answers, crossing at nine squares. The reviewed clue bank has
// plenty of clued five-letter words but very few short ones, so this lattice
// is the densest grid it can fill every day.
export const MINI_SIZE=5,MINI_ENTRIES=6;
const SLOTS=[['A',0],['D',0],['A',2],['D',2],['A',4],['D',4]];
// Square where across row r meets down column c.
const meet=(r,c)=>r*MINI_SIZE+c;
export function miniLattice(bank,rng,budget=60000){
 const pool=[...new Map(bank.filter(e=>/^[A-Z]{5}$/.test(e.word)).map(e=>[e.word,e])).values()];
 const order=pool.map(e=>({e,n:rng()})).sort((a,b)=>a.n-b.n).map(v=>v.e);
 // index[position][letter] → candidates, so each slot only scans compatible words.
 const index=Array.from({length:5},()=>new Map());
 for(const e of order)for(let i=0;i<5;i++){const m=index[i];if(!m.has(e.word[i]))m.set(e.word[i],[]);m.get(e.word[i]).push(e);}
 const placed=[],used=new Set();let steps=0;
 function candidates(kind,line){
  // Constraints from already placed crossing words.
  let best=null;
  for(const [k,l,e] of placed){
   if(k===kind)continue;
   const pos=l,letter=e.word[line];
   const list=index[pos].get(letter)||[];
   if(!best||list.length<best.length)best=list;
  }
  const options=best||order;
  return options.filter(e=>!used.has(e.word)&&placed.every(([k,l,p])=>k===kind||e.word[l]===p.word[line]));
 }
 function fill(n){
  if(n===SLOTS.length)return true;
  const [kind,line]=SLOTS[n];
  for(const e of candidates(kind,line)){
   if(++steps>budget)return false;
   placed.push([kind,line,e]);used.add(e.word);
   if(fill(n+1))return true;
   placed.pop();used.delete(e.word);
  }
  return false;
 }
 if(!fill(0))return null;
 const grid=Array(MINI_SIZE*MINI_SIZE).fill('#');
 const entries=placed.map(([kind,line,e])=>{
  const start=kind==='A'?meet(line,0):meet(0,line),step=kind==='A'?1:MINI_SIZE;
  [...e.word].forEach((letter,i)=>{grid[start+i*step]=letter;});
  return {...e,start,step};
 }).sort((a,b)=>a.start-b.start||a.step-b.step);
 return {size:MINI_SIZE,grid:grid.join(''),entries};
}
