import assert from 'node:assert/strict';
import {timedPuzzle,entryCells} from '../daily-puzzles.js';
import {practicePuzzle} from '../practice-catalog.js';
import {practiceStore} from '../practice-store.js';
import {advanceTimedGame,newTimedGame,timedPoints} from '../timed-game.js';
function check(p,target){
 assert.equal(p.entries.length,target);const seen=new Set([0]);
 const cells=p.entries.map((_,i)=>new Set(entryCells(p,i)));
 let changed=true;while(changed){changed=false;for(let i=0;i<target;i++)if(!seen.has(i)&&[...seen].some(j=>[...cells[i]].some(c=>cells[j].has(c)))){seen.add(i);changed=true;}}
 assert.equal(seen.size,target,'all answers are in one connected component');
 const crossings=p.entries.reduce((n,e)=>n+e.word.length,0)-p.grid.replaceAll('#','').length;
 assert.ok(crossings>=target-1,'shared letters connect every answer');
}
for(const day of ['2026-10-12','2026-10-18','2026-11-02','2026-11-08','2026-12-01','2026-12-06']){
 const p=timedPuzzle(day,'crossword');check(p,p.hard?20:10);
 assert.equal(p.durationMs,p.hard?300000:180000);
 let g=newTimedGame(p,'him',p.opensAt+1000);
 for(let i=0;i<p.entries.length;i++)g=advanceTimedGame(g,p,{index:i,expectedCount:i,now:g.startedAt+(i+1)*(p.durationMs-1000)/p.entries.length});
 assert.ok(g.complete);assert.equal(timedPoints(g),p.hard?100:50);
}
for(let i=0;i<100;i++)check(practicePuzzle('crossword',i),i>=50?20:10);
assert.equal(timedPuzzle('2026-10-11','crossword').durationMs,180000,'today is not reset');
assert.equal(timedPuzzle('2026-10-11','crossword').entries.length,8);
const oldKey='our-little-app-practice-v3:test:crossword:50',wordKey='our-little-app-practice-v3:test:word:0';
const docs=new Map([[oldKey,JSON.stringify({solved:[0,1],completed:true})],[wordKey,JSON.stringify({guesses:['apple']})]]);
const store=practiceStore('test',{getItem:k=>docs.get(k),setItem:(k,v)=>docs.set(k,v)});
assert.deepEqual(store.load('crossword',50).solved,[]);
assert.deepEqual(store.load('word',0).guesses,['apple']);
store.save('crossword',50,{solved:[0,10,19],selected:19});
assert.deepEqual(store.load('crossword',50).solved,[0,10,19]);assert.equal(store.load('crossword',50).selected,19);
assert.equal(JSON.parse(docs.get(oldKey)).completed,true,'legacy practice stays untouched');
console.log('CONNECTED CROSSWORDS: exact sizes, connected answers, full scoring, future-only cutover and separate practice saves pass');
