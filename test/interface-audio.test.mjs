import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
let clock=1000,fetches=0,contexts=0,started=0,stopped=0,gains=[];
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
globalThis.document={hidden:false,addEventListener(){}};
globalThis.window={addEventListener(){},AudioContext:class{
 state='running';destination={};constructor(){contexts++;}
 resume(){return Promise.resolve();}decodeAudioData(){return Promise.resolve({duration:.15});}
 createBufferSource(){return{connect(){},disconnect(){},start(){started++;},stop(){stopped++;this.onended?.();}};}
 createGain(){const gain={gain:{value:0},connect(){},disconnect(){}};gains.push(gain);return gain;}
}};
globalThis.fetch=async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(10)};};
const {playInterfaceSound:play,primeInterfaceAudio:prime,stopInterfaceAudio:stop,SOUND_FILES}=await import('../interface-audio.js');
let settings={sound:false,volume:.35,typing:false};const read=()=>settings;
assert.equal(await play('tap',read),false);assert.equal(contexts,0);assert.equal(fetches,0);
settings.sound=true;await prime();assert.equal(fetches,12);assert.equal(contexts,1);
assert.equal(await play('tap',read),true);assert.equal(await play('tap',read),false);
assert.equal(await play('solve',read),true,'meaningful completion can replace a simultaneous tap');
clock+=300;assert.equal(await play('tap',read),false,'a tap cannot interrupt a finish');
stop();clock+=2000;assert.equal(await play('key',read),false,'typing is quiet unless explicitly enabled');
settings.typing=true;assert.equal(await play('key',read),true);assert.ok(gains.at(-1).gain.value<.05);
clock+=200;assert.equal(await play('key',read),true);assert.equal(fetches,12,'decoded clips reused');
settings.volume=0;clock+=200;assert.equal(await play('save',read),false);
settings.volume=.25;document.hidden=true;assert.equal(await play('save',read),false);document.hidden=false;
stop();clock+=2000;const before=started,pending=play('save',read);settings.sound=false;stop();await pending;assert.equal(started,before,'muting cancels a pending clip');
assert.ok(stopped>0);
const manifest=JSON.parse(readFileSync('audio/interface/manifest.json','utf8'));
assert.equal(manifest.length,SOUND_FILES.length);assert.ok(manifest.reduce((n,e)=>n+e.bytes,0)<220000);
for(const e of manifest){assert.ok(e.seconds<=1);assert.equal(createHash('sha256').update(readFileSync('audio/interface/'+e.file)).digest('hex'),e.sha256);}
assert.match(readFileSync('audio/interface/LICENSE.txt','utf8'),/Nathan Gibson/);
console.log('INTERFACE AUDIO: muted defaults, user volume, optional typing, priority, rate limits, cancellation, caching and licensed sample integrity pass');
