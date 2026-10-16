// Local-only UI QA: normal pages and data layer, but no production connection.
// Bind to loopback; serve only public assets, never dotfiles or server sources.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.wav':'audio/wav'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:8879');
  if(!['GET','HEAD'].includes(req.method))throw Error('Read only');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/firebase-config.js'){res.setHeader('Content-Type','text/javascript');res.end('export const firebaseConfig={};');return;}
  // Do not leave a QA service worker controlling another development session.
  if(url.pathname==='/service-worker.js')throw Error('No QA worker');
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/him.html':url.pathname));
  const parts=relative(root,path).split(/[\\/]/);
  if(parts.some(p=>p.startsWith('.'))||['worker','node_modules','test','tools','scripts'].includes(parts[0])||!types[extname(path)])throw Error('Not public');
  const bytes=await readFile(path);res.setHeader('Content-Type',types[extname(path)]);res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(8879,'127.0.0.1',()=>console.log('Isolated app QA: http://127.0.0.1:8879/him.html?as=him'));
