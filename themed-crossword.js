import {CROSSWORD_THEMES,themeEntry} from './crossword-themes.js';
import {WORD_BOOK,reviewedEntry} from './word-book.js';
import {connectedCrossword} from './connected-crossword.js';
import {cluePool,variedCluePool} from './round-library.js';

const book=new Map(WORD_BOOK.map(e=>[e.word,e]));
const shuffle=(items,rng)=>items.map(e=>({e,n:rng()})).sort((a,b)=>a.n-b.n).map(v=>v.e);
export const THEMED_CROSSWORD_START='2026-10-19';
export const isThemedDay=day=>!day.includes('-tie-')&&day>=THEMED_CROSSWORD_START;
export const themedEntryCount=hard=>hard?20:10;

// A blocked, interlocking crossword with a semantic anchor. Unlike an American
// newspaper grid, this short timed format permits unchecked letters. Every
// answer crosses another; loops, compactness and multiple anchor crossings are
// preferred over a long tree of single-letter branches. No accidental strings.
export function themedCrossword({hard=false,season='',excluded=new Set(),rng,rolling=false}) {
 const target=themedEntryCount(hard),size=hard?19:15;
 const fresh=e=>!excluded.has(e.word);
 const bank=rolling?variedCluePool(hard,season):cluePool(hard,season);
 const filler=shuffle(bank.filter(fresh).map(reviewedEntry),rng);
 const seasonal=shuffle(CROSSWORD_THEMES.filter(t=>t.season===season),rng),everyday=season?shuffle(CROSSWORD_THEMES.filter(t=>!t.season),rng):[];
 const themes=rolling&&season&&rng()>=0.45?[...everyday,...seasonal]:[...seasonal,...everyday];
 for(const theme of themes){
  const anchors=shuffle(theme.anchors.filter(w=>w.length>=7&&!excluded.has(w)),rng);
  const related=[...theme.words].map(w=>book.get(w)).filter(Boolean).filter(fresh);
  for(const word of anchors){
   const anchor=book.get(word);if(!anchor)throw Error('Missing theme anchor '+word);
   const pool=[...new Map([...related,...filler.slice(0,55)].filter(e=>e.word.length<=anchor.word.length).map(e=>[e.word,{...themeEntry(theme,e),themed:theme.words.has(e.word)}])).values()];
   const layout=construct(pool,{...themeEntry(theme,anchor),themed:true},size,target,rng);
   if(!layout)continue;
   return {...layout,theme:theme.title,themeDescription:theme.description,themeId:'crossword-v8-'+theme.id,anchor:word,catalogVersion:8};
  }
 }
 if(rolling){
  const layout=connectedCrossword(filler.slice(0,160),hard?21:15,rng,target);
  if(layout.entries.length!==target)throw Error('Not enough fresh crossword answers. Saved boards have not changed.');
  return {...layout,theme:'A little of everything',themeDescription:'Clues from several familiar subjects.',themeId:'crossword-v9-mixed',catalogVersion:9};
 }
 throw Error('Could not build a fresh themed crossword. Saved boards have not changed.');
}

