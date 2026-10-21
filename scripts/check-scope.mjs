import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const daily = /^(?:(?:daily-(?:word|words|puzzles|results|question|habit)|word-(?!lexicon)|word-lexicon|round-|puzzle-|practice|seasonal-puzzles|timed-|connected-crossword|mini-crossword|themed-crossword|crossword-|activity-clock|game-(?:typing|comfort|progress|reset|sync)|shared-round|weekly-|league-scores|couple-game|activities|games|question-prompts|interface-audio)[^/]*\.(?:js|css|html)|audio\/interface\/|scripts\/compile-worker-crosswords\.mjs|test\/(?:daily-|word-|round-|puzzle-|practice|seasonal-puzzles|timed-|shared-round|connected-crossword|mini-crossword|themed-crossword|crossword-|hard-rounds|game-(?:accessibility|sync|reset)|weekly-|search-touch|iphone-crossword|activities|games-navigation|profile-game|interface-audio|clock-budget|worker-puzzles)|worker\/src\/(?:compiled-crosswords\.json|(?:word-|round-|daily-|timed-|puzzle-)[^/]*\.js))/;
const release = /^(?:guide\.html|README\.md|CLAUDE\.md|service-worker\.js|package\.json|pnpm-lock\.yaml|\.github\/workflows\/checks\.yml|scripts\/check-scope\.mjs|test\/check-scope\.test\.mjs)$/;
const star = /^(?:little-star(?:\/|-|\.)|worker\/src\/star-|test\/(?:star-|little-star|kitchen-|fixtures\/)|tools\/(?:build-little-star|build-star-kitchen|star-preview)|(?:household|firebase-config|firebase-data|data-hub)\.js|firestore\.rules|worker\/src\/(?:index|firestore)\.js)/;

export function checkScope(files){
 return {
  dailyOnly:files.some(f=>daily.test(f))&&files.every(f=>daily.test(f)||release.test(f)),
  star:files.some(f=>star.test(f)),
 };
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 let base=process.env.CHECK_BASE||'origin/main';
 if(/^0+$/.test(base))base='HEAD^';
 const sha=ref=>execFileSync('git',['rev-parse',ref],{encoding:'utf8'}).trim();
 if(sha(base)===sha('HEAD'))base='HEAD^';
 const files=execFileSync('git',['diff','--name-only',base,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const scope=checkScope(files);
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`daily_only=${scope.dailyOnly}\nstar=${scope.star}\n`);
 console.log(scope.dailyOnly?'Daily games checks only':scope.star?'App checks plus Little Star checks':'App checks; Little Star checks skipped');
}
