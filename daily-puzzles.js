import {CATALOG_VERSION,PUZZLE_THEMES,catalogPool} from './puzzle-catalog.js';
import {activityWindow} from './activity-clock.js';
import {puzzleSeason} from './seasonal-puzzles.js';
export const PUZZLE_TYPES=['search','crossword'];
export const PUZZLE_NAMES={search:'Word Search',crossword:'Mini crossword'};
export const PUZZLE_LIMIT_MS=120000;
export const LEAGUE_START_DAY='2026-10-09';
export function isHardDay(day){return day.includes('-tie-')||new Date(day+'T12:00:00Z').getUTCDay()===0;}
function random(seed){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function shuffled(items,rng){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function searchGrid(bank,size,rng,hard){
 const cells=Array(size*size).fill(''),entries=[];
 const dirs=hard?[[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]]:[[0,1],[1,0],[1,1]];
 for(const entry of shuffled(bank.filter(e=>e.word.length>=4&&e.word.length<=size-2),rng)){
  if(entries.some(e=>e.word.includes(entry.word)||entry.word.includes(e.word)))continue;
  for(let trial=0;trial<250;trial++){
   const r=Math.floor(rng()*size),c=Math.floor(rng()*size),[dr,dc]=dirs[Math.floor(rng()*dirs.length)];
   const endR=r+dr*(entry.word.length-1),endC=c+dc*(entry.word.length-1);
   if(endR<0||endR>=size||endC<0||endC>=size)continue;
   const indices=[...entry.word].map((_,i)=>(r+dr*i)*size+c+dc*i);
   if(indices.some((p,i)=>cells[p]&&cells[p]!==entry.word[i]))continue;
   indices.forEach((p,i)=>cells[p]=entry.word[i]);entries.push({...entry,start:r*size+c,step:dr*size+dc});break;
  }
  if(entries.length===10)break;
 }
 if(entries.length!==10)throw Error('Could not make a full word search');
 return {size,grid:cells.map(c=>c||String.fromCharCode(65+Math.floor(rng()*26))).join(''),entries};
}
function crosswordGrid(bank,size,rng,target){
 let best=null;
 for(let attempt=0;attempt<24;attempt++){
  const grid=Array(size*size).fill('#'),used=Array(size*size).fill(0),entries=[];
  const candidates=shuffled(bank.filter(e=>e.word.length>=3&&e.word.length<=size-2),rng);
  const first=candidates.shift(),r=Math.floor(size/2),c=Math.floor((size-first.word.length)/2);
  [...first.word].forEach((letter,i)=>{grid[r*size+c+i]=letter;used[r*size+c+i]=1;});
  entries.push({...first,start:r*size+c,step:1});
  for(const entry of candidates){
   const options=[];
   for(let p=0;p<grid.length;p++)if(grid[p]!=='#')for(let i=0;i<entry.word.length;i++)if(grid[p]===entry.word[i]){
    if(!(used[p]&1))options.push([Math.floor(p/size),p%size-i,0,1]);
    if(!(used[p]&2))options.push([Math.floor(p/size)-i,p%size,1,0]);
   }
   for(const [row,col,dr,dc] of shuffled(options,rng)){
    const er=row+dr*(entry.word.length-1),ec=col+dc*(entry.word.length-1);
    if(row<0||col<0||er>=size||ec>=size)continue;
    const at=(rr,cc)=>rr>=0&&rr<size&&cc>=0&&cc<size?grid[rr*size+cc]:'#';
    if(at(row-dr,col-dc)!=='#'||at(er+dr,ec+dc)!=='#')continue;
    const positions=[...entry.word].map((_,i)=>(row+dr*i)*size+col+dc*i);
    if(positions.some((pos,i)=>grid[pos]!=='#'?(grid[pos]!==entry.word[i]||Boolean(used[pos]&(dr?2:1))):(dr?(at(Math.floor(pos/size),pos%size-1)!=='#'||at(Math.floor(pos/size),pos%size+1)!=='#'):(at(Math.floor(pos/size)-1,pos%size)!=='#'||at(Math.floor(pos/size)+1,pos%size)!=='#'))))continue;
    positions.forEach((pos,i)=>{grid[pos]=entry.word[i];used[pos]|=dr?2:1;});
    entries.push({...entry,start:row*size+col,step:dr?size:1});break;
   }
   if(entries.length===target)break;
  }
  if(!best||entries.length>best.entries.length)best={size,grid:grid.join(''),entries};
  if(entries.length===target)return best;
 }
 if(best.entries.length<4)throw Error('Could not make a connected crossword');
 return best;
}
export function timedPuzzle(day,type,now=Date.now()){
 if(!PUZZLE_TYPES.includes(type))throw Error('Unknown puzzle');
 const hard=isHardDay(day),difficulty=hard?'hard':'normal',rng=random(day+':'+type+':v1');
 const season=puzzleSeason(day,now);
 const themes=PUZZLE_THEMES.filter(t=>t.difficulty===difficulty&&t.season===season),theme=themes[Math.floor(rng()*themes.length)];
 const bank=catalogPool(difficulty,theme.id).map(({word,clue,id})=>({word,clue,id}));
 const layout=type==='search'?searchGrid(bank,hard?12:10,rng,hard):crosswordGrid(bank,hard?11:9,rng,hard?8:6);
 const window=day.includes('-tie-')?{opensAt:now,closesAt:4102444800000}:activityWindow(day);
 return {day,type,hard,difficulty,theme:theme.label,themeId:theme.id,catalogVersion:CATALOG_VERSION,...layout,...window};
}
export function entryCells(puzzle,index){const e=puzzle.entries[index];return e?[...e.word].map((_,i)=>e.start+i*e.step):[];}
export function selectedSearchWord(puzzle,start,end){
 const r1=Math.floor(start/puzzle.size),c1=start%puzzle.size,r2=Math.floor(end/puzzle.size),c2=end%puzzle.size;
 const dr=r2-r1,dc=c2-c1;
 if((dr&&dc&&Math.abs(dr)!==Math.abs(dc))||start===end)return null;
 const count=Math.max(Math.abs(dr),Math.abs(dc))+1,step=Math.sign(dr)*puzzle.size+Math.sign(dc),cells=Array.from({length:count},(_,i)=>start+i*step);
 const word=cells.map(i=>puzzle.grid[i]).join('');
 const index=puzzle.entries.findIndex(e=>e.word===word||e.word===[...word].reverse().join(''));
 return index<0?null:{index,cells};
}
