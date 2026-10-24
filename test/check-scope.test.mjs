import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkScope} from '../scripts/check-scope.mjs';
const workflow=readFileSync(new URL('../.github/workflows/checks.yml',import.meta.url),'utf8');
assert.doesNotMatch(workflow,/daily-games:|little-star:|test:star|test:browser:star|test:daily|test:browser:daily|star-kitchen|kitchen-live|kitchen-skill|scope.outputs.star|scope.outputs.daily_only/);
const empty={syntax:false,unit:[],browser:[],pages:[]};
for(const file of ['daily-word.js','test/word-hints.test.mjs','test/word-rules.test.mjs','little-star.html','little-star/engine.mjs','worker/src/star-api.js','test/little-star.test.mjs','test/star-polish-browser.mjs','test/kitchen-live-browser.mjs','tools/build-star-kitchen.mjs']){
 const scope=checkScope([file]);assert.equal(scope.full,false,file);assert.deepEqual(scope.plan,empty,`paused checks stay stopped for ${file}`);
}
const automation=['.github/workflows/checks.yml','scripts/check-scope.mjs','scripts/focused-checks.mjs','test/check-scope.test.mjs','README.md','CLAUDE.md'];
assert.deepEqual(checkScope(automation).plan,empty);
for(const files of [[],['new-unknown.js'],['package.json'],['pnpm-lock.yaml'],['data-hub.js'],['household.js'],['firestore.rules'],['worker/src/index.js']])assert.equal(checkScope(files).full,true,files.join(','));
const questions=checkScope(['daily-question.js','question-prompts.js','win-history.js','activities.js']);
assert.equal(questions.full,false);assert.ok(questions.plan.unit.includes('retirement'));assert.ok(questions.plan.browser.includes('retirement'));
const small=checkScope(['notification-policy.js','guide.html','service-worker.js'],{versionOnly:true});
assert.equal(small.full,false);assert.ok(small.plan.unit.includes('delivery-worker'));assert.ok(small.plan.pages.includes('guide'));
assert.ok(!small.plan.browser.includes('update-freshness'));assert.ok(checkScope(['service-worker.js']).plan.browser.includes('update-freshness'));
const mixed=checkScope(['little-star/engine.mjs','daily-word.js','notes.js']);assert.equal(mixed.full,false);assert.deepEqual(mixed.plan.browser,['delete-recovery']);
assert.equal(checkScope(['little-star/engine.mjs','household.js']).full,true);
const tasks=checkScope(['tasks.js']);assert.ok(tasks.plan.unit.includes('routines'));
for(const files of [automation,['tasks.js'],['notes.js'],['memories.js'],['service-worker.js'],['daily-question.js'],['styles.css']]){
 const plan=checkScope(files).plan;
 for(const name of plan.unit)assert.ok(existsSync(new URL(`./${name}.test.mjs`,import.meta.url)),name);
 for(const name of plan.browser)assert.ok(existsSync(new URL(`./${name}-browser.mjs`,import.meta.url)),name);
}
const preview=workflow.indexOf('- name: Start the isolated preview before browser checks');assert.ok(preview>=0&&preview<workflow.indexOf('- name: Browser flows fit a phone and stay script-error free'));
for(const output of ['focused','plan','full'])assert.match(workflow,new RegExp(`steps.scope.outputs.${output}`));
assert.match(workflow,/node test\/check-scope.test.mjs && node scripts\/check-scope.mjs/);
const scripts=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).scripts;
for(const name of ['test:star','test:browser:star','test:daily','test:browser:daily'])assert.equal(scripts[name],undefined);
assert.equal(scripts['test:all'],'pnpm test');
assert.ok(scripts['test:activities']);
console.log('CHECK SCOPE: paused game suites cannot run; active questions, app, notifications and workflow-only checks retain coverage');

// Exercise the runner with disposable probes, not unrelated application tests.
const temp=mkdtempSync(join(tmpdir(),'little-list-scope-'));
try{
 mkdirSync(join(temp,'test'));
 writeFileSync(join(temp,'test/probe.test.mjs'),"console.log('selected probe');process.exit(Number(process.env.PROBE_EXIT||0));");
 const runner=fileURLToPath(new URL('../scripts/run-focused-checks.mjs',import.meta.url));
 const run=(plan,extra={})=>spawnSync(process.execPath,[runner,'unit'],{cwd:temp,encoding:'utf8',env:{...process.env,CHECK_PLAN:JSON.stringify(plan),...extra}});
 const plan={syntax:false,unit:['probe'],browser:[],pages:[]};
 assert.equal(run(plan).status,0);
 assert.match(run(plan).stdout,/selected probe/);
 assert.equal(run(plan,{PROBE_EXIT:'7'}).status,7,'selected test failures must fail CI');
 assert.equal(run({...plan,unit:[]}).stdout,'','automation-only plan runs no application tests');
 assert.notEqual(run({...plan,unit:['../outside']}).status,0,'plans cannot escape the test directory');
}finally{rmSync(temp,{recursive:true,force:true});}
console.log('FOCUSED RUNNER: selected tests run, failures propagate, empty plans do no work and invalid paths are rejected');

for(const match of workflow.matchAll(/node (test\/[\w.-]+\.mjs)/g))assert.ok(existsSync(new URL('../'+match[1],import.meta.url)),`workflow references missing ${match[1]}`);
