import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const scope='https://example.test/app/',source=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
async function check(mode){
 const handlers={},waits=[];let response,finishWrite,writeStarted=false,keptAlive=false;
 const fresh={ok:true,status:200,type:'basic',clone:()=>({fresh:true})},cached={cached:true};
 const self={location:{href:scope+'service-worker.js',origin:'https://example.test'},registration:{scope},oldPageTarget:()=>null,addEventListener:(n,f)=>handlers[n]=f};
 const sandbox={self,URL,Request,Response,setTimeout,console,importScripts(){},fetch:async()=>fresh,caches:{match:async()=>cached,open:async()=>({put:()=>{writeStarted=true;return new Promise(r=>finishWrite=r);}})}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 handlers.fetch({request:{method:'GET',url:scope+(mode==='navigate'?'status.html':'diary.css'),mode},respondWith:p=>response=p,waitUntil:p=>waits.push(p)});
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.ok(writeStarted);assert.ok(waits.length);
 if(mode!=='navigate')assert.equal(await response,cached,'cached assets remain instant');
 Promise.all(waits).then(()=>keptAlive=true);await Promise.resolve();assert.equal(keptAlive,false,'cache writes must extend the worker lifetime');
 finishWrite();await Promise.all(waits);assert.equal(await response,mode==='navigate'?fresh:cached);
}
await check('navigate');await check('cors');
const handlers={},removed=[];let activated;
const self={addEventListener:(n,f)=>handlers[n]=f,clients:{claim:async()=>{}}};
const sandbox={self,console,importScripts(){},caches:{keys:async()=>['our-little-list-v1','our-little-list-libraries','another-app-v1'],delete:async k=>removed.push(k),open:async()=>({keys:async()=>[]})}};
vm.createContext(sandbox);vm.runInContext(source,sandbox);handlers.activate({waitUntil:p=>activated=p});await activated;
assert.deepEqual(removed,['our-little-list-v1']);
console.log('CACHE LIFETIME: navigation and asset writes finish before shutdown; other apps and SDK caches survive activation');
