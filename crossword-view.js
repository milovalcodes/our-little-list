import {entryCells} from './daily-puzzles.js';
import {escapeHtml as esc} from './ui-helpers.js';

// Larger targets for the current word keep a large board usable on a phone.
// These buttons select the same squares, and never reveal correctness.
export function crosswordFocus(puzzle,index,letters,cursor,attribute){
 const e=puzzle.entries[index];
 return `<div class="crossword-focus" role="group" aria-label="Current answer, ${e.word.length} letters">${entryCells(puzzle,index).map((cell,i)=>`<button type="button" ${attribute}="${cell}" tabindex="${cursor.cell===cell?0:-1}" class="${cursor.cell===cell?'current':''}" aria-label="Letter ${i+1}, ${letters[cell]||'empty'}">${esc(letters[cell]||'·')}</button>`).join('')}</div>`;
}
export function revealFocusedLetter(host){
 const strip=host.querySelector('.crossword-focus'),button=strip?.querySelector('.current');
 if(!button)return;
 const left=button.offsetLeft-strip.offsetLeft;
 strip.scrollLeft=Math.max(0,left-(strip.clientWidth-button.offsetWidth)/2);
}
// Boards are saved on a square canvas. Trim all-wall edges to the smallest
// square that holds every white square, so the board view (square, zoomable)
// gets bigger cells. Indices stay the saved grid's.
export function crosswordWindow(puzzle){
 const size=puzzle.size,rows=[],cols=[];
 [...puzzle.grid].forEach((c,i)=>{if(c!=='#'){rows.push(Math.floor(i/size));cols.push(i%size);}});
 if(!rows.length)return {cells:[...puzzle.grid].map((_,i)=>i),columns:size};
 let top=Math.min(...rows),left=Math.min(...cols);
 const side=Math.max(Math.max(...rows)-top,Math.max(...cols)-left)+1,cells=[];
 top=Math.min(top,size-side);left=Math.min(left,size-side);
 for(let r=top;r<top+side;r++)for(let c=left;c<left+side;c++)cells.push(r*size+c);
 return {cells,columns:side};
}
export function themeCaption(puzzle){return puzzle.themeDescription?`<p class="crossword-theme-detail">${esc(puzzle.themeDescription)} The marked theme clue is the longer answer that brings it together.</p>`:'';}
// Preserve a scrolled long clue while typing; a different clue starts at its top.
export function rememberClueScroll(host){
 const current=()=>{const e=host.querySelector('.crossword-clues [aria-pressed="true"]');return e?.dataset.clue??e?.dataset.entry;};
 const entry=current(),top=host.querySelector('.crossword-current [data-flip]')?.scrollTop||0;
 return ()=>{const clue=host.querySelector('.crossword-current [data-flip]');if(clue&&entry!=null&&entry===current())clue.scrollTop=top;};
}
