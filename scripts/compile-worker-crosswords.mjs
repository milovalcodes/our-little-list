// Build-time work, not request-time work. Rebuild only generated puzzle data;
// never contact a backend or read credentials.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {timedPuzzle,random} from '../daily-puzzles.js';
import {connectedCrossword} from '../connected-crossword.js';
import {PUZZLE_THEMES,catalogPool} from '../puzzle-catalog.js';
import {DIFFICULTY_VERSION} from '../puzzle-edition.js';
export const compiledSources=['daily-puzzles.js','connected-crossword.js','puzzle-catalog.js','puzzle-edition.js','seasonal-puzzles.js'];
export const fingerprint=()=>createHash('sha256').update(compiledSources.map(name=>readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/\r\n/g,'\n')).join('\n')).digest('hex');
export function compile(){
 const days={},ties={},start='2026-10-12',end='2028-10-12';
 for(let at=Date.parse(start+'T12:00Z');at<=Date.parse(end+'T12:00Z');at+=86400000){
  const day=new Date(at).toISOString().slice(0,10),p=timedPuzzle(day,'crossword',at);
  days[day]={size:p.size,grid:p.grid,entries:p.entries};
 }
 for(const theme of PUZZLE_THEMES.filter(t=>t.difficulty==='hard'&&t.edition===DIFFICULTY_VERSION)){
  const bank=catalogPool('hard',theme.id).map(({word,clue,id})=>({word,clue,id}));
  ties[theme.id]=Array.from({length:64},(_,i)=>connectedCrossword(bank,21,random('compiled-tie:'+theme.id+':'+i),20));
 }
 return {fingerprint:fingerprint(),start,end,days,ties};
}
if(process.argv[1]&&new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\','/').split('/').at(-1))){
 const result=compile();
 if(process.argv.includes('--write')){
  // Generated data, mechanically rebuilt from the reviewed source banks.
  writeFileSync(new URL('../worker/src/compiled-crosswords.json',import.meta.url),JSON.stringify(result));
  console.log('Compiled '+Object.keys(result.days).length+' daily crosswords and '+Object.values(result.ties).reduce((n,p)=>n+p.length,0)+' hard tie templates.');
 }else process.stdout.write(JSON.stringify(result));
}
