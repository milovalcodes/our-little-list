// Optional disk-backed preview for sandboxes that block loopback sockets.
// It serves only this checkout, at the same origin used by the browser tests.
// Firebase is always stubbed and external requests are always blocked.
import {chromium,webkit,firefox} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(process.env.STAR_SOURCE||fileURLToPath(new URL('..',import.meta.url)));
const origin=process.env.STAR_SOURCE?'http://127.0.0.1:8891':'http://127.0.0.1:8777';
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
for(const type of [chromium,webkit,firefox]){
 const launch=type.launch.bind(type);
 type.launch=async options=>{
  const browser=await launch(options),newContext=browser.newContext.bind(browser);
  browser.newContext=async options=>{
   const context=await newContext(options);
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
    if(url.pathname==='/firebase-config.js')return route.fulfill({contentType:'text/javascript',body:'export const firebaseConfig={};'});
    const file=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+sep))return route.abort();
    try{await route.fulfill({body:await readFile(file),contentType:mime[extname(file)]||'application/octet-stream'});}catch(_){await route.fulfill({status:404,body:'Not found'});}
   });
   return context;
  };
  // Companion Little Star tests use the browser's one-page convenience API.
  if(process.env.STAR_SOURCE)browser.newPage=async options=>(await browser.newContext(options)).newPage();
  return browser;
 };
}
