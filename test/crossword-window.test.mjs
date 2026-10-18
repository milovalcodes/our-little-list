// Crosswords are saved on a square canvas; only the playable window is drawn.
import assert from 'node:assert/strict';
import {crosswordWindow} from '../crossword-view.js';
import compiled from '../worker/src/compiled-crosswords.json' with {type:'json'};
const grid=['#####','#AB##','#C###','#####','#####'].join('');
assert.deepEqual(crosswordWindow({size:5,grid}),{cells:[6,7,11,12],columns:2},'trims all-wall edges, keeps saved indices');
assert.deepEqual(crosswordWindow({size:4,grid:'####'+'#AB#'+'####'+'####'}),{cells:[5,6,9,10],columns:2},'a wide window grows downward into a square');
assert.deepEqual(crosswordWindow({size:3,grid:'###'+'###'+'ABC'}),{cells:[0,1,2,3,4,5,6,7,8],columns:3},'a window at the bottom edge grows upward');
assert.deepEqual(crosswordWindow({size:2,grid:'AB#C'}),{cells:[0,1,2,3],columns:2},'a full board is unchanged');
assert.deepEqual(crosswordWindow({size:2,grid:'####'}),{cells:[0,1,2,3],columns:2},'an empty board keeps its canvas');
let trimmed=0;
for(const [day,rounds] of Object.entries(compiled.rounds)){
 const p=rounds.crossword;if(!p||day<'2026-10-19')continue;
 const {cells,columns}=crosswordWindow(p),white=[...p.grid].flatMap((c,i)=>c==='#'?[]:[i]);
 assert.equal(cells.length,columns*columns,day+' window is square for the zoomable board view');
 for(const i of white)assert.ok(cells.includes(i),day+' keeps every square');
 if(columns<p.size)trimmed++;
}
assert.ok(trimmed>0,'themed boards gain width');
console.log('CROSSWORD WINDOW: edge walls trimmed, every square kept, saved indices unchanged');
