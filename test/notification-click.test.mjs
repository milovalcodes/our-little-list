import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {MessageChannel} from 'node:worker_threads';
const scope='https://example.test/app/';
async function click(value, windows=[]){
  const handlers={},opened=[];
  const self={location:{href:scope+'service-worker.js',origin:'https://example.test'},registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,clients:{matchAll:async()=>windows,openWindow:async url=>opened.push(url)}};
  const sandbox={self,URL,MessageChannel,console,clearTimeout,setTimeout:(fn,ms)=>setTimeout(fn,Math.min(ms,120))};
  vm.createContext(sandbox);
  sandbox.importScripts=()=>vm.runInContext(readFileSync(new URL('../old-links.js',import.meta.url),'utf8'),sandbox);
  vm.runInContext(readFileSync(new URL('../service-worker.js',import.meta.url),'utf8'),sandbox);
  let done,closed=false;
  handlers.notificationclick({notification:{data:{url:value},close:()=>{closed=true;}},waitUntil:p=>{done=p;}});
  await done;assert.ok(closed);return opened;
}
assert.deepEqual(await click('notes.html#note-abc'),[scope+'notes.html#note-abc']);
let focused=0,message;
const existing={url:scope+'notes.html#note-abc',focus:async()=>{focused++;},postMessage:(value,ports)=>{message=value;ports[0].postMessage({handled:true});ports[0].close();}};
assert.deepEqual(await click('notes.html#note-abc',[existing]),[]);
assert.equal(message.url,existing.url);assert.equal(focused,1);
assert.deepEqual(await click('notes.html#note-other',[existing]),[]);
assert.equal(message.url,scope+'notes.html#note-other');
let navigated='';
const old={url:scope+'notes.html',focus:async()=>{},postMessage:()=>{},navigate:async url=>{navigated=url;return{focus:async()=>{}};}};
assert.deepEqual(await click('notes.html#note-abc',[old]),[]);
assert.equal(navigated,scope+'notes.html#note-abc');
const broken={url:scope+'tasks.html',navigate:async()=>null,focus:async()=>{}};
assert.deepEqual(await click('notes.html#note-abc',[broken]),[scope+'notes.html#note-abc']);
const otherSite={url:'https://example.test/other-project/',navigate:async()=>{throw Error('must never hijack another app');}};
assert.deepEqual(await click('notes.html',[otherSite]),[scope+'notes.html']);
assert.deepEqual(await click('https://evil.test/'),[scope+'index.html']);
assert.deepEqual(await click('../other-project/'),[scope+'index.html']);
assert.deepEqual(await click('help.html#ask-old'),[scope+'tasks.html#ask-old']);
for(const hash of ['#game','#game-round-old','#game-connect-four--round-old','#game-dots-boxes']){
  assert.deepEqual(await click('today.html'+hash),[scope+'activities.html#daily']);
}
assert.deepEqual(await click('activities.html#game-connect-four'),[scope+'activities.html#daily']);
assert.deepEqual(await click('games.html#game'),[scope+'activities.html#daily']);
console.log('NOTIFICATION CLICKS: exact items, same-page repeats, old clients, failed navigation and scope checked');