function construct(bank,anchor,size,target,rng){
 let best=null,bestScore=-Infinity;
 for(let attempt=0;attempt<16;attempt++){
  const grid=Array(size*size).fill('#'),used=Array(size*size).fill(0),entries=[];
  const at=(r,c)=>r>=0&&c>=0&&r<size&&c<size?grid[r*size+c]:'#';
  function place(e,r,c,dr,dc){
   [...e.word].forEach((letter,i)=>{const p=(r+dr*i)*size+c+dc*i;grid[p]=letter;used[p]|=dr?2:1;});
   entries.push({...e,start:r*size+c,step:dr?size:1});
  }
  const down=attempt%2,mid=Math.floor(size/2),offset=Math.floor((size-anchor.word.length)/2);
  place(anchor,down?offset:mid,down?mid:offset,down,1-down);
  const pool=shuffle(bank.filter(e=>e.word!==anchor.word&&e.word.length>=3&&e.word.length<=size-2),rng);
  while(entries.length<target){
   let pick=null,high=-Infinity;
   const themed=entries.filter(e=>e.themed).length;
   for(let n=0;n<pool.length;n++){
    const e=pool[n],options=new Set();
    for(let p=0;p<grid.length;p++)if(grid[p]!=='#')for(let i=0;i<e.word.length;i++)if(grid[p]===e.word[i]){
     if(!(used[p]&1))options.add([Math.floor(p/size),p%size-i,0,1].join(','));
     if(!(used[p]&2))options.add([Math.floor(p/size)-i,p%size,1,0].join(','));
    }
    for(const option of options){
     const [r,c,dr,dc]=option.split(',').map(Number),er=r+dr*(e.word.length-1),ec=c+dc*(e.word.length-1);
     if(r<0||c<0||er>=size||ec>=size||at(r-dr,c-dc)!=='#'||at(er+dr,ec+dc)!=='#')continue;
     let crosses=0,valid=true,anchorCross=false;
     for(let i=0;i<e.word.length;i++){
      const rr=r+dr*i,cc=c+dc*i,p=rr*size+cc;
      if(grid[p]!=='#'){
       if(grid[p]!==e.word[i]||(used[p]&(dr?2:1))){valid=false;break;}
       crosses++;
       if([...anchor.word].some((_,j)=>entries[0].start+j*entries[0].step===p))anchorCross=true;
      }else if(dr?(at(rr,cc-1)!=='#'||at(rr,cc+1)!=='#'):(at(rr-1,cc)!=='#'||at(rr+1,cc)!=='#')){valid=false;break;}
     }
     if(!valid||!crosses)continue;
     const center=Math.abs((r+er)/2-mid)+Math.abs((c+ec)/2-mid);
     const score=crosses*90+(e.themed?(themed<4?100:30):0)+(anchorCross?12:0)-center*5+Math.min(e.word.length,7)*2+rng()*30;
     if(score>high){high=score;pick={n,e,r,c,dr,dc};}
    }
   }
   if(!pick)break;
   place(pick.e,pick.r,pick.c,pick.dr,pick.dc);pool.splice(pick.n,1);
  }
  if(entries.length!==target)continue;
  const crossings=used.filter(v=>v===3).length,anchorChecks=[...anchor.word].filter((_,i)=>used[entries[0].start+i*entries[0].step]===3).length;
  if(entries.filter(e=>e.themed).length<4||anchorChecks<3||crossings<target)continue;
  const trimmed=trim({size,grid:grid.join(''),entries});
  const leaves=entries.filter(e=>[...e.word].filter((_,i)=>used[e.start+i*e.step]===3).length===1).length;
  const score=crossings*20+anchorChecks*10-leaves*12-trimmed.size*5;
  if(score>bestScore){best=trimmed;bestScore=score;}
  if(crossings>=target+3&&leaves<=target/3)break;
 }
 return best;
}
function trim(layout){
 const cells=[...layout.grid].flatMap((c,i)=>c==='#'?[]:[i]);
 const top=Math.min(...cells.map(p=>Math.floor(p/layout.size))),left=Math.min(...cells.map(p=>p%layout.size));
 const height=Math.max(...cells.map(p=>Math.floor(p/layout.size)))-top+1,width=Math.max(...cells.map(p=>p%layout.size))-left+1;
 const extent=Math.max(9,height,width),size=extent%2?extent:extent+1;
 const dy=Math.floor((size-height)/2),dx=Math.floor((size-width)/2),grid=Array(size*size).fill('#');
 const translate=p=>(Math.floor(p/layout.size)-top+dy)*size+p%layout.size-left+dx;
 cells.forEach(p=>grid[translate(p)]=layout.grid[p]);
 const entries=layout.entries.map(e=>({...e,start:translate(e.start),step:e.step===1?1:size})).sort((a,b)=>a.start-b.start||a.step-b.step);
 return {size,grid:grid.join(''),entries};
}
