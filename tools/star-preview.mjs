// Local-only disposable QA server. Never deployed as a service. It runs the
// real live adapter + durable nursery code, with fake accounts and isolated RAM.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {StarNursery,freshRecord} from '../worker/src/star-store.js';
import {scenario} from '../little-star/engine.mjs';
import {kitchenLayout} from './kitchen-layout.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),stores=new Map();
const wallNow=Date.now,opened=wallNow(),base=Date.parse('2026-10-15T17:00:00Z');Date.now=()=>base+wallNow()-opened;
function fixture(scene){
 if(stores.has(scene))return stores.get(scene);
 const values=new Map(),record=freshRecord(Date.now());if(['ready','legacy'].includes(scene)){record.state=scenario('ready',Date.now());record.state.wallets={him:500,her:500};}
 if(scene==='legacy')delete record.state.larder;
 values.set('nursery',record);let queue=Promise.resolve();
 const object=new StarNursery({storage:{transaction(fn){const result=queue.then(async()=>{const copy=new Map(structuredClone([...values]));const value=await fn({get:async k=>structuredClone(copy.get(k)),put:async(k,v)=>{copy.set(k,structuredClone(v));}});values.clear();for(const [k,v] of copy)values.set(k,v);return value;});queue=result.catch(()=>{});return result;}}},{});
 stores.set(scene,object);return object;
}
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:8892');
  if(url.pathname==='/__kitchen'){res.setHeader('Content-Type','text/html');res.end(await kitchenLayout(url));return;}
  if(url.pathname==='/page-boot.js'){res.setHeader('Content-Type','text/javascript');res.end(`export async function bootPage(){const p=new URLSearchParams(location.search),viewer=p.get('as')==='her'?'her':'him',scene=['ready','legacy'].includes(p.get('scene'))?p.get('scene'):'egg';return {viewer,data:{mode:'firebase',getIdToken:async()=>['qa',scene,viewer].join('.')}};}`);return;}
  if(url.pathname==='/push-config.js'){res.setHeader('Content-Type','text/javascript');res.end(`export const DELIVERY_URL=location.origin+'/dispatch';`);return;}
  if(url.pathname==='/service-worker.js'){res.writeHead(404);res.end();return;}
  if(url.pathname==='/star'){
   const match=/^Bearer qa\.(egg|ready|legacy)\.(him|her)$/.exec(req.headers.authorization||'');if(!match){res.writeHead(401);res.end('{}');return;}
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)throw Error('too large');}
   const body=JSON.parse(raw);if(!['read','act'].includes(body.op))throw Error('bad op');
   const response=await fixture(match[1]).fetch(new Request('https://internal/',{method:'POST',body:JSON.stringify({op:body.op,actor:match[2],command:body.command})}));res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await response.text());return;
  }
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root))throw Error('not found');
  const bytes=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(8892,'127.0.0.1',()=>console.log('Disposable Little Star QA at http://127.0.0.1:8892/little-star.html?scene=ready'));
