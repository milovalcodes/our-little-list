// Letter-by-letter mini crossword entry. Pure helpers: the cursor is
// {cell, across}; letters is an array the length of the grid ('' = empty).
// Correct entries lock their squares, including shared crossing letters.
import {entryCells} from './daily-puzzles.js';
export const isAcross=entry=>entry.step===1;
export function entryAt(puzzle,cell,across){return puzzle.entries.findIndex((e,i)=>isAcross(e)===across&&entryCells(puzzle,i).includes(cell));}
// Across clues first, then down, each in grid order.
export function clueOrder(puzzle){return puzzle.entries.map((_,i)=>i).sort((a,b)=>Number(isAcross(puzzle.entries[b]))-Number(isAcross(puzzle.entries[a]))||puzzle.entries[a].start-puzzle.entries[b].start);}
export function clueNumbers(puzzle){return new Map([...new Set(puzzle.entries.map(e=>e.start))].sort((a,b)=>a-b).map((p,i)=>[p,i+1]));}
export function emptyLetters(puzzle){return Array(puzzle.grid.length).fill('');}
export function cleanLetters(puzzle,raw){return Array.isArray(raw)&&raw.length===puzzle.grid.length?raw.map((c,i)=>puzzle.grid[i]!=='#'&&typeof c==='string'&&/^[A-Z]$/.test(c)?c:''):emptyLetters(puzzle);}
export function firstCursor(puzzle){const i=clueOrder(puzzle)[0];return {cell:puzzle.entries[i].start,across:isAcross(puzzle.entries[i])};}
export function activeEntry(puzzle,cursor){const i=entryAt(puzzle,cursor.cell,cursor.across);return i>=0?i:entryAt(puzzle,cursor.cell,!cursor.across);}
export function focusEntry(puzzle,letters,index){
 const cells=entryCells(puzzle,index);
 return {cell:cells.find(c=>!letters[c])??cells[0],across:isAcross(puzzle.entries[index])};
}
// Tapping the cursor cell again flips direction; a new cell keeps the current
// direction when it has a word that way.
export function selectCell(puzzle,cursor,cell){
 if(puzzle.grid[cell]==='#'||cell<0||cell>=puzzle.grid.length)return cursor;
 if(cell===cursor.cell)return entryAt(puzzle,cell,!cursor.across)>=0?{cell,across:!cursor.across}:cursor;
 return {cell,across:entryAt(puzzle,cell,cursor.across)>=0?cursor.across:!cursor.across};
}
export function selectClue(puzzle,letters,index){return focusEntry(puzzle,letters,index);}
export function toggleDirection(puzzle,cursor){return entryAt(puzzle,cursor.cell,!cursor.across)>=0?{...cursor,across:!cursor.across}:cursor;}
// Explicit clue navigation (Tab / arrows on the clue bar) visits every clue;
// automatic advance skips clues that are already full.
export function nextClue(puzzle,letters,cursor,delta=1,skipFull=false){
 const order=clueOrder(puzzle),at=order.indexOf(activeEntry(puzzle,cursor));
 for(let k=1;k<=order.length;k++){
  const i=order[((at+delta*k)%order.length+order.length)%order.length];
  if(!skipFull||entryCells(puzzle,i).some(c=>!letters[c]))return focusEntry(puzzle,letters,i);
 }
 return cursor;
}
export function typeLetter(puzzle,letters,cursor,letter){
 const next=[...letters],index=activeEntry(puzzle,cursor),locked=lockedCells(puzzle,letters);
 if(index<0||!/^[A-Z]$/.test(letter)||locked.has(cursor.cell))return {letters,cursor};
 next[cursor.cell]=letter;
 const cells=entryCells(puzzle,index),pos=cells.indexOf(cursor.cell),across=isAcross(puzzle.entries[index]);
 // Leave confirmed crossing letters in place while entering the missing ones.
 const following=cells.slice(pos+1).find(c=>!locked.has(c));
 if(following!==undefined)return {letters:next,cursor:{cell:following,across}};
 const gap=cells.find(c=>!next[c]);
 if(gap!==undefined)return {letters:next,cursor:{cell:gap,across}};
 const moved=nextClue(puzzle,next,{cell:cursor.cell,across},1,true);
 // A completely full grid keeps the cursor where it is.
 return {letters:next,cursor:moved.cell===cursor.cell&&moved.across===across?{cell:cursor.cell,across}:moved};
}
export function eraseLetter(puzzle,letters,cursor){
 const next=[...letters],index=activeEntry(puzzle,cursor),locked=lockedCells(puzzle,letters);
 if(index<0)return {letters,cursor};
 if(next[cursor.cell]&&!locked.has(cursor.cell)){next[cursor.cell]='';return {letters:next,cursor};}
 const cells=entryCells(puzzle,index),pos=cells.indexOf(cursor.cell);
 const previous=cells.slice(0,pos).findLast(c=>!locked.has(c));
 if(previous===undefined)return {letters,cursor};
 next[previous]='';
 return {letters:next,cursor:{cell:previous,across:isAcross(puzzle.entries[index])}};
}
// Arrow keys: the first press across a word's direction turns the cursor;
// further presses move to the next open square in that row or column.
export function moveCursor(puzzle,cursor,key){
 const size=puzzle.size,horizontal=key==='ArrowLeft'||key==='ArrowRight',sign=key==='ArrowRight'||key==='ArrowDown'?1:-1;
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key))return cursor;
 if(horizontal!==cursor.across&&entryAt(puzzle,cursor.cell,horizontal)>=0)return {...cursor,across:horizontal};
 let r=Math.floor(cursor.cell/size),c=cursor.cell%size;
 for(;;){
  if(horizontal)c+=sign;else r+=sign;
  if(r<0||c<0||r>=size||c>=size)return cursor;
  const cell=r*size+c;
  if(puzzle.grid[cell]!=='#')return {cell,across:entryAt(puzzle,cell,cursor.across)>=0?cursor.across:!cursor.across};
 }
}
export function correctEntries(puzzle,letters){return puzzle.entries.flatMap((e,i)=>entryCells(puzzle,i).every(c=>letters[c]===puzzle.grid[c])?[i]:[]);}
export function lockedCells(puzzle,letters){return new Set(correctEntries(puzzle,letters).flatMap(i=>entryCells(puzzle,i)));}
export function filledCount(puzzle,letters){return [...puzzle.grid].filter((c,i)=>c!=='#'&&letters[i]).length;}
