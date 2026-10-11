// A denser connected layout. Separate from the frozen legacy generator so old
// daily rounds and practice saves never acquire a different answer/grid.
export function connectedCrossword(bank,size,rng,target,attempts=32){
 const words=[...new Map(bank.filter(e=>e.word.length>=3&&e.word.length<=size-2).map(e=>[e.word,e])).values()];
 let best=null,bestScore=-Infinity;
 for(let attempt=0;attempt<attempts;attempt++){
  const grid=Array(size*size).fill('#'),used=Array(size*size).fill(0),entries=[];
  const pool=words.map(e=>({e,tie:rng()})).sort((a,b)=>a.tie-b.tie).map(v=>v.e);
  const first=pool.shift(),row=Math.floor(size/2),col=Math.floor((size-first.word.length)/2);
  const place=(e,r,c,dr,dc)=>{[...e.word].forEach((letter,i)=>{const p=(r+dr*i)*size+c+dc*i;grid[p]=letter;used[p]|=dr?2:1;});entries.push({...e,start:r*size+c,step:dr?size:1});};
  place(first,row,col,0,1);
  while(entries.length<target){
   let pick=null,score=-Infinity;
   const at=(r,c)=>r>=0&&r<size&&c>=0&&c<size?grid[r*size+c]:'#';
   for(let n=0;n<pool.length;n++){
    const e=pool[n],options=new Set();
    for(let p=0;p<grid.length;p++)if(grid[p]!=='#')for(let i=0;i<e.word.length;i++)if(grid[p]===e.word[i]){
     if(!(used[p]&1))options.add([Math.floor(p/size),p%size-i,0,1].join(','));
     if(!(used[p]&2))options.add([Math.floor(p/size)-i,p%size,1,0].join(','));
    }
    for(const option of options){
     const [r,c,dr,dc]=option.split(',').map(Number),er=r+dr*(e.word.length-1),ec=c+dc*(e.word.length-1);
     if(r<0||c<0||er>=size||ec>=size||at(r-dr,c-dc)!=='#'||at(er+dr,ec+dc)!=='#')continue;
     let crosses=0,valid=true;
     for(let i=0;i<e.word.length;i++){
      const rr=r+dr*i,cc=c+dc*i,p=rr*size+cc;
      if(grid[p]!=='#'){if(grid[p]!==e.word[i]||(used[p]&(dr?2:1))){valid=false;break;}crosses++;}
      else if(dr?(at(rr,cc-1)!=='#'||at(rr,cc+1)!=='#'):(at(rr-1,cc)!=='#'||at(rr+1,cc)!=='#')){valid=false;break;}
     }
     if(!valid||!crosses)continue;
     // More shared letters first; short, central placements leave room for
     // later crossings instead of making a long chain of isolated branches.
     const value=crosses*100-e.word.length*1.5-(Math.abs((r+er)/2-size/2)+Math.abs((c+ec)/2-size/2))*2+rng()*12;
     if(value>score){score=value;pick={n,e,r,c,dr,dc};}
    }
   }
   if(!pick)break;
   place(pick.e,pick.r,pick.c,pick.dr,pick.dc);pool.splice(pick.n,1);
  }
  const crossings=used.filter(n=>n===3).length;
  const score=entries.length*1000+crossings;
  if(score>bestScore){best={size,grid:grid.join(''),entries};bestScore=score;}
  if(entries.length===target&&crossings>=target+Math.floor(target/4))return trim(best);
 }
 if(best?.entries.length!==target)throw Error('Could not build the full connected crossword');
 return trim(best);
}
function trim(layout){
 const cells=[...layout.grid].flatMap((c,i)=>c==='#'?[]:[i]);
 const rows=cells.map(p=>Math.floor(p/layout.size)),cols=cells.map(p=>p%layout.size);
 const top=Math.min(...rows),left=Math.min(...cols),height=Math.max(...rows)-top+1,width=Math.max(...cols)-left+1;
 const size=Math.max(9,height,width),dy=Math.floor((size-height)/2),dx=Math.floor((size-width)/2),grid=Array(size*size).fill('#');
 const translate=p=>(Math.floor(p/layout.size)-top+dy)*size+p%layout.size-left+dx;
 for(const p of cells)grid[translate(p)]=layout.grid[p];
 const entries=layout.entries.map(e=>({...e,start:translate(e.start),step:e.step===1?1:size})).sort((a,b)=>a.start-b.start||a.step-b.step);
 return {size,grid:grid.join(''),entries};
}
