import assert from 'node:assert/strict';
import compiled from '../worker/src/compiled-crosswords.json' with {type:'json'};
import {THEMED_PRACTICE} from '../themed-practice-bank.js';
import {CROSSWORD_THEMES} from '../crossword-themes.js';
import {WORD_BOOK,wordDetails} from '../word-book.js';
import {cluePool,answerPool} from '../round-library.js';
import {entryCells} from '../daily-puzzles.js';
import {createHash} from 'node:crypto';
assert.equal(createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(compiled.rounds).filter(([day])=>day<'2026-10-19')))).digest('hex'),'1c199f8d1462ff7b12d739e5f78867fd180262f1f28cee1549fa6cd2c43bdd1e','pre-cutover rounds stay frozen');
const themes=new Map(CROSSWORD_THEMES.map(t=>['crossword-v8-'+t.id,t]));
assert.ok(WORD_BOOK.length>=1928);
for(const hard of [false,true])for(const season of ['','october','december'])for(const e of [...cluePool(hard,season),...answerPool(hard,season)]){
 const d=wordDetails(e.word);assert.ok(d.clue.length>=8,e.word);assert.ok(d.theme.length>=5,e.word);
 assert.doesNotMatch(d.theme,/Everyday words|unusual shapes|both|hard/i);
}
for(const t of CROSSWORD_THEMES)for(const w of t.words)assert.ok(WORD_BOOK.some(e=>e.word===w),t.id+': '+w);
const boards=[...Object.values(compiled.rounds).map(r=>r.crossword).filter(p=>p.catalogVersion===8),...Object.values(compiled.themedTies||{}).flat(),...THEMED_PRACTICE];
for(const p of boards){
 assert.ok(p.size>=9&&p.size<=19&&p.size%2===1);
 assert.equal(p.entries.length,p.hard||p.entries.length===20?20:10);
 const theme=themes.get(p.themeId);assert.ok(theme,p.themeId);
 assert.ok(theme.anchors.includes(p.anchor));assert.ok(p.entries.filter(e=>theme.words.has(e.word)).length>=4);
 assert.ok(p.anchor.length>=7&&p.entries.every(e=>e.word.length<=p.anchor.length),'anchor is a longest answer');
 assert.ok(new Set(p.entries.map(e=>e.word.length)).size>=2,'varied word lengths');
 assert.equal(new Set(p.entries.map(e=>e.word)).size,p.entries.length);
 const uses=Array(p.grid.length).fill(0),cells=p.entries.map((_,i)=>entryCells(p,i));
 for(let n=0;n<p.entries.length;n++){
  const e=p.entries[n];assert.ok(e.word.length>=3&&e.clue&&e.theme);
  if(theme.clues[e.word])assert.equal(e.clue,theme.clues[e.word],'clue uses the meaning intended by this theme');
  assert.equal(cells[n].map(i=>p.grid[i]).join(''),e.word);
  cells[n].forEach(i=>uses[i]++);
 }
 assert.ok(uses.every(n=>n<=2));
 assert.ok(uses.filter(n=>n===2).length>=p.entries.length,'at least one cycle, beyond a chain of branches');
 const anchor=p.entries.findIndex(e=>e.word===p.anchor);
 assert.ok(cells[anchor].filter(i=>uses[i]===2).length>=3,'three ways into the anchor');
 const visited=new Set([0]);for(let round=0;round<p.entries.length;round++)for(let n=0;n<p.entries.length;n++)if([...visited].some(v=>cells[v].some(i=>cells[n].includes(i))))visited.add(n);
 assert.equal(visited.size,p.entries.length,'one connected board');
 // Every contiguous run of two or more squares must have exactly one clue.
 // This catches touching parallel answers and unnumbered accidental words.
 for(let start=0;start<p.grid.length;start++)for(const step of [1,p.size]){
  if(p.grid[start]==='#')continue;
  if(step===1?start%p.size>0&&p.grid[start-1]!=='#':start>=p.size&&p.grid[start-p.size]!=='#')continue;
  const run=[];for(let i=start;i<p.grid.length&&p.grid[i]!=='#'&&(step!==1||Math.floor(i/p.size)===Math.floor(start/p.size));i+=step)run.push(i);
  if(run.length>1)assert.equal(p.entries.filter(e=>e.start===start&&e.step===step&&e.word.length===run.length).length,1,'every run is clued');
 }
}
console.log(`THEMED CROSSWORDS: ${boards.length} boards, all vocabulary definitions/topics, connected grids, numbered runs, theme anchors and crossing quality pass`);
