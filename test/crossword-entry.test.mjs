import assert from 'node:assert/strict';
import {entryAt,clueOrder,clueNumbers,emptyLetters,cleanLetters,firstCursor,activeEntry,selectCell,selectClue,toggleDirection,nextClue,typeLetter,eraseLetter,moveCursor,correctEntries,lockedCells,filledCount} from '../crossword-entry.js';
// A 5x5 lattice: rows 0/2/4 across, columns 0/2/4 down.
const grid='CRANE'+'A#P#X'+'BLAST'+'L#R#R'+'EERIE';
const word=(start,step)=>[0,1,2,3,4].map(i=>grid[start+i*step]).join('');
const entries=[[0,1],[10,1],[20,1],[0,5],[2,5],[4,5]].map(([start,step],i)=>({start,step,word:word(start,step),clue:'clue '+i}));
const puzzle={size:5,grid,entries};
assert.deepEqual(entries.map(e=>e.word),['CRANE','BLAST','EERIE','CABLE','APARR','EXTRE']);
assert.deepEqual(clueOrder(puzzle),[0,1,2,3,4,5],'across clues before down, in grid order');
assert.deepEqual([...clueNumbers(puzzle)],[[0,1],[2,2],[4,3],[10,4],[20,5]]);
assert.equal(entryAt(puzzle,12,true),1);assert.equal(entryAt(puzzle,12,false),4);assert.equal(entryAt(puzzle,1,false),-1);
let letters=emptyLetters(puzzle),cursor=firstCursor(puzzle);
assert.deepEqual(cursor,{cell:0,across:true});
// Typing auto-advances along the word and then jumps to the next unfinished clue.
for(const ch of 'CRANE')({letters,cursor}=typeLetter(puzzle,letters,cursor,ch));
assert.equal(letters.slice(0,5).join(''),'CRANE');
assert.deepEqual(cursor,{cell:10,across:true},'a finished word moves to the next clue');
({letters,cursor}=typeLetter(puzzle,letters,cursor,'b'));assert.equal(letters[10],'','only capital letters are accepted');
({letters,cursor}=typeLetter(puzzle,letters,cursor,'B'));assert.deepEqual(cursor,{cell:11,across:true});
// Crossing letters are shared: CABLE down already has C from CRANE and B from BLAST.
cursor=selectClue(puzzle,letters,3);assert.deepEqual(cursor,{cell:5,across:false},'a clue opens at its first empty square');
({letters,cursor}=typeLetter(puzzle,letters,cursor,'A'));assert.deepEqual(cursor,{cell:10,across:false},'the cursor steps onto crossing letters too');
// Erase clears the square, then steps back.
({letters,cursor}=eraseLetter(puzzle,letters,cursor));assert.equal(cursor.cell,10,'a filled square is cleared in place');assert.equal(letters[10],'');
({letters,cursor}=eraseLetter(puzzle,letters,cursor));assert.equal(cursor.cell,5,'an empty square steps back and clears');assert.equal(letters[5],'');
({letters,cursor}=eraseLetter(puzzle,letters,{cell:0,across:true}));assert.equal(letters[0],'C','a correct word cannot be erased');assert.deepEqual([...lockedCells(puzzle,letters)],[0,1,2,3,4]);assert.equal(typeLetter(puzzle,letters,{cell:0,across:true},'Z').letters[0],'C');
({letters}=typeLetter(puzzle,letters,{cell:0,across:true},'C'));
// Tapping the same square flips direction only where a crossing word exists.
assert.deepEqual(selectCell(puzzle,{cell:0,across:true},0),{cell:0,across:false});
assert.deepEqual(selectCell(puzzle,{cell:1,across:true},1),{cell:1,across:true});
assert.deepEqual(selectCell(puzzle,{cell:0,across:false},1),{cell:1,across:true},'a square with no down word switches to across');
assert.deepEqual(selectCell(puzzle,{cell:0,across:true},6),{cell:0,across:true},'blocks cannot be selected');
assert.deepEqual(toggleDirection(puzzle,{cell:3,across:true}),{cell:3,across:true});
// Arrow keys turn first, then move to the next open square.
assert.deepEqual(moveCursor(puzzle,{cell:0,across:true},'ArrowDown'),{cell:0,across:false});
assert.deepEqual(moveCursor(puzzle,{cell:0,across:false},'ArrowDown'),{cell:5,across:false});
assert.deepEqual(moveCursor(puzzle,{cell:2,across:false},'ArrowDown'),{cell:7,across:false});
assert.deepEqual(moveCursor(puzzle,{cell:4,across:true},'ArrowRight'),{cell:4,across:true},'edges stop the cursor');
assert.deepEqual(moveCursor(puzzle,{cell:5,across:false},'ArrowRight'),{cell:7,across:false},'no across word to turn into, so it hops the block');
assert.deepEqual(moveCursor(puzzle,{cell:10,across:true},'ArrowRight'),{cell:11,across:true});
// Tab-style navigation visits every clue and wraps.
assert.equal(activeEntry(puzzle,nextClue(puzzle,letters,{cell:4,across:false},1)),0);
assert.equal(activeEntry(puzzle,nextClue(puzzle,letters,{cell:0,across:true},-1)),5);
// Retyping over a filled word steps square by square.
{
 let l=emptyLetters(puzzle),c={cell:10,across:true};
 for(const ch of 'BZ')({letters:l,cursor:c}=typeLetter(puzzle,l,c,ch));
 c={cell:10,across:true};
 for(const ch of 'BLAST')({letters:l,cursor:c}=typeLetter(puzzle,l,c,ch));
 assert.equal(l.slice(10,15).join(''),'BLAST');
}
{
 const l=emptyLetters(puzzle);[...'CRZNE'].forEach((ch,i)=>l[i]=ch);
 const next=typeLetter(puzzle,l,{cell:2,across:true},'A');
 assert.deepEqual(next.cursor,{cell:10,across:true},'correcting a full word advances beyond its new locks');
}
// Credit is only for exactly-matching words; a full grid keeps the cursor still.
assert.deepEqual(correctEntries(puzzle,letters),[0]);
const full=[...grid].map(c=>c==='#'?'':c);
assert.deepEqual(correctEntries(puzzle,full),[0,1,2,3,4,5]);assert.equal(filledCount(puzzle,full),21);
const wrong=[...full];wrong[12]='X';assert.deepEqual(correctEntries(puzzle,wrong),[0,2,3,5],'one wrong crossing square costs both words');
const last=[...full];last[24]='';assert.deepEqual(typeLetter(puzzle,last,{cell:24,across:true},'E').cursor,{cell:24,across:true});
// Saved letters are sanitised against the board.
assert.deepEqual(cleanLetters(puzzle,['A','b','#',...Array(22).fill('Z')]).slice(0,4),['A','','','Z']);
assert.equal(cleanLetters(puzzle,['A']).length,25);assert.equal(cleanLetters(puzzle,null).join(''),'');
assert.equal(cleanLetters(puzzle,Array(25).fill('Q'))[6],'','blocks never hold letters');
// Entering a crossing skips locked squares; backspace steps over them too.
{
 let l=emptyLetters(puzzle),c={cell:10,across:true};
 for(const ch of 'BLAST')({letters:l,cursor:c}=typeLetter(puzzle,l,c,ch));
 c=selectClue(puzzle,l,3);
 for(const ch of 'CA')({letters:l,cursor:c}=typeLetter(puzzle,l,c,ch));
 assert.equal(c.cell,15,'typing skips the locked B in CABLE');
 ({letters:l,cursor:c}=eraseLetter(puzzle,l,c));
 assert.equal(c.cell,5);assert.equal(l[10],'B','backspace skips the locked crossing');
 for(const ch of 'ALE')({letters:l,cursor:c}=typeLetter(puzzle,l,c,ch));
 assert.deepEqual(correctEntries(puzzle,l),[1,3]);
}
// A full but wrong word is still unfinished, even if its first letter is locked.
{
 const l=[...grid].map(c=>c==='#'?'':c);l[5]='Z';
 assert.deepEqual(selectClue(puzzle,l,3),{cell:5,across:false},'revisiting a wrong full answer selects an editable letter');
 assert.deepEqual(nextClue(puzzle,l,{cell:20,across:true},1,true),{cell:5,across:false},'automatic advance includes filled incorrect answers');
 assert.deepEqual(firstCursor(puzzle,l),{cell:5,across:false},'resume starts on unfinished work');
 const next=typeLetter(puzzle,l,{cell:0,across:false},'A');
 assert.equal(next.letters[5],'A','typing from a locked crossing reaches the editable part of this word');
 assert.equal(next.letters[0],'C','the locked crossing stays intact');
 assert.equal(correctEntries(puzzle,next.letters).length,6);
}
assert.deepEqual(selectCell(puzzle,{cell:0,across:true},0,{toggle:false}),{cell:0,across:true},'answer-strip taps never change the selected word');
console.log('CROSSWORD ENTRY: auto-advance, shared crossings, direction toggle, arrows, clue order, erase, exact-word credit and saved-letter cleanup pass');
