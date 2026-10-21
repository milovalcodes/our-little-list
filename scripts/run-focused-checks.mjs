import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const plan=JSON.parse(process.env.CHECK_PLAN||'null');
if(!plan)throw Error('Missing focused check plan');
const phase=process.argv[2];
function run(file,env={}){
 // Plans contain test identifiers, never executable shell commands.
 if(!/^test\/[\w-]+(?:\.test)?\.mjs$/.test(file)||!existsSync(file))throw Error(`Invalid test: ${file}`);
 console.log(`Checking ${file}${env.CLARITY_PAGE?' ('+env.CLARITY_PAGE+')':''}`);
 const result=spawnSync(process.execPath,[file],{stdio:'inherit',env:{...process.env,...env}});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
if(phase==='unit'){
 if(plan.syntax)run('test/check-syntax.mjs');
 for(const test of plan.unit)run(`test/${test}.test.mjs`);
}else if(phase==='browser'){
 for(const test of plan.browser)run(`test/${test}-browser.mjs`);
 for(const page of plan.pages){
  if(!/^[\w-]+$/.test(page))throw Error('Invalid page');
  run('test/clarity-browser.mjs',{CLARITY_PAGE:page});
 }
}else throw Error('Choose unit or browser');
