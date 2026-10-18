import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const html=readFileSync('little-star.html','utf8');
assert.ok(Buffer.byteLength(html)<1000000,'published game HTML stays under 1 MB');
assert.doesNotMatch(html,/data:image\/webp;base64/);
const paths=[...new Set([...html.matchAll(/little-star\/art\/([a-f0-9]{20})\.webp/g)].map(m=>m[0]))];
assert.ok(paths.length>50,'all wardrobe and care atlases remain available');
for(const path of paths){const bytes=readFileSync(path);assert.ok(path.includes(createHash('sha256').update(bytes).digest('hex').slice(0,20)));assert.equal(bytes.toString('ascii',8,12),'WEBP');}
const handlers={},entries=new Map();let downloads=0,response,activate;
const root='https://example.test/app/',self={location:{href:root+'service-worker.js',origin:'https://example.test'},registration:{scope:root},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}};
const caches={keys:async()=>['our-little-list-v125','our-little-list-star-art'],delete:async key=>{assert.notEqual(key,'our-little-list-star-art');},open:async()=>({keys:async()=>[],match:async request=>entries.get(request.url),put:async(request,value)=>entries.set(request.url,value)}),match:async()=>null};
const source=readFileSync('service-worker.js','utf8');
vm.runInNewContext(source,{self,caches,URL,Request,Response,console,importScripts(){},fetch:async()=>{downloads++;return {ok:true,type:'basic',clone:()=>({art:true})};}});
const fetchArt=async()=>{handlers.fetch({request:{method:'GET',url:root+paths[0],mode:'cors'},respondWith:value=>response=value,waitUntil(){}});return response;};
await fetchArt();assert.equal(downloads,1);assert.ok((await fetchArt()).art);assert.equal(downloads,1,'cache hit makes no network request');
handlers.activate({waitUntil:p=>activate=p});await activate;
assert.equal(downloads,1);console.log(`STAR ART: ${paths.length} immutable atlases, ${Buffer.byteLength(html)} byte HTML, no refetch on cache hit, retained across upgrades`);
