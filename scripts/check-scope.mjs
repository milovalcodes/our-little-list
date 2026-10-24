import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {focusedPlan} from './focused-checks.mjs';

// Paused feature source/tests are preserved for restoration, with no CI jobs.
const paused=/^(?:little-star(?:\/|-|\.)|worker\/src\/star-|test\/(?:star-|little-star|kitchen-|fixtures\/)|tools\/(?:build-little-star|build-star-kitchen|star-preview))/;
const retired=/^(?:(?:daily-(?:word|words|puzzles|results|habit)|word-|round-|puzzle-|practice(?:[.-])|seasonal-puzzles|timed-|connected-crossword|mini-crossword|themed-crossword|crossword-|game-(?:typing|progress|reset|sync)|shared-round|weekly-|league-scores|couple-game|arcade-game)|test\/(?:daily-(?!question)|word-|round-|puzzle-|practice|seasonal-puzzles|timed-|shared-round|connected-crossword|mini-crossword|themed-crossword|crossword-|hard-rounds|game-|weekly-|search-touch|iphone-crossword|clock-budget|worker-puzzles|arcade-|couple-game)|worker\/src\/(?:compiled-crosswords|word-|activity-week|puzzles|streak-reminders)|scripts\/(?:compile-.*(?:crossword|practice)|audit-daily-calendar|reset-.*rounds))/;
export function checkScope(files,options={}){
 const active=files.filter(file=>!paused.test(file)&&!retired.test(file));
 const plan=active.length?focusedPlan(active,options):files.length?{syntax:false,unit:[],browser:[],pages:[]}:null;
 return {focused:!!plan,plan,full:!plan};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let base=process.env.CHECK_BASE||'origin/main';
 if(/^0+$/.test(base))base='HEAD^';
 const sha=ref=>execFileSync('git',['rev-parse',ref],{encoding:'utf8'}).trim();
 if(sha(base)===sha('HEAD'))base='HEAD^';
 const files=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const versionOnly=files.includes('service-worker.js') && (()=>{
  const clean=text=>text.replace(/^const CACHE = 'our-little-list-v\d+';\r?\n/m,'').replace(/\r\n/g,'\n');
  return clean(execFileSync('git',['show',`${base}:service-worker.js`],{encoding:'utf8'}))===clean(execFileSync('git',['show','HEAD:service-worker.js'],{encoding:'utf8'}));
 })();
 const scope=checkScope(files,{versionOnly});
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`full=${scope.full}\nfocused=${scope.focused}\nplan=${JSON.stringify(scope.plan)}\n`);
 console.log(JSON.stringify(scope));

}
