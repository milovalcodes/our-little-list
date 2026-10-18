// Build-time work, not request-time work. Rebuild only generated puzzle data;
// never contact a backend or read credentials.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {timedPuzzle,random} from '../daily-puzzles.js';
import {connectedCrossword} from '../connected-crossword.js';
import {PUZZLE_THEMES,catalogPool} from '../puzzle-catalog.js';
import {DIFFICULTY_VERSION} from '../puzzle-edition.js';
import {weeklyRounds,ROUND_ENGINE_START} from '../round-engine.js';
import {themedCrossword} from '../themed-crossword.js';
export const compiledSources=['daily-puzzles.js','connected-crossword.js','mini-crossword.js','themed-crossword.js','crossword-themes.js','word-book.js','word-topics.js','word-definitions.js','puzzle-catalog.js','puzzle-edition.js','puzzle-edition-bank.js','puzzle-edition-seasonal.js','seasonal-puzzles.js','round-engine.js','round-library.js','practice-edition-bank.js','daily-words.js'];
export const fingerprint=()=>createHash('sha256').update(compiledSources.map(name=>readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/\r\n/g,'\n')).join('\n')).digest('hex');
export function compile(){
 const days={},ties={},rounds={},start='2026-10-12',end='2028-10-15';
 const legacyFingerprint=createHash('sha256').update(['daily-puzzles.js','connected-crossword.js','puzzle-catalog.js','puzzle-edition.js','seasonal-puzzles.js'].map(name=>readFileSync(new URL('../'+name,import.meta.url),'utf8').replace(/\r\n/g,'\n')).join('\n')).digest('hex');
 let previous;try{previous=JSON.parse(readFileSync(new URL('../worker/src/compiled-crosswords.json',import.meta.url),'utf8'));}catch(_){}
 const reuse=previous&&(previous.legacyFingerprint||previous.fingerprint)===legacyFingerprint;
 for(let at=Date.parse(start+'T12:00Z');at<=Date.parse(end+'T12:00Z');at+=86400000){
  const day=new Date(at).toISOString().slice(0,10),p=reuse&&previous.days[day]||timedPuzzle(day,'crossword',at);
  days[day]={size:p.size,grid:p.grid,entries:p.entries};
  rounds[day]=weeklyRounds(day)[day];
 }
 for(const theme of PUZZLE_THEMES.filter(t=>t.difficulty==='hard'&&t.edition===DIFFICULTY_VERSION)){
  const bank=catalogPool('hard',theme.id).map(({word,clue,id})=>({word,clue,id}));
  ties[theme.id]=reuse&&previous.ties[theme.id]||Array.from({length:64},(_,i)=>connectedCrossword(bank,21,random('compiled-tie:'+theme.id+':'+i),20));
 }
 const themedTies=Object.fromEntries(['','october','december'].map(season=>[season||'regular',Array.from({length:32},(_,i)=>themedCrossword({hard:true,season,rng:random('themed-tie-v8:'+season+':'+i)}))]));
 return {fingerprint:fingerprint(),legacyFingerprint,start,end,engineStart:ROUND_ENGINE_START,days,ties,themedTies,rounds};
}
if(process.argv[1]&&new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll('\\','/').split('/').at(-1))){
 const result=compile();
 if(process.argv.includes('--write')){
  // Generated data, mechanically rebuilt from the reviewed source banks.
  writeFileSync(new URL('../worker/src/compiled-crosswords.json',import.meta.url),JSON.stringify(result));
  console.log('Compiled '+Object.keys(result.days).length+' daily crosswords and '+Object.values(result.ties).reduce((n,p)=>n+p.length,0)+' hard tie templates.');
 }else process.stdout.write(JSON.stringify(result));
}
