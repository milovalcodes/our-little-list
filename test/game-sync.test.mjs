import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {watchGames} from '../game-sync.js';

const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const game = ply => ({id:'connect-four',mode:'connect-four',round:'round',ply,board:{},turn:ply%2?'him':'her',closed:false});
function harness() {
  const win=new EventTarget(),doc=new EventTarget(),nav={onLine:true};
  doc.visibilityState='visible';
  const timers=new Map();let serial=0,reads=0,subscriptions=0,stops=0,listener;
  const values=[],states=[],pending=[];
  const env={window:win,document:doc,navigator:nav,setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
  const data={mode:'firebase',listenTo:(_,cb,options)=>{subscriptions++;listener={cb,...options};return()=>{stops++;};},readOnce:(_,options)=>{assert.equal(options.fromServer,true);reads++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
  const stop=watchGames(data,items=>values.push(items),state=>states.push(state),env);
  return {win,doc,nav,values,states,pending,stop,get reads(){return reads;},get subscriptions(){return subscriptions;},get stops(){return stops;},
    emit:(ply,fromCache=false)=>listener.cb([game(ply)],{fromCache}),empty:()=>listener.cb([],{fromCache:false}),fail:()=>listener.onError(new Error('failed')),
    async timer(ms){const entry=[...timers].find(([,t])=>t.ms===ms);assert.ok(entry,'timer '+ms);timers.delete(entry[0]);entry[1].fn();await flush();},
    count:()=>timers.size
  };
}
{
  const h=harness();h.emit(0,true);assert.equal(h.states.at(-1),'connecting');
  h.emit(0);assert.equal(h.states.at(-1),'connected');assert.equal(h.values.length,1,'metadata alone does not redraw');
  await h.timer(20000);assert.equal(h.reads,1);
  h.emit(2);h.pending.shift().resolve([game(1)]);await flush();
  assert.equal(h.values.at(-1)[0].ply,2,'late recovery never rewinds a live move');
  h.fail();assert.equal(h.states.at(-1),'reconnecting');await h.timer(1000);
  assert.equal(h.subscriptions,2);assert.equal(h.stops,1);
  h.emit(0,true);assert.equal(h.values.at(-1)[0].ply,2,'reattached stale cache cannot rewind');
  h.emit(3);h.pending.shift().resolve([game(2)]);await flush();
  assert.equal(h.values.at(-1)[0].ply,3);
  h.doc.visibilityState='hidden';h.doc.dispatchEvent(new Event('visibilitychange'));await h.timer(20000);
  assert.equal(h.reads,2,'no polling hidden phones');
  h.doc.visibilityState='visible';h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(h.reads,3);
  const beforeRecovery=h.subscriptions;
  h.pending.shift().resolve([game(4)]);await flush();assert.equal(h.values.at(-1)[0].ply,4,'return catches up');
  assert.equal(h.subscriptions,beforeRecovery+1,'missed stream update reattaches live delivery');
  h.nav.onLine=false;h.win.dispatchEvent(new Event('offline'));await h.timer(20000);
  assert.equal(h.reads,3);assert.equal(h.states.at(-1),'offline');
  h.nav.onLine=true;h.win.dispatchEvent(new Event('online'));assert.equal(h.reads,4);
  h.stop();h.pending.shift().resolve([game(5)]);await flush();
  assert.equal(h.values.at(-1)[0].ply,4,'disposed stream cannot repaint');
  assert.equal(h.count(),0);h.win.dispatchEvent(new Event('online'));assert.equal(h.reads,4);
}
{
  const h=harness();h.emit(1);await h.timer(20000);await h.timer(12000);
  assert.equal(h.states.at(-1),'reconnecting','stuck network read times out');
  await h.timer(1000);assert.equal(h.subscriptions,2);assert.equal(h.reads,2);
  h.pending[0].resolve([game(9)]);await flush();assert.equal(h.values.at(-1)[0].ply,1,'expired reads are ignored');
  h.pending[1].resolve([game(2)]);await flush();assert.equal(h.values.at(-1)[0].ply,2);h.stop();
}
// Exercise the production collection registry, not a second implementation.
{
  const h=harness();h.empty();
  await h.timer(20000);await h.timer(20000);assert.equal(h.reads,0,'idle boards check less often');
  await h.timer(20000);assert.equal(h.reads,1,'idle stream can still recover a missed invitation');
  h.pending.shift().resolve([game(0)]);await flush();
  assert.equal(h.values.at(-1)[0].ply,0);assert.equal(h.subscriptions,2);h.stop();
}
// Exercise the production collection registry, not a second implementation.
{
  const source=readFileSync(new URL('../firebase-data.js',import.meta.url),'utf8');
  const method=source.slice(source.indexOf('    listenTo(name,'),source.indexOf('    listenToQuery('));
  const live=new Map(),streams=[],received=[],failures=[];
  const listen=new Function('signedIn','liveCollections','onSnapshot','named','safelyCall','announceError',
    'return ({'+method+'}).listenTo')(()=>true,live,(_,options,next,error)=>{assert.equal(options.includeMetadataChanges,true);streams.push({next,error});return()=>{};},name=>name,(cb,...args)=>cb(...args),()=>assert.fail('handled errors must not show generic modal'));
  const stopOld=listen('games',items=>received.push(items),{onError:e=>failures.push(e)});
  streams[0].next({docs:[{id:'connect-four',data:()=>game(1)}],metadata:{fromCache:false}});
  streams[0].error(new Error('terminal'));assert.equal(live.size,0);assert.equal(failures.length,1);
  const stopNew=listen('games',()=>{}, {onError:()=>{}});
  assert.equal(streams.length,2);stopOld();assert.equal(live.size,1,'old cleanup cannot remove replacement stream');
  stopNew();assert.equal(live.size,0);assert.equal(received[0][0].ply,1);
}
console.log('GAME SYNC: live updates, terminal retry, visible-only recovery, timeouts, stale reads, stale cache and cleanup');
