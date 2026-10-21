import {execFileSync} from 'node:child_process';
import {appendFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {focusedPlan} from './focused-checks.mjs';

const daily = /^(?:(?:daily-(?:word|words|puzzles|results|question|habit)|word-(?!lexicon)|word-lexicon|round-|puzzle-|practice|seasonal-puzzles|timed-|connected-crossword|mini-crossword|themed-crossword|crossword-|activity-clock|game-(?:typing|comfort|progress|reset|sync)|shared-round|weekly-|league-scores|couple-game|activities|games|question-prompts|interface-audio)[^/]*\.(?:js|css|html)|audio\/interface\/|scripts\/(?:compile-worker-crosswords|audit-daily-calendar)\.mjs|test\/(?:daily-|word-|round-|puzzle-|practice|seasonal-puzzles|timed-|shared-round|connected-crossword|mini-crossword|themed-crossword|crossword-|hard-rounds|game-(?:accessibility|sync|reset)|weekly-|search-touch|iphone-crossword|activities|games-navigation|profile-game|interface-audio|clock-budget|worker-puzzles)|worker\/src\/(?:compiled-crosswords\.json|(?:word-|round-|daily-|timed-|puzzle-)[^/]*\.js))/;
const star = /^(?:little-star(?:\/|-|\.)|worker\/src\/star-|test\/(?:star-|little-star|kitchen-|fixtures\/)|tools\/(?:build-little-star|build-star-kitchen|star-preview)|(?:household|firebase-config|firebase-data|data-hub)\.js|firestore\.rules|worker\/src\/(?:index|firestore)\.js)/;

export function checkScope(files, options={}){
 const focusedFiles=[];
 let dailyNeeded=false,starNeeded=false,full=files.length===0;
 for(const file of files){
  if(focusedPlan([file],options)){focusedFiles.push(file);continue;}
  if(daily.test(file)){dailyNeeded=true;continue;}
  if(star.test(file)&&! /^(?:(?:household|firebase-config|firebase-data|data-hub)\.js|firestore\.rules|worker\/src\/(?:index|firestore)\.js)$/.test(file)){starNeeded=true;continue;}
  full=true;
 }
 let plan=full?null:focusedPlan(focusedFiles,options);
 if(plan&&dailyNeeded){
  const scripts=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts;
  const unit=new Set([...scripts['test:daily'].matchAll(/node test\/([\w-]+)\.test\.mjs/g)].map(m=>m[1]));
  unit.add('daily-calendar'); // imported by worker-puzzles.test.mjs
  const browser=new Set([...scripts['test:browser:daily'].matchAll(/node test\/([\w-]+)-browser\.mjs/g)].map(m=>m[1]));
  plan={...plan,unit:plan.unit.filter(t=>!unit.has(t)),browser:plan.browser.filter(t=>!browser.has(t))};
 }

 return {dailyOnly:!full&&dailyNeeded,focused:!!plan,plan,star:starNeeded||files.some(f=>star.test(f)),full};
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
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`daily_only=${scope.dailyOnly}\nstar=${scope.star}\nfull=${scope.full}\nfocused=${scope.focused}\nplan=${JSON.stringify(scope.plan)}\n`);
 console.log(JSON.stringify(scope));

}
